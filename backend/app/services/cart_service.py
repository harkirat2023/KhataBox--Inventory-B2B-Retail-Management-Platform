import random
import string

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.customer import Customer
from app.models.customer_cart import CartStatus, CustomerCart, CustomerCartItem
from app.models.inventory import InventoryMovement, MovementType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem
from app.models.store import Store
from app.schemas.customer_cart import CustomerCartItemResponse, CustomerCartResponse
from app.services.socketio_manager import emit_order_created


def generate_order_number() -> str:
    return "ORD-" + "".join(random.choices(string.digits, k=8))


def _build_cart_response(cart):
    return CustomerCartResponse(
        id=cart.id,
        customer_id=cart.customer_id,
        status=cart.status.value if hasattr(cart.status, "value") else str(cart.status),
        subtotal=cart.subtotal,
        discount=cart.discount,
        gst=cart.gst,
        total=cart.total,
        notes=cart.notes,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
        items=[
            CustomerCartItemResponse(
                id=it.id,
                product_id=it.product_id,
                product_name=it.product_name,
                sku=it.sku,
                unit_price=it.unit_price,
                quantity=it.quantity,
                total_price=it.total_price,
            )
            for it in (cart.items or [])
        ],
    )


def _build_cart_item_response(item):
    return CustomerCartItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=item.product_name,
        sku=item.sku,
        unit_price=item.unit_price,
        quantity=item.quantity,
        total_price=item.total_price,
    )


async def _get_customer(db, user_email):
    result = await db.execute(select(Customer).where(Customer.email == user_email))
    customer = result.scalar_one_or_none()
    if not customer:
        customer = Customer(
            email=user_email,
            company_name=user_email.split("@")[0],
            contact_person=user_email.split("@")[0],
            owner_id=0,
        )
        db.add(customer)
        await db.flush()
    return customer


async def _recalculate_totals(db, cart):
    items_result = await db.execute(select(CustomerCartItem).where(CustomerCartItem.cart_id == cart.id))
    all_items = items_result.scalars().all()
    if all_items:
        cart.subtotal = sum(it.total_price for it in all_items)
        cart.gst = cart.subtotal * 0.18
        cart.total = round(cart.subtotal + cart.gst, 2)
    else:
        cart.subtotal = 0
        cart.gst = 0
        cart.total = 0
    return all_items


async def _checkout_cart_impl(db, customer, cart, payment_method, notes, store_id=None):
    if not cart.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    shopkeeper_id = customer.owner_id
    store = None
    if store_id:
        store_result = await db.execute(select(Store).where(Store.id == store_id))
        store = store_result.scalar_one_or_none()
        if store:
            shopkeeper_id = store.owner_id
    if not store:
        store_result = await db.execute(select(Store).where(Store.owner_id == shopkeeper_id).limit(1))
        store = store_result.scalar_one_or_none()

    if payment_method == "credit":
        credit_remaining = customer.credit_limit - customer.credit_used
        if cart.total > credit_remaining:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Credit limit exceeded. Available: ₹{credit_remaining:.2f}, Order total: ₹{cart.total:.2f}",
            )

    out_of_stock = []
    for cart_item in cart.items:
        prod_result = await db.execute(select(Product).where(Product.id == cart_item.product_id))
        product = prod_result.scalar_one_or_none()
        if product:
            available = product.stock_quantity - product.reserved_quantity
            if available < cart_item.quantity:
                out_of_stock.append(f"{cart_item.product_name} (available: {available}, requested: {cart_item.quantity})")
    if out_of_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock: {'; '.join(out_of_stock)}",
        )

    b2c_status = OrderStatus.CONFIRMED if payment_method == "upi" else OrderStatus.COUNTER
    order = Order(
        order_number=generate_order_number(),
        shopkeeper_id=shopkeeper_id,
        customer_id=customer.id,
        payment_method=payment_method,
        status=b2c_status,
        is_b2c=True,
        subtotal=cart.subtotal,
        discount=cart.discount,
        gst=cart.gst,
        total=cart.total,
        notes=notes,
    )
    db.add(order)
    await db.flush()

    for cart_item in cart.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=cart_item.product_id,
            product_name=cart_item.product_name,
            quantity=cart_item.quantity,
            unit_price=cart_item.unit_price,
            total_price=cart_item.total_price,
        )
        db.add(order_item)

        product_result = await db.execute(select(Product).where(Product.id == cart_item.product_id))
        product = product_result.scalar_one_or_none()
        if product:
            movement = InventoryMovement(
                product_id=cart_item.product_id,
                shopkeeper_id=shopkeeper_id,
                movement_type=MovementType.RESERVE_OUT,
                quantity=-cart_item.quantity,
                reference=f"Cart #{cart.id} → Order {order.order_number}",
            )
            db.add(movement)

    if payment_method == "credit":
        customer.credit_used += cart.total

    cart.status = CartStatus.CHECKOUT
    await db.commit()
    await db.refresh(order, ["items"])

    if store:
        receipt = Receipt(
            receipt_number=f"RCPT-{order.id:08d}",
            order_id=order.id,
            shopkeeper_id=shopkeeper_id,
            customer_id=customer.id,
            store_id=store.id,
            payment_method=order.payment_method,
            subtotal=order.subtotal,
            discount=order.discount,
            taxes=order.gst,
            total_amount=order.total,
        )
        db.add(receipt)
        await db.flush()

        for order_item in order.items:
            db.add(
                ReceiptItem(
                    receipt_id=receipt.id,
                    order_item_id=order_item.id,
                    product_id=order_item.product_id,
                    product_name=order_item.product_name,
                    quantity=order_item.quantity,
                    unit_price=order_item.unit_price,
                    line_total=order_item.total_price,
                    taxes=order.gst,
                    discount=order.discount,
                )
            )

    await db.commit()
    await db.refresh(order, ["items"])

    cart.status = CartStatus.COMPLETED
    await db.commit()

    await emit_order_created(shopkeeper_id, {
        "order_id": order.id,
        "order_number": order.order_number,
        "total": order.total,
        "customer_email": customer.email,
    })

    return {
        "order": {
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status.value if hasattr(order.status, "value") else str(order.status),
            "total": order.total,
        },
        "message": "Order placed successfully",
    }


async def list_carts(db, user_email, page=None, page_size=None):
    customer = await _get_customer(db, user_email)
    if not customer:
        return [], None

    base_query = select(CustomerCart).where(CustomerCart.customer_id == customer.id).options(selectinload(CustomerCart.items)).order_by(CustomerCart.created_at.desc())
    total = None
    if page is not None and page_size is not None:
        count_result = await db.execute(select(func.count()).select_from(CustomerCart).where(CustomerCart.customer_id == customer.id))
        total = count_result.scalar()
        base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
    return [_build_cart_response(c) for c in result.scalars().all()], total


async def get_cart(db, cart_id, user_email):
    customer = await _get_customer(db, user_email)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    result = await db.execute(
        select(CustomerCart)
        .where(CustomerCart.id == cart_id, CustomerCart.customer_id == customer.id)
        .options(selectinload(CustomerCart.items))
    )
    cart = result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")
    return _build_cart_response(cart)


async def create_cart(db, user_email, payload):
    customer = await _get_customer(db, user_email)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    subtotal = sum(item.unit_price * item.quantity for item in payload.items)
    gst = subtotal * 0.18
    total = subtotal + gst

    cart = CustomerCart(
        customer_id=customer.id,
        status=CartStatus.ACTIVE,
        subtotal=subtotal,
        discount=0,
        gst=gst,
        total=total,
    )
    db.add(cart)
    await db.flush()

    created_items = []
    for item in payload.items:
        total_price = round(item.unit_price * item.quantity, 2)
        cart_item = CustomerCartItem(
            cart_id=cart.id,
            product_id=item.product_id,
            product_name=item.product_name,
            sku=item.sku,
            unit_price=item.unit_price,
            quantity=item.quantity,
            total_price=total_price,
        )
        db.add(cart_item)
        created_items.append(cart_item)

    await db.commit()
    await db.refresh(cart, ["items"])

    first_item = cart.items[0] if cart.items else None
    from app.schemas.customer_cart import CustomerCartAddResponse
    return CustomerCartAddResponse(
        cart=_build_cart_response(cart),
        item=_build_cart_item_response(first_item) if first_item else None,
        previous_item_exists=False,
        message="Cart created with item(s)",
    )


async def add_item(db, user_email, payload):
    customer = await _get_customer(db, user_email)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    cart_result = await db.execute(
        select(CustomerCart)
        .where(CustomerCart.customer_id == customer.id, CustomerCart.status == CartStatus.ACTIVE)
        .options(selectinload(CustomerCart.items))
        .order_by(CustomerCart.created_at.desc())
        .limit(1)
    )
    cart = cart_result.scalar_one_or_none()
    previous_exists = cart is not None

    # Single-store enforcement for B2C cart
    if cart and cart.items:
        first_prod = await db.execute(select(Product).where(Product.id == cart.items[0].product_id))
        first_product = first_prod.scalar_one_or_none()
        existing_store_id = first_product.store_id if first_product else None
        if existing_store_id:
            for item in payload.items:
                prod = await db.execute(select(Product).where(Product.id == item.product_id))
                product = prod.scalar_one_or_none()
                if product and product.store_id and product.store_id != existing_store_id:
                    s_result = await db.execute(select(Store.name).where(Store.id == product.store_id))
                    s_name = s_result.scalar_one_or_none() or "another store"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"This item belongs to '{s_name}'. Your cart only allows items from one store at a time. Please checkout or clear your cart first.",
                    )

    if not cart:
        cart = CustomerCart(
            customer_id=customer.id,
            status=CartStatus.ACTIVE,
            subtotal=0,
            discount=0,
            gst=0,
            total=0,
        )
        db.add(cart)
        await db.flush()

    created_items = []
    previous_item_exists = False
    for item in payload.items:
        total_price = round(item.unit_price * item.quantity, 2)

        if cart.id:
            existing_result = await db.execute(
                select(CustomerCartItem).where(
                    CustomerCartItem.cart_id == cart.id,
                    CustomerCartItem.product_id == item.product_id,
                )
            )
            existing_item = existing_result.scalar_one_or_none()
            if existing_item:
                existing_item.quantity += item.quantity
                existing_item.total_price = round(existing_item.unit_price * existing_item.quantity, 2)
                previous_item_exists = True
                created_items.append(existing_item)
                continue

        cart_item = CustomerCartItem(
            cart_id=cart.id,
            product_id=item.product_id,
            product_name=item.product_name,
            sku=item.sku,
            unit_price=item.unit_price,
            quantity=item.quantity,
            total_price=total_price,
        )
        db.add(cart_item)
        created_items.append(cart_item)

    await db.flush()
    await _recalculate_totals(db, cart)
    await db.commit()
    await db.refresh(cart, ["items"])

    first_item = created_items[0]
    from app.schemas.customer_cart import CustomerCartAddResponse
    return CustomerCartAddResponse(
        cart=_build_cart_response(cart),
        item=_build_cart_item_response(first_item),
        previous_item_exists=previous_item_exists,
        message="Item added to cart",
    )


async def update_item_quantity(db, cart_id, item_id, quantity, user_email):
    customer = await _get_customer(db, user_email)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    cart_result = await db.execute(
        select(CustomerCart).where(CustomerCart.id == cart_id, CustomerCart.customer_id == customer.id)
    )
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    item_result = await db.execute(
        select(CustomerCartItem).where(CustomerCartItem.id == item_id, CustomerCartItem.cart_id == cart.id)
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if quantity <= 0:
        await db.delete(item)
    else:
        item.quantity = quantity
        item.total_price = round(item.unit_price * quantity, 2)

    await db.flush()
    await _recalculate_totals(db, cart)
    await db.commit()

    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT, detail="Item removed from cart")

    await db.refresh(item)
    return _build_cart_item_response(item)


async def delete_item(db, cart_id, item_id, user_email, product_id=None):
    customer = await _get_customer(db, user_email)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    cart_result = await db.execute(
        select(CustomerCart).where(CustomerCart.id == cart_id, CustomerCart.customer_id == customer.id)
    )
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    if item_id > 0:
        item_result = await db.execute(
            select(CustomerCartItem).where(CustomerCartItem.id == item_id, CustomerCartItem.cart_id == cart.id)
        )
    elif product_id is not None:
        item_result = await db.execute(
            select(CustomerCartItem).where(CustomerCartItem.product_id == product_id, CustomerCartItem.cart_id == cart.id)
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    await db.delete(item)
    await db.flush()
    all_items = await _recalculate_totals(db, cart)
    if not all_items:
        cart.status = CartStatus.CANCELLED
    await db.commit()


async def checkout_active_cart(db, user_email, payload):
    customer = await _get_customer(db, user_email)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    cart_result = await db.execute(
        select(CustomerCart)
        .where(CustomerCart.customer_id == customer.id, CustomerCart.status == CartStatus.ACTIVE)
        .options(selectinload(CustomerCart.items))
        .order_by(CustomerCart.created_at.desc())
        .limit(1)
    )
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active cart found")

    payment_method = payload.payment_method or "credit"
    return await _checkout_cart_impl(db, customer, cart, payment_method, payload.notes, payload.store_id)


async def checkout_cart(db, cart_id, user_email, payload):
    customer = await _get_customer(db, user_email)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    cart_result = await db.execute(
        select(CustomerCart)
        .where(CustomerCart.id == cart_id, CustomerCart.customer_id == customer.id)
        .options(selectinload(CustomerCart.items))
    )
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    payment_method = payload.payment_method or "credit"
    return await _checkout_cart_impl(db, customer, cart, payment_method, payload.notes, payload.store_id)


async def delete_cart(db, cart_id, user_email):
    customer = await _get_customer(db, user_email)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    cart_result = await db.execute(
        select(CustomerCart).where(CustomerCart.id == cart_id, CustomerCart.customer_id == customer.id)
    )
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    items_result = await db.execute(
        select(CustomerCartItem).where(CustomerCartItem.cart_id == cart.id)
    )
    for item in items_result.scalars().all():
        await db.delete(item)

    await db.delete(cart)
    await db.commit()
