"""Debug the order creation 500 error by running business logic directly."""
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import async_session
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.inventory import InventoryMovement, MovementType
from app.models.user import User
from app.schemas.order import OrderCreate, OrderItemCreate, OrderResponse
from app.core.security import verify_password

async def debug():
    async with async_session() as session:
        # Get admin user
        r = await session.execute(select(User).where(User.email == "admin@khatabox.com"))
        admin = r.scalar_one_or_none()
        print(f"Admin: {admin.id} {admin.email}")
        
        # Get a product
        r = await session.execute(select(Product).limit(1))
        product = r.scalar_one_or_none()
        print(f"Product: {product.id} {product.name} stock={product.stock_quantity}")
        
        # Try creating an order manually
        import random, string
        order_number = "ORD-DEBUG-" + "".join(random.choices(string.digits, k=6))
        
        order = Order(
            order_number=order_number,
            shopkeeper_id=admin.id,
            customer_id=None,
            payment_method="cash",
            subtotal=product.selling_price * 2,
            discount=0,
            gst=round(product.selling_price * 2 * 0.18, 2),
            total=round(product.selling_price * 2 * 1.18, 2),
            notes="Debug order",
        )
        session.add(order)
        await session.flush()
        print(f"Order created: ID={order.id}, Number={order.order_number}")
        
        item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=2,
            unit_price=product.selling_price,
            total_price=product.selling_price * 2,
        )
        session.add(item)
        
        product.stock_quantity -= 2
        movement = InventoryMovement(
            product_id=product.id,
            shopkeeper_id=admin.id,
            movement_type=MovementType.SALE,
            quantity=-2,
            reference=f"Order #{order.order_number}",
        )
        session.add(movement)
        
        await session.commit()
        
        # Now try refresh and validate
        await session.refresh(order)
        print(f"Order after refresh: ID={order.id}")
        print(f"  items attr exists: {hasattr(order, 'items')}")
        
        try:
            # Try accessing items directly
            items = order.items
            print(f"  items value: {items}")
        except Exception as e:
            print(f"  items access error: {e}")
        
        try:
            # Try model_validate
            result = OrderResponse.model_validate(order)
            print(f"  Validate OK: {result.order_number}")
        except Exception as e:
            print(f"  Validate error: {e}")
        
        # Cleanup
        await session.rollback()
        print("Rolled back debug order")

asyncio.run(debug())
