import logging
import random
import string
import traceback
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import DataError, DBAPIError, IntegrityError, SQLAlchemyError
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

INT32_MIN = -2147483648
INT32_MAX = 2147483647

from app.models.customer import Customer
from app.models.inventory import InventoryMovement, MovementType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem
from app.models.store import Store
from app.services.cache import invalidate_pattern as invalidate_cache
from app.models.notification import NotificationType
from app.models.product_activity import ActivityType
from app.services.notifications import check_low_stock, create_notification
from app.services.product_activity_service import log_activity
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
        "revision_number": order.revision_number,
        "previous_total": order.previous_total,
        "adjustment_total": order.adjustment_total,
        "revision_status": order.revision_status,
        "items": [
            {
                "id": it.id,
                "product_id": it.product_id,
                "product_name": it.product_name,
                "product_sku": products_by_id.get(it.product_id).sku if products_by_id.get(it.product_id) else "UNPACKED",
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


async def _try_safe_emit(func, *args, **kwargs):
    """Emit a SocketIO event safely — never raise from notifications."""
    try:
        await func(*args, **kwargs)
    except Exception:
        logger.exception("SocketIO emit failed (non-fatal)")


async def create_order(db, payload, shopkeeper_id):
    logger.debug("=== create_order START ===")
    logger.debug("shopkeeper_id=%s, customer_id=%s, items_count=%s, payment_method=%s",
                 shopkeeper_id, payload.customer_id, len(payload.items) if payload.items else 0, payload.payment_method)

    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must have at least one item")

    for idx, item in enumerate(payload.items):
        if not (INT32_MIN <= item.product_id <= INT32_MAX):
            logger.warning("item[%s] product_id %s out of int32 range", idx, item.product_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid product_id {item.product_id}: must be within signed 32-bit integer range",
            )
        if item.quantity < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Quantity must be at least 1 for {item.product_name}")
        if item.unit_price < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unit price cannot be negative for {item.product_name}")

    if payload.customer_id is not None:
        logger.debug("Validating customer_id=%s", payload.customer_id)
        cust_check = await db.execute(select(Customer).where(Customer.id == payload.customer_id))
        if cust_check.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Customer not found: id={payload.customer_id}")

    subtotal = sum(item.unit_price * item.quantity for item in payload.items)
    gst = subtotal * 0.18 if getattr(payload, "apply_gst", True) else 0
    total = subtotal + gst - payload.discount
    logger.debug("subtotal=%s, gst=%s, discount=%s, total=%s", subtotal, gst, payload.discount, total)

    try:
        order_number = generate_order_number()
        logger.debug("Creating Order: order_number=%s", order_number)
        order = Order(
            order_number=order_number,
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
        logger.debug("Before first flush (Order)")
        await db.flush()
        logger.debug("After first flush: order.id=%s", order.id)

        for idx, item in enumerate(payload.items):
            logger.debug("PROCESSING item[%s]: product_id=%s, name=%s, qty=%s, price=%s",
                         idx, item.product_id, item.product_name, item.quantity, item.unit_price)

            order_item = OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.unit_price * item.quantity,
            )
            db.add(order_item)
            logger.debug("Before flush (OrderItem %s)", idx)
            await db.flush()
            logger.debug("After flush (OrderItem %s): id=%s", idx, order_item.id)

            logger.debug("Querying Product: product_id=%s, owner_id=%s", item.product_id, shopkeeper_id)
            product_result = await db.execute(
                select(Product).where(Product.id == item.product_id, Product.owner_id == shopkeeper_id)
            )
            product = product_result.scalar_one_or_none()
            logger.debug("Product lookup result: %s", product.id if product else None)

            if product:
                logger.debug("Stock before deduction: product_id=%s, stock=%s, needed=%s",
                             product.id, product.stock_quantity, item.quantity)
                if product.stock_quantity < item.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock for {product.name}: have {product.stock_quantity}, need {item.quantity}",
                    )
                product.stock_quantity -= item.quantity
                logger.debug("Stock after deduction: %s", product.stock_quantity)

                movement = InventoryMovement(
                    product_id=item.product_id,
                    shopkeeper_id=shopkeeper_id,
                    movement_type=MovementType.CONSUME_OUT,
                    quantity=-item.quantity,
                    reference=f"Order #{order.order_number}",
                )
                db.add(movement)
                await log_activity(
                    db=db, product_id=item.product_id, shopkeeper_id=shopkeeper_id,
                    activity_type=ActivityType.ORDER_CONSUMED,
                    quantity=-item.quantity,
                    reference=f"Order #{order.order_number}",
                )
                logger.debug("Before flush (InventoryMovement %s)", idx)
                await db.flush()
                logger.debug("After flush (InventoryMovement)")

                logger.debug("Calling check_low_stock for product_id=%s", item.product_id)
                await check_low_stock(item.product_id, shopkeeper_id, db)
                logger.debug("check_low_stock completed")
            else:
                logger.debug("Product not found for product_id=%s — skipping stock deduction (Unpacked Product)", item.product_id)

        # Update customer credit
        credit_alert = None
        if payload.customer_id:
            logger.debug("Looking up customer for credit: customer_id=%s", payload.customer_id)
            cust_result = await db.execute(select(Customer).where(Customer.id == payload.customer_id))
            customer = cust_result.scalar_one_or_none()
            if customer:
                logger.debug("Customer found: id=%s, credit_used_before=%s, credit_limit=%s",
                             customer.id, customer.credit_used, customer.credit_limit)
                customer.credit_used = (customer.credit_used or 0) + order.total
                logger.debug("Before flush (credit update)")
                await db.flush()
                logger.debug("After flush (credit update): credit_used=%s", customer.credit_used)
                credit_used = customer.credit_used
                credit_limit = customer.credit_limit
                if credit_limit > 0 and credit_used > credit_limit:
                    credit_alert = {
                        "customer_name": customer.company_name or customer.contact_person or customer.email,
                        "credit_used": credit_used,
                        "credit_limit": credit_limit,
                        "exceeded_by": round(credit_used - credit_limit, 2),
                    }
                    logger.debug("Credit limit exceeded: %s", credit_alert)
            else:
                logger.warning("Customer not found for id=%s — skipping credit update", payload.customer_id)

        logger.debug("Before main commit")
        await db.commit()
        logger.debug("After main commit")
        await db.refresh(order, ["items"])
        logger.debug("After refresh: order items count=%s", len(order.items) if order.items else 0)

        # Generate receipt (after commit to ensure IDs are final)
        logger.debug("Looking up store for receipt: owner_id=%s", shopkeeper_id)
        store_result = await db.execute(select(Store).where(Store.owner_id == shopkeeper_id).limit(1))
        store = store_result.scalar_one_or_none()
        logger.debug("Store lookup result: %s", store.id if store else None)

        if store and order.items:
            logger.debug("Creating Receipt for order_id=%s", order.id)
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
            logger.debug("Before flush (Receipt)")
            await db.flush()
            logger.debug("After flush (Receipt): receipt.id=%s", receipt.id)

            for oi_idx, oi in enumerate(order.items):
                logger.debug("Creating ReceiptItem[%s]: order_item_id=%s, product_id=%s, product_name=%s",
                             oi_idx, oi.id, oi.product_id, oi.product_name)
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
            logger.debug("Before receipt commit")
            await db.commit()
            logger.debug("After receipt commit")
            await db.refresh(order, ["items"])
            logger.debug("After receipt refresh")
        else:
            logger.debug("Skipping receipt: store=%s, order.items=%s",
                         "found" if store else "NOT FOUND",
                         len(order.items) if order.items else 0)

    except HTTPException:
        logger.debug("HTTPException caught — rolling back")
        await db.rollback()
        logger.debug("Rollback complete")
        raise
    except IntegrityError:
        await db.rollback()
        logger.exception("IntegrityError creating order for shopkeeper %s", shopkeeper_id)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order number collision; please retry")
    except DataError:
        await db.rollback()
        logger.exception("DataError creating order for shopkeeper %s", shopkeeper_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data in order request")
    except DBAPIError as exc:
        await db.rollback()
        logger.critical("DBAPIError creating order for shopkeeper %s", shopkeeper_id)
        print("=" * 80, flush=True)
        print("CREATE ORDER FAILED — DBAPIError", flush=True)
        traceback.print_exc()
        print("=" * 80, flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {exc}")
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.critical("SQLAlchemyError creating order for shopkeeper %s", shopkeeper_id)
        print("=" * 80, flush=True)
        print("CREATE ORDER FAILED — SQLAlchemyError", flush=True)
        traceback.print_exc()
        print("=" * 80, flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {exc}")
    except Exception as exc:
        await db.rollback()
        logger.critical("UNEXPECTED exception creating order for shopkeeper %s", shopkeeper_id)
        print("=" * 80, flush=True)
        print("CREATE ORDER FAILED — UNEXPECTED EXCEPTION", flush=True)
        print("Exception Type:", type(exc).__name__)
        print("Exception Args:", exc.args)
        traceback.print_exc()
        print("=" * 80, flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {exc}")

    await create_notification(
        db=db, user_id=shopkeeper_id, type=NotificationType.ORDER_COMPLETED,
        title="Order Completed",
        message=f"Order #{order.order_number} for ₹{order.total:.2f} completed",
        reference_id=order.id,
    )
    if order.customer_id:
        await create_notification(
            db=db, user_id=shopkeeper_id, type=NotificationType.INVOICE_GENERATED,
            title="Invoice Generated",
            message=f"Invoice generated for Order #{order.order_number}",
            reference_id=order.id,
        )

    logger.debug("Enriching orders for response")
    customers_by_id, products_by_id = await _enrich_orders(db, [order])
    logger.debug("Emitting order_created event")
    await _try_safe_emit(emit_order_created, order.shopkeeper_id, {"order_id": order.id,
        "order_number": order.order_number, "total": order.total})
    logger.debug("Invalidating cache")
    await invalidate_cache("dashboard:*")
    resp = _order_to_response(order, customers_by_id, products_by_id)
    if credit_alert:
        resp["credit_alert"] = credit_alert
    logger.debug("=== create_order SUCCESS ===")
    return resp


async def create_bulk_order(db, payload, user_email):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must have at least one item")

    for item in payload.items:
        if not (INT32_MIN <= item.product_id <= INT32_MAX):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid product_id {item.product_id}: must be within signed 32-bit integer range",
            )
        if item.quantity < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Quantity must be at least 1 for {item.product_name}")
        if item.unit_price < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unit price cannot be negative for {item.product_name}")

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

    try:
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
                await log_activity(
                    db=db, product_id=item.product_id, shopkeeper_id=customer.owner_id,
                    activity_type=ActivityType.ORDER_CONSUMED,
                    quantity=-item.quantity,
                    reference=f"Order #{order.order_number}",
                )
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

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        logger.exception("IntegrityError creating bulk order for %s", user_email)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order number collision; please retry")
    except DataError:
        await db.rollback()
        logger.exception("DataError creating bulk order for %s", user_email)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data in order request")
    except DBAPIError as exc:
        await db.rollback()
        logger.critical("DBAPIError creating bulk order for %s", user_email)
        print("=" * 80, flush=True)
        print("CREATE BULK ORDER FAILED — DBAPIError", flush=True)
        traceback.print_exc()
        print("=" * 80, flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {exc}")
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.critical("SQLAlchemyError creating bulk order for %s", user_email)
        print("=" * 80, flush=True)
        print("CREATE BULK ORDER FAILED — SQLAlchemyError", flush=True)
        traceback.print_exc()
        print("=" * 80, flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {exc}")
    except Exception as exc:
        await db.rollback()
        logger.critical("UNEXPECTED exception creating bulk order for %s", user_email)
        print("=" * 80, flush=True)
        print("CREATE BULK ORDER FAILED — UNEXPECTED EXCEPTION", flush=True)
        print("Exception Type:", type(exc).__name__)
        print("Exception Args:", exc.args)
        traceback.print_exc()
        print("=" * 80, flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {exc}")

    await create_notification(
        db=db, user_id=order.shopkeeper_id, type=NotificationType.ORDER_COMPLETED,
        title="Order Completed",
        message=f"Order #{order.order_number} for ₹{order.total:.2f} completed",
        reference_id=order.id,
    )
    await create_notification(
        db=db, user_id=order.shopkeeper_id, type=NotificationType.INVOICE_GENERATED,
        title="Invoice Generated",
        message=f"Invoice generated for Order #{order.order_number}",
        reference_id=order.id,
    )

    customers_by_id, products_by_id = await _enrich_orders(db, [order])
    await invalidate_cache("dashboard:*")
    await _try_safe_emit(emit_order_created, order.shopkeeper_id, {"order_id": order.id, "order_number": order.order_number, "total": order.total})
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
    try:
        new_status = OrderStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {payload.status}")

    try:
        # --- REVISION FLOW (revised_items provided) ---
        if payload.revised_items is not None and len(payload.revised_items) > 0:
            if prev_status != OrderStatus.COMPLETED:
                raise HTTPException(status_code=400, detail="Only completed orders can be revised")

            new_discount = payload.discount if payload.discount is not None else order.discount
            apply_gst = payload.apply_gst if payload.apply_gst is not None else True

            new_subtotal = sum(i.unit_price * i.quantity for i in payload.revised_items)
            new_gst = round(new_subtotal * 0.18, 2) if apply_gst else 0
            new_total = max(0, new_subtotal + new_gst - new_discount)

            previous_total = order.total
            price_diff = round(new_total - previous_total, 2)
            has_change = price_diff != 0

            # Update existing OrderItems with new quantities
            existing_items = {it.product_id: it for it in (order.items or [])}
            old_items_map = {it.product_id: it for it in (order.items or [])}

            # Inventory: adjust by difference per product (only if changed)
            if has_change:
                for rev_item in payload.revised_items:
                    product_result = await db.execute(
                        select(Product).where(Product.id == rev_item.product_id, Product.owner_id == shopkeeper_id)
                    )
                    product = product_result.scalar_one_or_none()
                    if not product:
                        # Unpacked product — skip stock deduction
                        continue

                    old_qty = old_items_map.get(rev_item.product_id, OrderItem(quantity=0)).quantity
                    diff_qty = rev_item.quantity - old_qty

                    if diff_qty > 0:
                        if product.stock_quantity < diff_qty:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Insufficient stock for {rev_item.product_name}: have {product.stock_quantity}, need {diff_qty} more",
                            )
                        product.stock_quantity -= diff_qty
                        db.add(InventoryMovement(
                            product_id=rev_item.product_id, shopkeeper_id=shopkeeper_id,
                            movement_type=MovementType.CONSUME_OUT, quantity=-diff_qty,
                            reference=f"Order #{order.order_number} Rev-{order.revision_number + 1}",
                        ))
                    elif diff_qty < 0:
                        restore_qty = -diff_qty
                        product.stock_quantity += restore_qty
                        db.add(InventoryMovement(
                            product_id=rev_item.product_id, shopkeeper_id=shopkeeper_id,
                            movement_type=MovementType.RETURN, quantity=restore_qty,
                            reference=f"Order #{order.order_number} Rev-{order.revision_number + 1}",
                        ))
                    await db.flush()
                    await check_low_stock(rev_item.product_id, shopkeeper_id, db)

            for rev_item in payload.revised_items:
                if rev_item.product_id in existing_items:
                    oi = existing_items[rev_item.product_id]
                    oi.quantity = rev_item.quantity
                    oi.unit_price = rev_item.unit_price
                    oi.total_price = rev_item.quantity * rev_item.unit_price
                else:
                    new_oi = OrderItem(
                        order_id=order.id, product_id=rev_item.product_id,
                        product_name=rev_item.product_name, quantity=rev_item.quantity,
                        unit_price=rev_item.unit_price,
                        total_price=rev_item.quantity * rev_item.unit_price,
                    )
                    db.add(new_oi)

            # Remove items that are no longer in the revised list
            rev_product_ids = {i.product_id for i in payload.revised_items}
            for oi in list(order.items or []):
                if oi.product_id not in rev_product_ids:
                    await db.delete(oi)

            # Update order totals and revision metadata
            order.subtotal = new_subtotal
            order.discount = new_discount
            order.gst = new_gst
            order.total = new_total
            order.previous_total = previous_total
            order.adjustment_total = price_diff

            if has_change:
                order.revision_number += 1
                order.status = OrderStatus.COMPLETED
                if payload.settlement_type == "leftover":
                    leftover_due = max(0, price_diff - (payload.leftover_amount or 0))
                    order.revision_status = f"Due ₹{leftover_due:.0f}" if leftover_due > 0 else "Settled"
                else:
                    order.revision_status = "Updated"
            else:
                # No change — keep completed, no revision metadata update
                order.status = OrderStatus.COMPLETED
                # Don't increment revision_number

            if payload.notes:
                order.notes = payload.notes

            await db.flush()

            # Generate adjustment receipt only if price changed
            if has_change:
                store_result = await db.execute(select(Store).where(Store.owner_id == shopkeeper_id).limit(1))
                store = store_result.scalar_one_or_none()
                if store:
                    adj_sign = "UP" if price_diff > 0 else "DOWN"
                    adj_amt = abs(price_diff)
                    receipt = Receipt(
                        receipt_number=f"RCPT-{order.id:08d}-ADJ-{order.revision_number}",
                        order_id=order.id, shopkeeper_id=shopkeeper_id,
                        customer_id=order.customer_id, store_id=store.id,
                        payment_method=order.payment_method,
                        subtotal=0, discount=0, taxes=0, total_amount=adj_amt,
                    )
                    db.add(receipt)
                    await db.flush()
                    for rev_item in payload.revised_items:
                        db.add(ReceiptItem(
                            receipt_id=receipt.id,
                            product_id=rev_item.product_id,
                            product_name=rev_item.product_name,
                            quantity=rev_item.quantity,
                            unit_price=rev_item.unit_price,
                            line_total=rev_item.quantity * rev_item.unit_price,
                            taxes=0, discount=0,
                        ))

            # Only create notification if price changed
            if has_change:
                await create_notification(
                    db=db, user_id=shopkeeper_id, type=NotificationType.ORDER_REVISED,
                    title="Order Revised",
                    message=f"Order #{order.order_number} revised (Rev #{order.revision_number}) — new total ₹{order.total:.2f}",
                    reference_id=order.id,
                )
            await db.commit()
            await db.refresh(order, ["items"])

        # --- REGULAR STATUS TRANSITION ---
        else:
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

                elif new_status in (OrderStatus.CANCELLED, OrderStatus.REJECTED) and prev_status not in (OrderStatus.CANCELLED, OrderStatus.REJECTED):
                    if new_status == OrderStatus.REJECTED:
                        for it in (order.items or []):
                            product_result = await db.execute(
                                select(Product).where(Product.id == it.product_id, Product.owner_id == shopkeeper_id)
                            )
                            product = product_result.scalar_one_or_none()
                            if product:
                                product.stock_quantity += it.quantity
                                db.add(InventoryMovement(
                                    product_id=it.product_id, shopkeeper_id=shopkeeper_id,
                                    movement_type=MovementType.RETURN, quantity=it.quantity,
                                    reference=f"Order #{order.order_number} rejected",
                                ))
                                await log_activity(
                                    db=db, product_id=it.product_id, shopkeeper_id=shopkeeper_id,
                                    activity_type=ActivityType.RETURN,
                                    quantity=it.quantity,
                                    reference=f"Order #{order.order_number} rejected",
                                )
                        if order.customer_id:
                            cust_result = await db.execute(select(Customer).where(Customer.id == order.customer_id))
                            customer = cust_result.scalar_one_or_none()
                            if customer:
                                customer.credit_used = max(0, (customer.credit_used or 0) - order.total)
                        await create_notification(
                            db=db, user_id=shopkeeper_id, type=NotificationType.ORDER_REJECTED,
                            title="Order Rejected",
                            message=f"Order #{order.order_number} for ₹{order.total:.2f} has been rejected (stock returned)",
                            reference_id=order.id,
                        )
                    else:
                        await create_notification(
                            db=db, user_id=shopkeeper_id, type=NotificationType.ORDER_CANCELLED,
                            title="Order Cancelled",
                            message=f"Order #{order.order_number} for ₹{order.total:.2f} has been cancelled",
                            reference_id=order.id,
                        )

                order.status = new_status
                await db.commit()
                await db.refresh(order, ["items"])

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        logger.exception("IntegrityError updating status for order %s", order_id)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Database conflict updating order status")
    except DataError:
        await db.rollback()
        logger.exception("DataError updating status for order %s", order_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data in status update")
    except DBAPIError as exc:
        await db.rollback()
        logger.critical("DBAPIError updating status for order %s", order_id)
        print("=" * 80, flush=True)
        print("UPDATE ORDER STATUS FAILED — DBAPIError", flush=True)
        traceback.print_exc()
        print("=" * 80, flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {exc}")
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.critical("SQLAlchemyError updating status for order %s", order_id)
        print("=" * 80, flush=True)
        print("UPDATE ORDER STATUS FAILED — SQLAlchemyError", flush=True)
        traceback.print_exc()
        print("=" * 80, flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {exc}")
    except Exception as exc:
        await db.rollback()
        logger.critical("UNEXPECTED exception updating status for order %s", order_id)
        print("=" * 80, flush=True)
        print("UPDATE ORDER STATUS FAILED — UNEXPECTED EXCEPTION", flush=True)
        print("Exception Type:", type(exc).__name__)
        print("Exception Args:", exc.args)
        traceback.print_exc()
        print("=" * 80, flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {exc}")

    await invalidate_cache("dashboard:*")
    await _try_safe_emit(emit_order_status_changed, order.shopkeeper_id, order.id, order.status.value if hasattr(order.status, "value") else str(order.status))
    customers_by_id, products_by_id = await _enrich_orders(db, [order])
    return _order_to_response(order, customers_by_id, products_by_id)
