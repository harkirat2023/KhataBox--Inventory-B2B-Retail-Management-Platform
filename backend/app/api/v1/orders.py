import random
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.customer import Customer
from app.models.inventory import InventoryMovement, MovementType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem
from app.models.store import Store
from app.models.user import User
from app.schemas.order import BulkOrderCreate, OrderCreate, OrderResponse, OrderStatusUpdate
from app.services.notifications import check_low_stock

router = APIRouter()


def generate_order_number() -> str:
    return "ORD-" + "".join(random.choices(string.digits, k=8))


@router.get("/", response_model=list[OrderResponse])
async def list_orders(current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order)
        .where(Order.shopkeeper_id == current_user.id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()

    customer_ids = {o.customer_id for o in orders if o.customer_id is not None}
    customers_by_id = {}
    if customer_ids:
        cust_result = await db.execute(select(Customer).where(Customer.id.in_(customer_ids)))
        customers_by_id = {c.id: c for c in cust_result.scalars().all()}

    product_ids = {it.product_id for o in orders for it in (o.items or [])}
    products_by_id = {}
    if product_ids:
        prod_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
        products_by_id = {p.id: p for p in prod_result.scalars().all()}

    def order_to_dict(o: Order) -> dict:
        customer = customers_by_id.get(o.customer_id) if o.customer_id is not None else None
        return {
            "id": o.id,
            "order_number": o.order_number,
            "shopkeeper_id": o.shopkeeper_id,
            "customer_id": o.customer_id,
            "customer_name": customer.company_name if customer else None,
            "status": o.status.value if hasattr(o.status, "value") else str(o.status),
            "payment_method": o.payment_method.value if hasattr(o.payment_method, "value") else o.payment_method,
            "subtotal": o.subtotal,
            "discount": o.discount,
            "gst": o.gst,
            "total": o.total,
            "notes": o.notes,
            "created_at": o.created_at,
            "updated_at": o.updated_at,
            "items": [
                {
                    "id": it.id,
                    "product_id": it.product_id,
                    "product_name": it.product_name,
                    "product_sku": products_by_id.get(it.product_id).sku if products_by_id.get(it.product_id) else None,
                    "quantity": it.quantity,
                    "unit_price": it.unit_price,
                    "total": it.total_price,
                }
                for it in (o.items or [])
            ],
        }

    return [order_to_dict(o) for o in orders]


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(payload: OrderCreate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    subtotal = sum(item.unit_price * item.quantity for item in payload.items)
    gst = subtotal * 0.18
    total = subtotal + gst - payload.discount

    order = Order(
        order_number=generate_order_number(),
        shopkeeper_id=current_user.id,
        customer_id=payload.customer_id,
        payment_method=payload.payment_method,
        subtotal=subtotal,
        discount=payload.discount,
        gst=gst,
        total=total,
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    for item in payload.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.unit_price * item.quantity,
        )
        db.add(order_item)

    await db.commit()
    await db.refresh(order, ["items"])

    # Enrich response contract for shopkeeper UI
    customer = None
    if order.customer_id is not None:
        cust_result = await db.execute(select(Customer).where(Customer.id == order.customer_id))
        customer = cust_result.scalar_one_or_none()

    product_ids = {it.product_id for it in (order.items or [])}
    products_by_id = {}
    if product_ids:
        prod_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
        products_by_id = {p.id: p for p in prod_result.scalars().all()}

    return {
        "id": order.id,
        "order_number": order.order_number,
        "shopkeeper_id": order.shopkeeper_id,
        "customer_id": order.customer_id,
        "customer_name": customer.company_name if customer else None,
        "status": order.status.value if hasattr(order.status, "value") else str(order.status),
        "payment_method": order.payment_method.value if hasattr(order.payment_method, "value") else order.payment_method,
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
                "product_sku": products_by_id.get(it.product_id).sku if products_by_id.get(it.product_id) else None,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "total": it.total_price,
            }
            for it in (order.items or [])
        ],
    }


@router.post("/bulk", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_bulk_order(payload: BulkOrderCreate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must have at least one item")

    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found for your account")

    subtotal = sum(item.unit_price * item.quantity for item in payload.items)
    gst = subtotal * 0.18
    total = round(subtotal + gst, 2)

    if payload.payment_method == "credit":
        credit_remaining = customer.credit_limit - customer.credit_used
        if total > credit_remaining:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Credit limit exceeded. Available: ₹{credit_remaining:.2f}, Order total: ₹{total:.2f}",
            )

    order = Order(
        order_number=generate_order_number(),
        shopkeeper_id=customer.owner_id,
        customer_id=customer.id,
        payment_method=payload.payment_method,
        subtotal=subtotal,
        discount=0,
        gst=gst,
        total=total,
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    for item in payload.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.unit_price * item.quantity,
        )
        db.add(order_item)

    if payload.payment_method == "credit":
        customer.credit_used += total
        await db.flush()

    await db.commit()
    await db.refresh(order, ["items"])

    customer = None
    if order.customer_id is not None:
        cust_result = await db.execute(select(Customer).where(Customer.id == order.customer_id))
        customer = cust_result.scalar_one_or_none()

    product_ids = {it.product_id for it in (order.items or [])}
    products_by_id = {}
    if product_ids:
        prod_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
        products_by_id = {p.id: p for p in prod_result.scalars().all()}

    return {
        "id": order.id,
        "order_number": order.order_number,
        "shopkeeper_id": order.shopkeeper_id,
        "customer_id": order.customer_id,
        "customer_name": customer.company_name if customer else None,
        "status": order.status.value if hasattr(order.status, "value") else str(order.status),
        "payment_method": order.payment_method.value if hasattr(order.payment_method, "value") else order.payment_method,
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
                "product_sku": products_by_id.get(it.product_id).sku if products_by_id.get(it.product_id) else None,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "total": it.total_price,
            }
            for it in (order.items or [])
        ],
    }


@router.get("/my-orders", response_model=list[OrderResponse])
async def my_orders(current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    result = await db.execute(
        select(Order).where(Order.customer_id == customer.id).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()

    # customer_name for "my-orders" is the same customer company_name
    customer_name = customer.company_name

    product_ids = {it.product_id for o in orders for it in (o.items or [])}
    products_by_id = {}
    if product_ids:
        prod_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
        products_by_id = {p.id: p for p in prod_result.scalars().all()}

    def order_to_dict(o: Order) -> dict:
        return {
            "id": o.id,
            "order_number": o.order_number,
            "shopkeeper_id": o.shopkeeper_id,
            "customer_id": o.customer_id,
            "customer_name": customer_name,
            "status": o.status.value if hasattr(o.status, "value") else str(o.status),
            "payment_method": o.payment_method.value if hasattr(o.payment_method, "value") else o.payment_method,
            "subtotal": o.subtotal,
            "discount": o.discount,
            "gst": o.gst,
            "total": o.total,
            "notes": o.notes,
            "created_at": o.created_at,
            "updated_at": o.updated_at,
            "items": [
                {
                    "id": it.id,
                    "product_id": it.product_id,
                    "product_name": it.product_name,
                    "product_sku": products_by_id.get(it.product_id).sku if products_by_id.get(it.product_id) else None,
                    "quantity": it.quantity,
                    "unit_price": it.unit_price,
                    "total": it.total_price,
                }
                for it in (o.items or [])
            ],
        }

    return [order_to_dict(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.shopkeeper_id == current_user.id).options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    customer = None
    if order.customer_id is not None:
        cust_result = await db.execute(select(Customer).where(Customer.id == order.customer_id))
        customer = cust_result.scalar_one_or_none()

    product_ids = {it.product_id for it in (order.items or [])}
    products_by_id = {}
    if product_ids:
        prod_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
        products_by_id = {p.id: p for p in prod_result.scalars().all()}

    return {
        "id": order.id,
        "order_number": order.order_number,
        "shopkeeper_id": order.shopkeeper_id,
        "customer_id": order.customer_id,
        "customer_name": customer.company_name if customer else None,
        "status": order.status.value if hasattr(order.status, "value") else str(order.status),
        "payment_method": order.payment_method.value if hasattr(order.payment_method, "value") else order.payment_method,
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
                "product_sku": products_by_id.get(it.product_id).sku if products_by_id.get(it.product_id) else None,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "total": it.total_price,
            }
            for it in (order.items or [])
        ],
    }


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(order_id: int, payload: OrderStatusUpdate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.shopkeeper_id == current_user.id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    prev_status = order.status
    new_status = OrderStatus(payload.status)

    # Idempotency: if status isn't changing, return as-is.
    if prev_status == new_status:
        await db.commit()
        await db.refresh(order, ["items"])
    else:
        # Inventory sync is driven strictly by status transitions.
        # Availability rules:
        # - On reserve (confirmed): decrease available stock_quantity and increase reserved_quantity.
        # - On completion (completed): release reserved and keep stock_quantity decreased permanently.
        # - On cancellation (cancelled): restore available stock_quantity and release any reservation.

        if new_status == OrderStatus.CONFIRMED and prev_status in (OrderStatus.PENDING,):
            for it in (order.items or []):
                product_result = await db.execute(select(Product).where(Product.id == it.product_id, Product.owner_id == current_user.id))
                product = product_result.scalar_one_or_none()
                if not product:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product not found: {it.product_id}")
                if product.stock_quantity < it.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock for reservation: have {product.stock_quantity}, need {it.quantity}",
                    )

                product.stock_quantity -= it.quantity
                product.reserved_quantity += it.quantity

                movement = InventoryMovement(
                    product_id=it.product_id,
                    shopkeeper_id=current_user.id,
                    movement_type=MovementType.RESERVE_OUT,
                    quantity=-it.quantity,
                    reference=f"Order #{order.order_number}",
                )
                db.add(movement)

                await db.flush()
                await check_low_stock(it.product_id, current_user.id, db)

        elif new_status == OrderStatus.COMPLETED and prev_status in (OrderStatus.CONFIRMED, OrderStatus.PROCESSING):
            # Completion consumes reserved stock.
            for it in (order.items or []):
                product_result = await db.execute(select(Product).where(Product.id == it.product_id, Product.owner_id == current_user.id))
                product = product_result.scalar_one_or_none()
                if not product:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product not found: {it.product_id}")

                # Release reserved quantity (no change to stock_quantity; it was already reduced on reserve).
                if product.reserved_quantity < it.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Reserved stock mismatch: have {product.reserved_quantity}, need {it.quantity}",
                    )
                product.reserved_quantity -= it.quantity

                movement = InventoryMovement(
                    product_id=it.product_id,
                    shopkeeper_id=current_user.id,
                    movement_type=MovementType.CONSUME_OUT,
                    quantity=-it.quantity,
                    reference=f"Order #{order.order_number}",
                )
                db.add(movement)

            # Receipt generation is idempotent: generate ONLY on transition to COMPLETED,
            # and only if no receipt exists for this order yet.
            receipt_result = await db.execute(select(Receipt).where(Receipt.order_id == order.id))
            existing_receipt = receipt_result.scalar_one_or_none()
            if not existing_receipt:
                # Resolve store_id for this shopkeeper (current_user).
                # Store.owner_id ties store to shopkeeper user.
                store_result = await db.execute(select(Store).where(Store.owner_id == current_user.id).limit(1))
                store = store_result.scalar_one_or_none()
                if not store:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found for shopkeeper")

                # Generate receipt number (deterministic-ish; unique constraint will protect against collisions).
                receipt_number = f"RCPT-{order.id:08d}"

                receipt = Receipt(
                    receipt_number=receipt_number,
                    order_id=order.id,
                    shopkeeper_id=current_user.id,
                    customer_id=order.customer_id,
                    store_id=store.id,
                    payment_method=order.payment_method,
                    subtotal=order.subtotal,
                    discount=order.discount,
                    taxes=order.gst,
                    total_amount=order.total,
                )
                db.add(receipt)
                await db.flush()

                for it in (order.items or []):
                    db.add(
                        ReceiptItem(
                            receipt_id=receipt.id,
                            order_item_id=it.id,
                            product_id=it.product_id,
                            product_name=it.product_name,
                            quantity=it.quantity,
                            unit_price=it.unit_price,
                            line_total=it.total_price,
                            taxes=order.gst,
                            discount=order.discount,
                        )
                    )
            # If receipt exists, do nothing (idempotent).

        elif new_status == OrderStatus.CANCELLED and prev_status in (OrderStatus.PENDING,):
            # No reservation yet; do nothing.
            pass

        elif new_status == OrderStatus.CANCELLED and prev_status in (OrderStatus.CONFIRMED, OrderStatus.PROCESSING):
            # Cancellation releases reservation and restores available stock.
            for it in (order.items or []):
                product_result = await db.execute(select(Product).where(Product.id == it.product_id, Product.owner_id == current_user.id))
                product = product_result.scalar_one_or_none()
                if not product:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product not found: {it.product_id}")

                if product.reserved_quantity < it.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Reserved stock mismatch: have {product.reserved_quantity}, need {it.quantity}",
                    )
                product.reserved_quantity -= it.quantity
                product.stock_quantity += it.quantity

                movement = InventoryMovement(
                    product_id=it.product_id,
                    shopkeeper_id=current_user.id,
                    movement_type=MovementType.RESERVE_CANCELLED_IN,
                    quantity=it.quantity,
                    reference=f"Order #{order.order_number}",
                )
                db.add(movement)

                await db.flush()
                await check_low_stock(it.product_id, current_user.id, db)

        # Other transitions are intentionally ignored for now (do not implement receipts).
        order.status = new_status
        await db.commit()
        await db.refresh(order, ["items"])

    customer = None
    if order.customer_id is not None:
        cust_result = await db.execute(select(Customer).where(Customer.id == order.customer_id))
        customer = cust_result.scalar_one_or_none()

    product_ids = {it.product_id for it in (order.items or [])}
    products_by_id = {}
    if product_ids:
        prod_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
        products_by_id = {p.id: p for p in prod_result.scalars().all()}

    return {
        "id": order.id,
        "order_number": order.order_number,
        "shopkeeper_id": order.shopkeeper_id,
        "customer_id": order.customer_id,
        "customer_name": customer.company_name if customer else None,
        "status": order.status.value if hasattr(order.status, "value") else str(order.status),
        "payment_method": order.payment_method.value if hasattr(order.payment_method, "value") else order.payment_method,
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
                "product_sku": products_by_id.get(it.product_id).sku if products_by_id.get(it.product_id) else None,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "total": it.total_price,
            }
            for it in (order.items or [])
        ],
    }
