import random
import string
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.customer import Customer
from app.models.inventory import InventoryMovement, MovementType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem
from app.models.store import Store
from app.services.cache import invalidate_pattern as invalidate_cache
from app.services.notifications import check_low_stock
from app.services.socketio_manager import emit_order_created, emit_order_status_changed


def generate_order_number() -> str:
    return "ORD-" + "".join(random.choices(string.digits, k=8))


async def _enrich_orders(db, orders):
    """Fetch customer and product lookups for a list of orders."""
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

    return customers_by_id, products_by_id


def _order_to_response(order, customers_by_id, products_by_id, default_customer_name=None):
    customer = customers_by_id.get(order.customer_id) if order.customer_id is not None else None
    return {
        "id": order.id,
        "order_number": order.order_number,
        "shopkeeper_id": order.shopkeeper_id,
        "customer_id": order.customer_id,
        "customer_name": customer.company_name if customer else default_customer_name,
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


async def list_orders(db, shopkeeper_id, page=None, page_size=None, b2c=None):
    conditions = [Order.shopkeeper_id == shopkeeper_id]
    if b2c is True:
        conditions.append(Order.is_b2c == True)
        conditions.append(Order.status.in_([OrderStatus.COUNTER, OrderStatus.CONFIRMED]))
    elif b2c is False:
        conditions.append(Order.is_b2c == False)
    base_query = select(Order).where(*conditions).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    total = None
    if page is not None and page_size is not None:
        count_query = select(func.count()).select_from(Order).where(*conditions)
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
    orders = result.scalars().all()
    customers_by_id, products_by_id = await _enrich_orders(db, orders)
    return [_order_to_response(o, customers_by_id, products_by_id) for o in orders], total


async def create_order(db, payload, shopkeeper_id):
    subtotal = sum(item.unit_price * item.quantity for item in payload.items)
    gst = subtotal * 0.18 if getattr(payload, "apply_gst", True) else 0
    total = subtotal + gst - payload.discount

    order = Order(
        order_number=generate_order_number(),
        shopkeeper_id=shopkeeper_id,
        customer_id=payload.customer_id,
        payment_method=payload.payment_method,
        status=OrderStatus.COMPLETED,
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
        await db.flush()

        product_result = await db.execute(
            select(Product).where(Product.id == item.product_id, Product.owner_id == shopkeeper_id)
        )
        product = product_result.scalar_one_or_none()
        if product:
            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for {product.name}: have {product.stock_quantity}, need {item.quantity}",
                )
            product.stock_quantity -= item.quantity
            movement = InventoryMovement(
                product_id=item.product_id,
                shopkeeper_id=shopkeeper_id,
                movement_type=MovementType.CONSUME_OUT,
                quantity=-item.quantity,
                reference=f"Order #{order.order_number}",
            )
            db.add(movement)
            await db.flush()
            await check_low_stock(item.product_id, shopkeeper_id, db)

    # Update customer credit
    credit_alert = None
    if payload.customer_id:
        cust_result = await db.execute(select(Customer).where(Customer.id == payload.customer_id))
        customer = cust_result.scalar_one_or_none()
        if customer:
            customer.credit_used = (customer.credit_used or 0) + order.total
            await db.flush()
            credit_used = customer.credit_used
            credit_limit = customer.credit_limit
            if credit_limit > 0 and credit_used > credit_limit:
                credit_alert = {
                    "customer_name": customer.company_name or customer.contact_person or customer.email,
                    "credit_used": credit_used,
                    "credit_limit": credit_limit,
                    "exceeded_by": round(credit_used - credit_limit, 2),
                }

    await db.commit()
    await db.refresh(order, ["items"])

    # Generate receipt (after commit to ensure IDs are final)
    store_result = await db.execute(select(Store).where(Store.owner_id == shopkeeper_id).limit(1))
    store = store_result.scalar_one_or_none()
    if store and order.items:
        receipt = Receipt(
            receipt_number=f"RCPT-{order.id:08d}",
            order_id=order.id,
            shopkeeper_id=shopkeeper_id,
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
        for oi in order.items:
            db.add(ReceiptItem(
                receipt_id=receipt.id,
                order_item_id=oi.id,
                product_id=oi.product_id,
                product_name=oi.product_name,
                quantity=oi.quantity,
                unit_price=oi.unit_price,
                line_total=oi.total_price,
                taxes=order.gst,
                discount=order.discount,
            ))
        await db.commit()
        await db.refresh(order, ["items"])

    customers_by_id, products_by_id = await _enrich_orders(db, [order])
    await invalidate_cache("dashboard:*")
    await emit_order_created(order.shopkeeper_id, {"order_id": order.id,
        "order_number": order.order_number, "total": order.total})
    resp = _order_to_response(order, customers_by_id, products_by_id)
    if credit_alert:
        resp["credit_alert"] = credit_alert
    return resp


async def create_bulk_order(db, payload, user_email):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must have at least one item")

    cust_result = await db.execute(select(Customer).where(Customer.email == user_email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found for your account")

    subtotal = sum(item.unit_price * item.quantity for item in payload.items)
    gst = subtotal * 0.18 if getattr(payload, "apply_gst", True) else 0
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
        status=OrderStatus.COMPLETED,
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
        await db.flush()

        product_result = await db.execute(
            select(Product).where(Product.id == item.product_id, Product.owner_id == customer.owner_id)
        )
        product = product_result.scalar_one_or_none()
        if product:
            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for {product.name}: have {product.stock_quantity}, need {item.quantity}",
                )
            product.stock_quantity -= item.quantity
            movement = InventoryMovement(
                product_id=item.product_id,
                shopkeeper_id=customer.owner_id,
                movement_type=MovementType.CONSUME_OUT,
                quantity=-item.quantity,
                reference=f"Order #{order.order_number}",
            )
            db.add(movement)
            await db.flush()
            await check_low_stock(item.product_id, customer.owner_id, db)

    if payload.payment_method == "credit":
        customer.credit_used += total
        await db.flush()

    await db.commit()
    await db.refresh(order, ["items"])

    # Generate receipt after commit
    store_result = await db.execute(select(Store).where(Store.owner_id == customer.owner_id).limit(1))
    store = store_result.scalar_one_or_none()
    if store and order.items:
        receipt = Receipt(
            receipt_number=f"RCPT-{order.id:08d}",
            order_id=order.id,
            shopkeeper_id=customer.owner_id,
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
        for oi in order.items:
            db.add(ReceiptItem(
                receipt_id=receipt.id,
                order_item_id=oi.id,
                product_id=oi.product_id,
                product_name=oi.product_name,
                quantity=oi.quantity,
                unit_price=oi.unit_price,
                line_total=oi.total_price,
                taxes=order.gst,
                discount=order.discount,
            ))
        await db.commit()
        await db.refresh(order, ["items"])

    customers_by_id, products_by_id = await _enrich_orders(db, [order])
    await invalidate_cache("dashboard:*")
    await emit_order_created(order.shopkeeper_id, {"order_id": order.id, "order_number": order.order_number, "total": order.total})
    return _order_to_response(order, customers_by_id, products_by_id)


async def approve_b2c_order(db, order_id, shopkeeper_id):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.shopkeeper_id == shopkeeper_id, Order.is_b2c == True)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="B2C order not found")

    if order.status not in (OrderStatus.COUNTER, OrderStatus.CONFIRMED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"B2C order cannot be approved from status: {order.status.value}",
        )

    order.status = OrderStatus.COMPLETED
    await db.commit()
    await db.refresh(order, ["items"])

    customers_by_id, products_by_id = await _enrich_orders(db, [order])
    await invalidate_cache("dashboard:*")
    await emit_order_status_changed(order.shopkeeper_id, order.id, "completed")
    return _order_to_response(order, customers_by_id, products_by_id)


async def get_my_orders(db, user_email, page=None, page_size=None):
    cust_result = await db.execute(select(Customer).where(Customer.email == user_email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        customer = Customer(
            email=user_email,
            company_name=user_email.split("@")[0],
            contact_person=user_email.split("@")[0],
            owner_id=0,
        )
        db.add(customer)
        await db.flush()

    base_query = select(Order).where(Order.customer_id == customer.id).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    total = None
    if page is not None and page_size is not None:
        count_result = await db.execute(select(func.count()).select_from(Order).where(Order.customer_id == customer.id))
        total = count_result.scalar()
        base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
    orders = result.scalars().all()
    customers_by_id, products_by_id = await _enrich_orders(db, orders)
    return [_order_to_response(o, customers_by_id, products_by_id, default_customer_name=customer.company_name) for o in orders], total


async def get_order(db, order_id, shopkeeper_id):
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.shopkeeper_id == shopkeeper_id).options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    customers_by_id, products_by_id = await _enrich_orders(db, [order])
    return _order_to_response(order, customers_by_id, products_by_id)


async def update_order_status(db, order_id, payload, shopkeeper_id):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.shopkeeper_id == shopkeeper_id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    prev_status = order.status
    new_status = OrderStatus(payload.status)

    if prev_status == new_status:
        await db.commit()
        await db.refresh(order, ["items"])
    else:
        if new_status == OrderStatus.COMPLETED and prev_status != OrderStatus.COMPLETED:
            for it in (order.items or []):
                product_result = await db.execute(
                    select(Product).where(Product.id == it.product_id, Product.owner_id == shopkeeper_id)
                )
                product = product_result.scalar_one_or_none()
                if not product:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Product not found: {it.product_id}",
                    )
                if product.stock_quantity < it.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock for {it.product_name}: have {product.stock_quantity}, need {it.quantity}",
                    )
                product.stock_quantity -= it.quantity

                movement = InventoryMovement(
                    product_id=it.product_id,
                    shopkeeper_id=shopkeeper_id,
                    movement_type=MovementType.CONSUME_OUT,
                    quantity=-it.quantity,
                    reference=f"Order #{order.order_number}",
                )
                db.add(movement)
                await db.flush()
                await check_low_stock(it.product_id, shopkeeper_id, db)

            receipt_result = await db.execute(select(Receipt).where(Receipt.order_id == order.id))
            existing_receipt = receipt_result.scalar_one_or_none()
            if not existing_receipt:
                store_result = await db.execute(select(Store).where(Store.owner_id == shopkeeper_id).limit(1))
                store = store_result.scalar_one_or_none()
                if not store:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found for shopkeeper")

                receipt = Receipt(
                    receipt_number=f"RCPT-{order.id:08d}",
                    order_id=order.id,
                    shopkeeper_id=shopkeeper_id,
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

        elif new_status == OrderStatus.CANCELLED and prev_status != OrderStatus.CANCELLED:
            pass

        order.status = new_status
        await db.commit()
        await db.refresh(order, ["items"])

    await invalidate_cache("dashboard:*")
    await emit_order_status_changed(order.shopkeeper_id, order.id, order.status.value if hasattr(order.status, "value") else str(order.status))
    customers_by_id, products_by_id = await _enrich_orders(db, [order])
    return _order_to_response(order, customers_by_id, products_by_id)
