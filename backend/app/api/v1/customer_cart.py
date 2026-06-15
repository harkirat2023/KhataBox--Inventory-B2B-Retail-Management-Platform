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
from app.models.customer_cart import CartStatus, CustomerCart, CustomerCartItem
from app.models.inventory import InventoryMovement, MovementType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem
from app.models.store import Store
from app.models.user import User
from app.schemas.customer_cart import (
    CustomerCartAddResponse,
    CustomerCartCheckout,
    CustomerCartCreate,
    CustomerCartItemResponse,
    CustomerCartResponse,
)

router = APIRouter()


def generate_order_number() -> str:
    return "ORD-" + "".join(random.choices(string.digits, k=8))


@router.get("/", response_model=list[CustomerCartResponse])
async def list_carts(current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    """List all carts for current user (customer view)."""
    # First get the customer record for this user
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        return []

    result = await db.execute(
        select(CustomerCart)
        .where(CustomerCart.customer_id == customer.id)
        .options(selectinload(CustomerCart.items))
        .order_by(CustomerCart.created_at.desc())
    )
    carts = result.scalars().all()

    return [
        CustomerCartResponse(
            id=c.id,
            customer_id=c.customer_id,
            status=c.status.value if hasattr(c.status, "value") else str(c.status),
            subtotal=c.subtotal,
            discount=c.discount,
            gst=c.gst,
            total=c.total,
            notes=c.notes,
            created_at=c.created_at,
            updated_at=c.updated_at,
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
                for it in (c.items or [])
            ],
        )
        for c in carts
    ]


@router.get("/{cart_id}", response_model=CustomerCartResponse)
async def get_cart(cart_id: int, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    """Get a specific cart by ID."""
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
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


@router.post("/", response_model=CustomerCartAddResponse, status_code=status.HTTP_201_CREATED)
async def create_cart(payload: CustomerCartCreate, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    """Create a new cart with items."""
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    # Calculate totals
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

    # Add items
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

    # Return first item for response
    first_item = cart.items[0] if cart.items else None
    return CustomerCartAddResponse(
        cart=CustomerCartResponse(
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
        ),
        item=CustomerCartItemResponse(
            id=first_item.id,
            product_id=first_item.product_id,
            product_name=first_item.product_name,
            sku=first_item.sku,
            unit_price=first_item.unit_price,
            quantity=first_item.quantity,
            total_price=first_item.total_price,
        ),
        previous_item_exists=False,
        message="Cart created with item(s)",
    )


@router.post("/items", response_model=CustomerCartAddResponse)
async def add_item(payload: CustomerCartCreate, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    """Add item(s) to cart - creates cart if not exists."""
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    # Check for existing active cart
    cart_result = await db.execute(
        select(CustomerCart)
        .where(CustomerCart.customer_id == customer.id, CustomerCart.status == CartStatus.ACTIVE)
        .options(selectinload(CustomerCart.items))
        .order_by(CustomerCart.created_at.desc())
        .limit(1)
    )
    cart = cart_result.scalar_one_or_none()
    previous_exists = cart is not None

    if not cart:
        # Create new cart
        subtotal = 0
        gst = 0
        total = 0
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

    # Add items
    created_items = []
    previous_item_exists = False
    for item in payload.items:
        total_price = round(item.unit_price * item.quantity, 2)

        # Check if product already in cart
        if cart.id:
            existing_result = await db.execute(
                select(CustomerCartItem).where(
                    CustomerCartItem.cart_id == cart.id,
                    CustomerCartItem.product_id == item.product_id,
                )
            )
            existing_item = existing_result.scalar_one_or_none()
            if existing_item:
                # Update quantity
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

    # Recalculate totals
    await db.flush()
    items_result = await db.execute(
        select(CustomerCartItem).where(CustomerCartItem.cart_id == cart.id)
    )
    all_items = items_result.scalars().all()
    cart.subtotal = sum(it.total_price for it in all_items)
    cart.gst = cart.subtotal * 0.18
    cart.total = round(cart.subtotal + cart.gst, 2)

    await db.commit()
    await db.refresh(cart, ["items"])

    first_item = created_items[0]
    return CustomerCartAddResponse(
        cart=CustomerCartResponse(
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
        ),
        item=CustomerCartItemResponse(
            id=first_item.id,
            product_id=first_item.product_id,
            product_name=first_item.product_name,
            sku=first_item.sku,
            unit_price=first_item.unit_price,
            quantity=first_item.quantity,
            total_price=first_item.total_price,
        ),
        previous_item_exists=previous_item_exists,
        message="Item added to cart",
    )


@router.put("/{cart_id}/items/{item_id}", response_model=CustomerCartItemResponse)
async def update_item_quantity(
    cart_id: int, item_id: int, quantity: int, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)
):
    """Update item quantity in cart."""
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    # Verify cart belongs to customer
    cart_result = await db.execute(
        select(CustomerCart).where(CustomerCart.id == cart_id, CustomerCart.customer_id == customer.id)
    )
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    # Find and update item
    item_result = await db.execute(
        select(CustomerCartItem).where(CustomerCartItem.id == item_id, CustomerCartItem.cart_id == cart.id)
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if quantity <= 0:
        await db.delete(item)
        message = "Item removed from cart"
    else:
        item.quantity = quantity
        item.total_price = round(item.unit_price * quantity, 2)
        message = "Item quantity updated"

    # Recalculate totals
    await db.flush()
    items_result = await db.execute(
        select(CustomerCartItem).where(CustomerCartItem.cart_id == cart.id)
    )
    all_items = items_result.scalars().all()
    if all_items:
        cart.subtotal = sum(it.total_price for it in all_items)
        cart.gst = cart.subtotal * 0.18
        cart.total = round(cart.subtotal + cart.gst, 2)
    else:
        cart.subtotal = 0
        cart.gst = 0
        cart.total = 0

    await db.commit()

    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT, detail=message)

    await db.refresh(item)
    return CustomerCartItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=item.product_name,
        sku=item.sku,
        unit_price=item.unit_price,
        quantity=item.quantity,
        total_price=item.total_price,
    )


@router.delete("/{cart_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    cart_id: int, item_id: int, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)
):
    """Remove item from cart."""
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    # Verify cart belongs to customer
    cart_result = await db.execute(
        select(CustomerCart).where(CustomerCart.id == cart_id, CustomerCart.customer_id == customer.id)
    )
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    # Find and delete item
    item_result = await db.execute(
        select(CustomerCartItem).where(CustomerCartItem.id == item_id, CustomerCartItem.cart_id == cart.id)
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    await db.delete(item)

    # Recalculate totals
    await db.flush()
    items_result = await db.execute(
        select(CustomerCartItem).where(CustomerCartItem.cart_id == cart.id)
    )
    all_items = items_result.scalars().all()
    if all_items:
        cart.subtotal = sum(it.total_price for it in all_items)
        cart.gst = cart.subtotal * 0.18
        cart.total = round(cart.subtotal + cart.gst, 2)
    else:
        cart.subtotal = 0
        cart.gst = 0
        cart.total = 0
        cart.status = CartStatus.CANCELLED

    await db.commit()


@router.post("/checkout", response_model=dict)
async def checkout_active_cart(payload: CustomerCartCheckout, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    """Checkout the active cart for the current user."""
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    # Get active cart
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

    if not cart.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    # Check credit limit for credit orders
    payment_method = payload.payment_method or "credit"
    if payment_method == "credit":
        credit_remaining = customer.credit_limit - customer.credit_used
        if cart.total > credit_remaining:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Credit limit exceeded. Available: ₹{credit_remaining:.2f}, Order total: ₹{cart.total:.2f}",
            )

    # Create order from cart
    order = Order(
        order_number=generate_order_number(),
        shopkeeper_id=customer.owner_id,
        customer_id=customer.id,
        payment_method=payment_method,
        subtotal=cart.subtotal,
        discount=cart.discount,
        gst=cart.gst,
        total=cart.total,
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    # Transfer items to order
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

        # Create inventory movement (reserve stock)
        product_result = await db.execute(select(Product).where(Product.id == cart_item.product_id))
        product = product_result.scalar_one_or_none()
        if product:
            movement = InventoryMovement(
                product_id=cart_item.product_id,
                shopkeeper_id=customer.owner_id,
                movement_type=MovementType.RESERVE_OUT,
                quantity=-cart_item.quantity,
                reference=f"Cart #{cart.id} → Order {order.order_number}",
            )
            db.add(movement)

    # Update credit usage
    if payment_method == "credit":
        customer.credit_used += cart.total

    # Update cart status
    cart.status = CartStatus.CHECKOUT
    await db.commit()
    await db.refresh(order, ["items"])

    # Generate receipt
    store_result = await db.execute(select(Store).where(Store.owner_id == customer.owner_id).limit(1))
    store = store_result.scalar_one_or_none()
    if store:
        receipt = Receipt(
            receipt_number=f"RCPT-{order.id:08d}",
            order_id=order.id,
            shopkeeper_id=customer.owner_id,
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

    # Mark cart as completed
    cart.status = CartStatus.COMPLETED
    await db.commit()

    return {
        "order": {
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status.value if hasattr(order.status, "value") else str(order.status),
            "total": order.total,
        },
        "message": "Order placed successfully",
    }


@router.post("/{cart_id}/checkout", response_model=dict)
async def checkout_cart(cart_id: int, payload: CustomerCartCheckout, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    """Convert cart to order and checkout."""
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    # Get cart with items
    cart_result = await db.execute(
        select(CustomerCart)
        .where(CustomerCart.id == cart_id, CustomerCart.customer_id == customer.id)
        .options(selectinload(CustomerCart.items))
    )
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    if not cart.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    # Check credit limit for credit orders
    payment_method = payload.payment_method or "credit"
    if payment_method == "credit":
        credit_remaining = customer.credit_limit - customer.credit_used
        if cart.total > credit_remaining:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Credit limit exceeded. Available: ₹{credit_remaining:.2f}, Order total: ₹{cart.total:.2f}",
            )

    # Create order from cart
    order = Order(
        order_number=generate_order_number(),
        shopkeeper_id=customer.owner_id,
        customer_id=customer.id,
        payment_method=payment_method,
        subtotal=cart.subtotal,
        discount=cart.discount,
        gst=cart.gst,
        total=cart.total,
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    # Transfer items to order
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

        # Create inventory movement (reserve stock)
        product_result = await db.execute(select(Product).where(Product.id == cart_item.product_id))
        product = product_result.scalar_one_or_none()
        if product:
            movement = InventoryMovement(
                product_id=cart_item.product_id,
                shopkeeper_id=customer.owner_id,
                movement_type=MovementType.RESERVE_OUT,
                quantity=-cart_item.quantity,
                reference=f"Cart #{cart.id} → Order {order.order_number}",
            )
            db.add(movement)

    # Update credit usage
    if payment_method == "credit":
        customer.credit_used += cart.total

    # Update cart status
    cart.status = CartStatus.CHECKOUT
    await db.commit()
    await db.refresh(order, ["items"])

    # Generate receipt
    store_result = await db.execute(select(Store).where(Store.owner_id == customer.owner_id).limit(1))
    store = store_result.scalar_one_or_none()
    if store:
        receipt = Receipt(
            receipt_number=f"RCPT-{order.id:08d}",
            order_id=order.id,
            shopkeeper_id=customer.owner_id,
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

    # Mark cart as completed
    cart.status = CartStatus.COMPLETED
    await db.commit()

    return {
        "order": {
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status.value if hasattr(order.status, "value") else str(order.status),
            "total": order.total,
        },
        "message": "Order placed successfully",
    }


@router.delete("/{cart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cart(cart_id: int, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    """Delete a cart."""
    cust_result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")

    cart_result = await db.execute(
        select(CustomerCart).where(CustomerCart.id == cart_id, CustomerCart.customer_id == customer.id)
    )
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    # Delete items first (cascade should handle this, but being explicit)
    await db.execute(
        select(CustomerCartItem).where(CustomerCartItem.cart_id == cart.id)
    )
    items_result = await db.execute(
        select(CustomerCartItem).where(CustomerCartItem.cart_id == cart.id)
    )
    for item in items_result.scalars().all():
        await db.delete(item)

    await db.delete(cart)
    await db.commit()