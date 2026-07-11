import random
import string
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.b2c_order import B2COrder, B2COrderItem, B2COrderStatus
from app.models.inventory import InventoryMovement, MovementType
from app.models.notification import Notification
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem
from app.models.store import Store
from app.models.user import User
from app.schemas.b2c_order import B2COrderValidationResult
from app.services.cache import invalidate_pattern as invalidate_cache
from app.services.notifications import check_low_stock
from app.services.socketio_manager import emit_order_created, emit_order_status_changed


VALID_TRANSITIONS = {
    # lifecycle
    B2COrderStatus.PENDING: B2COrderStatus.CONFIRMED,
    B2COrderStatus.CONFIRMED: B2COrderStatus.COMPLETED,
}


def generate_b2c_order_number() -> str:
    return "B2C-" + "".join(random.choices(string.digits, k=8))


async def list_available_stores(db: AsyncSession):
    """Return all active stores for customer browsing."""
    result = await db.execute(
        select(Store).where(Store.is_active == True).order_by(Store.name)
    )
    stores = result.scalars().all()

    owner_ids = {s.owner_id for s in stores}
    if owner_ids:
        owner_result = await db.execute(
            select(User).where(User.id.in_(owner_ids))
        )
        owners = {u.id: u.name for u in owner_result.scalars().all()}
    else:
        owners = {}

    return [
        {
            "id": s.id,
            "name": s.name,
            "store_type": s.store_type,
            "city": s.city,
            "state": s.state,
            "address": s.address,
            "owner_name": owners.get(s.owner_id, "Unknown"),
            "owner_id": s.owner_id,
        }
        for s in stores
    ]


async def list_store_products(db: AsyncSession, store_id: int):
    """Return all active products for a specific store."""
    store_result = await db.execute(
        select(Store).where(Store.id == store_id, Store.is_active == True)
    )
    store = store_result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    result = await db.execute(
        select(Product)
        .where(
            Product.store_id == store_id,
            Product.is_active == True,
            Product.owner_id == store.owner_id,
        )
        .order_by(Product.name)
    )
    products = result.scalars().all()

    return [
        {
            "id": p.id,
            "product_uuid": str(p.product_uuid),
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "brand": p.brand,
            "description": p.description,
            "selling_price": p.selling_price,
            "stock_quantity": p.stock_quantity,
            "image_url": p.image_url,
            "store_id": p.store_id,
        }
        for p in products
    ]


async def validate_order_payload(
    db: AsyncSession,
    payload,
    current_user: User,
) -> B2COrderValidationResult:
    """Pre-order validation: re-check stock, prices, store consistency."""
    issues = []

    store_result = await db.execute(
        select(Store).where(Store.id == payload.store_id, Store.is_active == True)
    )
    store = store_result.scalar_one_or_none()
    if not store:
        return B2COrderValidationResult(valid=False, issues=["Store not found or inactive"], items=[])

    validated_items = []
    for item in payload.items:
        product_result = await db.execute(
            select(Product).where(
                Product.id == item.product_id,
                Product.store_id == payload.store_id,
                Product.is_active == True,
            )
        )
        product = product_result.scalar_one_or_none()

        if not product:
            issues.append(f"Product '{item.product_name}' not found in store")
            continue

        item_issues = []

        if product.stock_quantity < item.quantity:
            item_issues.append(
                f"Insufficient stock for '{product.name}': have {product.stock_quantity}, need {item.quantity}"
            )

        price_mismatch = False
        if abs(product.selling_price - item.unit_price) > 0.01:
            item_issues.append(
                f"Price changed for '{product.name}': was ₹{item.unit_price:.2f}, now ₹{product.selling_price:.2f}"
            )
            price_mismatch = True

        validated_items.append({
            "product_id": product.id,
            "product_name": product.name,
            "requested_quantity": item.quantity,
            "available_stock": product.stock_quantity,
            "current_price": product.selling_price,
            "submitted_price": item.unit_price,
            "price_mismatch": price_mismatch,
        })
        issues.extend(item_issues)

    return B2COrderValidationResult(
        valid=len(issues) == 0,
        issues=issues,
        items=validated_items,
    )


async def place_order(
    db: AsyncSession,
    payload,
    current_user: User,
):
    """Customer places a B2C order. Status = pending (inventory NOT yet deducted; deducted on completion)."""
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must have at least one item")

    # Validate store exists and get shopkeeper
    store_result = await db.execute(
        select(Store).where(Store.id == payload.store_id, Store.is_active == True)
    )
    store = store_result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    # Final validation before creating order (prevents race conditions)
    validation = await validate_order_payload(db, payload, current_user)
    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order validation failed: {'; '.join(validation.issues)}",
        )

    shopkeeper_id = store.owner_id

    subtotal = sum(item.unit_price * item.quantity for item in payload.items)
    gst = subtotal * 0.18 if getattr(payload, "apply_gst", True) else 0
    total = subtotal + gst - payload.discount

    order = None
    try:
        order = B2COrder(
            order_number=generate_b2c_order_number(),
            customer_user_id=current_user.id,
            customer_name=current_user.name or current_user.email.split("@")[0],
            customer_phone=current_user.phone,
            store_id=payload.store_id,
            shopkeeper_id=shopkeeper_id,
            payment_type=payload.payment_type,
            status=B2COrderStatus.PENDING.value,
            subtotal=subtotal,
            discount=payload.discount,
            gst=gst,
            total=total,
            notes=payload.notes,
        )
        db.add(order)
        await db.flush()

        for item in payload.items:
            order_item = B2COrderItem(
                order_id=order.id,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.unit_price * item.quantity,
            )
            db.add(order_item)

        await db.flush()
        await db.refresh(order, ["items"])
        await db.commit()

    except Exception:
        # If the session is already mid-transaction, rollback is still the safest
        # way to clear partial changes before re-raising.
        if db is not None:
            await db.rollback()
        raise

    await emit_order_created(
        shopkeeper_id,
        {
            "order_id": order.id,
            "order_number": order.order_number,
            "total": order.total,
            "payment_type": payload.payment_type,
        },
    )

    return await _order_to_response(db, order)



async def get_shopkeeper_orders(
    db: AsyncSession,
    shopkeeper_id: int,
    status_filter: str | None = None,
):
    """Shopkeeper views their B2C orders, optionally filtered by status."""
    # TEMP DEBUG (remove later)
    try:
        print(
            f"[DEBUG][b2c_service.get_shopkeeper_orders] shopkeeper_id={shopkeeper_id} status_filter={status_filter}"
        )
    except Exception:
        pass

    conditions = [B2COrder.shopkeeper_id == shopkeeper_id]
    if status_filter == "history":
        conditions.append(B2COrder.status.in_(["completed", "cancelled", "rejected"]))
    elif status_filter:
        conditions.append(B2COrder.status == status_filter)


    result = await db.execute(
        select(B2COrder)
        .where(*conditions)
        .options(selectinload(B2COrder.items))
        .order_by(B2COrder.created_at.desc())
    )
    orders = result.scalars().all()

    # TEMP DEBUG (remove later)
    try:
        print(f"[DEBUG][b2c_service.get_shopkeeper_orders] rows={len(orders)} ids={[o.id for o in orders]}")
        if orders:
            print(
                "[DEBUG][b2c_service.get_shopkeeper_orders] sample="
                + ", ".join(
                    [
                        f"{{id:{o.id}, store_id:{o.store_id}, status:{o.status}}}"
                        for o in orders[:5]
                    ]
                )
            )
    except Exception:
        pass

    return [await _order_to_response(db, o) for o in orders]



async def approve_order(
    db: AsyncSession,
    order_id: int,
    shopkeeper_id: int,
):
    """Shopkeeper approves a pending B2C order → status = confirmed. No inventory changes yet."""
    result = await db.execute(
        select(B2COrder)
        .where(
            B2COrder.id == order_id,
            B2COrder.shopkeeper_id == shopkeeper_id,
        )
        .options(selectinload(B2COrder.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="B2C order not found")

    expected_prev = VALID_TRANSITIONS.get(B2COrderStatus.PENDING)
    if order.status != B2COrderStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be approved from status: {order.status}. Expected: {B2COrderStatus.PENDING.value}",
        )

    order.status = B2COrderStatus.CONFIRMED.value
    await db.flush()

    # Notify the shopkeeper
    alert = Notification(
        user_id=shopkeeper_id,
        type="low_stock",
        title="B2C Order Approved",
        message=f"B2C Order #{order.order_number} approved (confirmed). ₹{order.total:.2f} from {order.customer_name}",
        reference_id=order.id,
    )
    db.add(alert)

    await db.commit()
    await db.refresh(order, ["items"])
    await invalidate_cache("dashboard:*")
    await emit_order_status_changed(shopkeeper_id, order.id, B2COrderStatus.CONFIRMED.value)

    return await _order_to_response(db, order)


async def complete_order(
    db: AsyncSession,
    order_id: int,
    shopkeeper_id: int,
    payload=None,
):
    """Shopkeeper completes a pending or confirmed B2C order → generate receipt.
    Payload can contain edited items, discount, and apply_gst."""
    result = await db.execute(
        select(B2COrder)
        .where(
            B2COrder.id == order_id,
            B2COrder.shopkeeper_id == shopkeeper_id,
        )
        .options(selectinload(B2COrder.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="B2C order not found")

    if order.status not in (B2COrderStatus.PENDING.value, B2COrderStatus.CONFIRMED.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be completed from status: {order.status}. Expected: {B2COrderStatus.PENDING.value} or {B2COrderStatus.CONFIRMED.value}",
        )

    # Check for existing receipt (stale from prior completion) to avoid 409
    existing_receipt_result = await db.execute(
        select(Receipt).where(Receipt.b2c_order_id == order_id)
    )
    existing_receipt = existing_receipt_result.scalar_one_or_none()
    if existing_receipt:
        order.status = B2COrderStatus.COMPLETED.value
        await db.commit()
        await db.refresh(order, ["items"])
        return await _order_to_response(db, order)

    try:
        order.status = B2COrderStatus.COMPLETED.value
        await db.flush()

        edited_items = payload.items if payload and payload.items is not None else None
        discount = payload.discount if payload and payload.discount is not None else order.discount
        apply_gst = payload.apply_gst if payload else True

        order_items = edited_items if edited_items else order.items

        subtotal = sum(item.quantity * item.unit_price for item in order_items) if edited_items else order.subtotal
        gst = round(subtotal * 0.18, 2) if apply_gst else 0
        total = max(0, subtotal + gst - discount)

        order.subtotal = subtotal
        order.discount = discount
        order.gst = gst
        order.total = total
        await db.flush()

        for item in order_items:
            pid = item.product_id if edited_items else item.product_id
            qty = item.quantity if edited_items else item.quantity
            pname = item.product_name if edited_items else item.product_name

            product_result = await db.execute(
                select(Product).where(Product.id == pid, Product.owner_id == shopkeeper_id)
            )
            product = product_result.scalar_one_or_none()
            if not product:
                raise HTTPException(status_code=400, detail=f"Product '{pname}' not found")
            if product.stock_quantity < qty:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {pname}: have {product.stock_quantity}, need {qty}")
            product.stock_quantity -= qty
            movement = InventoryMovement(
                product_id=pid, shopkeeper_id=shopkeeper_id,
                movement_type=MovementType.CONSUME_OUT, quantity=-qty,
                reference=f"B2C Order #{order.order_number}",
            )
            db.add(movement)
            await db.flush()
            await check_low_stock(pid, shopkeeper_id, db)

        from datetime import datetime
        ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        store_result = await db.execute(select(Store).where(Store.id == order.store_id))
        store = store_result.scalar_one_or_none()
        if store and order_items:
            receipt = Receipt(
                receipt_number=f"RCPT-B2C-{order.id:08d}-{ts}",
                b2c_order_id=order.id, shopkeeper_id=shopkeeper_id,
                customer_id=None, store_id=order.store_id,
                payment_method="upi" if order.payment_type == "online" else order.payment_type,
                subtotal=subtotal, discount=discount, taxes=gst, total_amount=total,
            )
            db.add(receipt)
            await db.flush()
            for item in order_items:
                pid = item.product_id if edited_items else item.product_id
                pname = item.product_name if edited_items else item.product_name
                qty = item.quantity if edited_items else item.quantity
                uprice = item.unit_price if edited_items else item.unit_price
                line_total = qty * uprice
                db.add(ReceiptItem(
                    receipt_id=receipt.id, order_item_id=None,
                    product_id=pid, product_name=pname, quantity=qty,
                    unit_price=uprice, line_total=line_total, taxes=gst, discount=discount,
                ))

        alert = Notification(
            user_id=shopkeeper_id, type="low_stock",
            title="B2C Order Completed",
            message=f"B2C Order #{order.order_number} completed. ₹{total:.2f} from {order.customer_name}",
            reference_id=order.id,
        )
        db.add(alert)

        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing_result = await db.execute(
            select(B2COrder)
            .where(B2COrder.id == order_id, B2COrder.shopkeeper_id == shopkeeper_id)
            .options(selectinload(B2COrder.items))
        )
        existing = existing_result.scalar_one_or_none()
        if existing and existing.status == B2COrderStatus.COMPLETED.value:
            return await _order_to_response(db, existing)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database conflict completing order. The order may already have a receipt. Please refresh and check completed orders.",
        )

    await db.refresh(order, ["items"])
    await invalidate_cache("dashboard:*")
    await emit_order_status_changed(shopkeeper_id, order.id, B2COrderStatus.COMPLETED.value)

    return await _order_to_response(db, order)



async def _restore_inventory_for_order_items(
    db: AsyncSession,
    order,
    shopkeeper_id: int,
    reference: str,
):
    """
    Restore inventory for an order by adding back consumed quantities.
    Note: Currently unused in the one-step approve flow (inventory deducted only on completion).
    Kept for backward compatibility.
    """
    if not order.items:
        return

    for it in order.items:
        product_result = await db.execute(
            select(Product).where(
                Product.id == it.product_id,
                Product.owner_id == shopkeeper_id,
            )
        )
        product = product_result.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{it.product_name}' not found for inventory restore",
            )

        product.stock_quantity += it.quantity
        db.add(
            InventoryMovement(
                product_id=it.product_id,
                shopkeeper_id=shopkeeper_id,
                movement_type=MovementType.RETURN,
                quantity=it.quantity,
                reference=reference,
            )
        )


async def set_processing_order(
    db: AsyncSession,
    order_id: int,
    shopkeeper_id: int,
):
    """Shopkeeper marks an order as processing."""
    result = await db.execute(
        select(B2COrder)
        .where(
            B2COrder.id == order_id,
            B2COrder.shopkeeper_id == shopkeeper_id,
        )
        .options(selectinload(B2COrder.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="B2C order not found")

    if order.status not in (B2COrderStatus.CONFIRMED.value, B2COrderStatus.PENDING.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be set to processing from status: {order.status}",
        )

    # processing status is stored as a string (B2COrder.status is a plain String)
    order.status = "processing"
    await db.flush()

    await db.commit()
    await db.refresh(order, ["items"])
    await invalidate_cache("dashboard:*")
    await emit_order_status_changed(shopkeeper_id, order.id, order.status)

    return await _order_to_response(db, order)


async def reject_order(
    db: AsyncSession,
    order_id: int,
    shopkeeper_id: int,
):
    """Shopkeeper rejects a pending B2C order (no inventory restore needed since not yet deducted)."""
    result = await db.execute(
        select(B2COrder)
        .where(
            B2COrder.id == order_id,
            B2COrder.shopkeeper_id == shopkeeper_id,
        )
        .options(selectinload(B2COrder.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="B2C order not found")

    if order.status in ("cancelled", "rejected", B2COrderStatus.COMPLETED.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be rejected from status: {order.status}",
        )

    order.status = "rejected"
    await db.flush()

    await db.refresh(order, ["items"])
    await invalidate_cache("dashboard:*")
    await emit_order_status_changed(shopkeeper_id, order.id, order.status)

    return await _order_to_response(db, order)


async def cancel_order(
    db: AsyncSession,
    order_id: int,
    shopkeeper_id: int,
):
    """Shopkeeper cancels a pending B2C order."""
    result = await db.execute(
        select(B2COrder)
        .where(
            B2COrder.id == order_id,
            B2COrder.shopkeeper_id == shopkeeper_id,
        )
        .options(selectinload(B2COrder.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="B2C order not found")

    if order.status in ("cancelled", "rejected", B2COrderStatus.COMPLETED.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be cancelled from status: {order.status}",
        )

    order.status = "cancelled"
    await db.flush()

    await db.refresh(order, ["items"])
    await invalidate_cache("dashboard:*")
    await emit_order_status_changed(shopkeeper_id, order.id, order.status)

    return await _order_to_response(db, order)



async def get_customer_orders(
    db: AsyncSession,
    customer_user_id: int,
):
    """Customer views their own B2C orders."""
    result = await db.execute(
        select(B2COrder)
        .where(B2COrder.customer_user_id == customer_user_id)
        .options(selectinload(B2COrder.items))
        .order_by(B2COrder.created_at.desc())
    )
    orders = result.scalars().all()
    return [await _order_to_response(db, o) for o in orders]


async def get_order_by_id(
    db: AsyncSession,
    order_id: int,
    customer_user_id: int,
):
    """Customer fetches a single B2C order by ID."""
    result = await db.execute(
        select(B2COrder)
        .where(
            B2COrder.id == order_id,
            B2COrder.customer_user_id == customer_user_id,
        )
        .options(selectinload(B2COrder.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="B2C order not found")
    return await _order_to_response(db, order)


async def _resolve_store_name(db, store_id: int) -> str | None:
    """Resolve store name from store_id."""
    if not store_id:
        return None
    result = await db.execute(select(Store.name).where(Store.id == store_id))
    return result.scalar_one_or_none()


async def _order_to_response(db, order):
    """Convert B2COrder to dict response."""
    store_name = await _resolve_store_name(db, order.store_id)
    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_user_id": order.customer_user_id,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "store_id": order.store_id,
        "shopkeeper_id": order.shopkeeper_id,
        "payment_type": order.payment_type,
        "status": order.status,
        "subtotal": order.subtotal,
        "discount": order.discount,
        "gst": order.gst,
        "total": order.total,
        "notes": order.notes,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": [
            {
                "id": it.id,
                "product_id": it.product_id,
                "product_name": it.product_name,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "total_price": it.total_price,
            }
            for it in (order.items or [])
        ],
        "store_name": store_name,
    }