"""Seed script: populates DB with sample data for all 11 tables."""
import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, text

from app.core.database import async_session, engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.customer import Customer
from app.models.order import Order, OrderItem, OrderStatus, PaymentMethod
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem, POStatus
from app.models.inventory import InventoryMovement, MovementType, StockTransfer, StockTransferStatus
from app.models.notification import Notification, NotificationType
from app.models.invoice import Invoice
from app.models.store import Store


CATEGORIES = ["electronics", "groceries", "clothing", "medicines", "stationery"]
BRANDS = {
    "electronics": ["Samsung", "LG", "Sony", "Bajaj", "Philips"],
    "groceries": ["Tata", "Britannia", "Nestle", "Amul", "Patanjali"],
    "clothing": ["Levi's", "Nike", "Adidas", "Zara", "H&M"],
    "medicines": ["Cipla", "Sun Pharma", "Dr Reddy's", "Pfizer", "GSK"],
    "stationery": ["Parker", "Camlin", "Classmate", "Navneet", "Linc"],
}
PRODUCT_NAMES = {
    "electronics": ["Bluetooth Speaker", "LED Bulb", "Power Bank", "USB Cable", "Headphones", "Mouse", "Keyboard", "Monitor", "Webcam", "Router"],
    "groceries": ["Basmati Rice 1kg", "Wheat Flour 5kg", "Sugar 1kg", "Cooking Oil 1L", "Tea 250g", "Coffee 100g", "Salt 1kg", "Spices Mix", "Dal 1kg", "Biscuits"],
    "clothing": ["Cotton T-Shirt", "Denim Jeans", "Formal Shirt", "Casual Shoes", "Jacket", "Sweater", "Trousers", "Belt", "Cap", "Scarf"],
    "medicines": ["Paracetamol 500mg", "Vitamin C Tablets", "Cough Syrup", "Antacid", "Band Aid", "Multivitamin", "Pain Balm", "Eye Drops", "Allergy Relief", "Antiseptic Cream"],
    "stationery": ["Ball Pen", "Pencil Box", "Notebook 100pg", "Eraser Pack", "Sharpener", "Ruler", "Sketch Pen Set", "Glue Stick", "Marker Set", "Paper Pack"],
}


async def seed():
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == "admin@khatabox.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@khatabox.com",
                password_hash=hash_password("Admin@123"),
                name="Admin User",
                role=UserRole.ADMIN,
                store_name="KhataBox Main Store",
                phone="9876543210",
            )
            session.add(admin)
            await session.flush()

        result = await session.execute(select(User).where(User.email == "shop@khatabox.com"))
        shopkeeper = result.scalar_one_or_none()
        if not shopkeeper:
            shopkeeper = User(
                email="shop@khatabox.com",
                password_hash=hash_password("Shop@123"),
                name="Shop Keeper",
                role=UserRole.SHOPKEEPER,
                store_name="KhataBox Retail Outlet",
                phone="9876543211",
            )
            session.add(shopkeeper)
            await session.flush()

        await session.execute(text("DELETE FROM stock_transfers"))
        await session.execute(text("DELETE FROM inventory_movements"))
        await session.execute(text("DELETE FROM order_items"))
        await session.execute(text("DELETE FROM invoices"))
        await session.execute(text("DELETE FROM orders"))
        await session.execute(text("DELETE FROM purchase_order_items"))
        await session.execute(text("DELETE FROM purchase_orders"))
        await session.execute(text("DELETE FROM notifications"))
        await session.execute(text("DELETE FROM products"))
        await session.execute(text("DELETE FROM stores"))
        await session.execute(text("DELETE FROM suppliers"))
        await session.execute(text("DELETE FROM customers"))

        stores_list = []
        store_names = ["Main Store", "Branch Store", "Warehouse"]
        for sname in store_names:
            s = Store(name=sname, address=f"123, {sname} Road", owner_id=admin.id)
            session.add(s)
            stores_list.append(s)
        await session.flush()

        products = []
        for cat in CATEGORIES:
            names = PRODUCT_NAMES[cat]
            brands = BRANDS[cat]
            for i, name in enumerate(names):
                cost = {"electronics": 500, "groceries": 80, "clothing": 600, "medicines": 100, "stationery": 50}[cat] + random.randint(-20, 50)
                margin = random.uniform(0.2, 0.5)
                stock = random.randint(5, 120)
                batch = None
                mfg = None
                exp = None
                if cat in ("medicines", "groceries"):
                    batch = f"BATCH-{cat[:3].upper()}-{i+1:03d}"
                    mfg = datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))
                    exp = mfg + timedelta(days=random.choice([180, 365, 730]))
                    mfg = mfg.date()
                    exp = exp.date()
                p = Product(
                    name=name,
                    sku=f"{cat[:3].upper()}-{i+1:03d}",
                    category=cat,
                    brand=random.choice(brands),
                    cost_price=round(cost, 2),
                    selling_price=round(cost * (1 + margin), 2),
                    stock_quantity=stock,
                    reorder_threshold=random.choice([5, 10, 15, 20]),
                    batch_number=batch,
                    mfg_date=mfg,
                    expiry_date=exp,
                    store_id=random.choice(stores_list).id,
                    owner_id=admin.id,
                )
                session.add(p)
                products.append(p)
        await session.flush()

        suppliers = []
        supplier_names = ["Global Distributors", "Prime Suppliers", "Quality Goods Co.", "Metro Traders", "United Wholesale", "City Supply Chain", "Elite Exports", "Royal Traders"]
        for name in supplier_names:
            s = Supplier(name=name, contact_person=f"Contact of {name}", email=name.lower().replace(" ", ".") + "@supplier.com", phone=f"99{random.randint(10000000,99999999)}", address=f"{random.randint(1,100)}, {name} Street", owner_id=admin.id)
            session.add(s)
            suppliers.append(s)
        await session.flush()

        customers = []
        customer_data = [
            ("Tech Corp", "100000", "premium"),
            ("Green Grocers", "25000", "standard"),
            ("Fashion Hub", "75000", "premium"),
            ("MediCare Plus", "50000", "standard"),
            ("Stationery World", "30000", "standard"),
        ]
        for comp, limit, tier in customer_data:
            c = Customer(company_name=comp, contact_person=f"Manager at {comp}", email=comp.lower().replace(" ", ".") + "@client.com", phone=f"98{random.randint(10000000,99999999)}", gst_number=f"27AABCU{random.randint(1000,9999)}D1Z5", credit_limit=float(limit), credit_used=random.randint(0, int(limit) // 2), price_tier=tier, owner_id=admin.id)
            session.add(c)
            customers.append(c)
            cust_email = comp.lower().replace(" ", ".") + "@client.com"
            existing = await session.execute(select(User).where(User.email == cust_email))
            if not existing.scalar_one_or_none():
                cust_user = User(email=cust_email, password_hash=hash_password("customer123"), name=f"Manager at {comp}", role=UserRole.CUSTOMER)
                session.add(cust_user)
        await session.flush()

        for _ in range(30):
            p = random.choice(products)
            qty = random.randint(1, 20)
            unit_price = p.selling_price + random.uniform(-5, 5)
            total_price = round(qty * unit_price, 2)
            customer = random.choice(customers) if random.random() > 0.3 else None
            days_ago = random.randint(0, 60)
            created = datetime.now(timezone.utc) - timedelta(days=days_ago)
            status = random.choice(list(OrderStatus))
            o = Order(
                order_number=f"ORD-{random.randint(10000,99999)}",
                shopkeeper_id=admin.id,
                customer_id=customer.id if customer else None,
                status=status,
                payment_method=random.choice(list(PaymentMethod)),
                subtotal=total_price,
                discount=round(random.uniform(0, total_price * 0.1), 2),
                gst=round(total_price * 0.18, 2),
                total=round(total_price * 1.18 - random.uniform(0, total_price * 0.1), 2),
                created_at=created,
                updated_at=created + timedelta(hours=random.randint(1, 24)),
            )
            session.add(o)
            await session.flush()
            oi = OrderItem(order_id=o.id, product_id=p.id, product_name=p.name, quantity=qty, unit_price=round(unit_price, 2), total_price=total_price)
            session.add(oi)

            inv = InventoryMovement(product_id=p.id, shopkeeper_id=admin.id, store_id=p.store_id, movement_type=MovementType.SALE, quantity=-qty, reference=f"Order {o.order_number}", created_at=created)
            session.add(inv)
        await session.flush()

        for _ in range(10):
            supplier = random.choice(suppliers)
            items = []
            total = 0
            for _ in range(random.randint(1, 5)):
                p = random.choice(products)
                qty = random.randint(10, 100)
                unit_price = p.cost_price * random.uniform(0.8, 0.95)
                total_price = round(qty * unit_price, 2)
                total += total_price
                items.append({"product_id": p.id, "product_name": p.name, "quantity": qty, "unit_price": round(unit_price, 2), "total_price": total_price})
            days_ago = random.randint(0, 45)
            created = datetime.now(timezone.utc) - timedelta(days=days_ago)
            po = PurchaseOrder(
                po_number=f"PO-{random.randint(10000,99999)}",
                supplier_id=supplier.id,
                shopkeeper_id=admin.id,
                status=random.choice(list(POStatus)),
                total=round(total, 2),
                created_at=created,
                updated_at=created + timedelta(hours=random.randint(1, 12)),
            )
            session.add(po)
            await session.flush()
            for item in items:
                poi = PurchaseOrderItem(purchase_order_id=po.id, **item)
                session.add(poi)
        await session.flush()

        if len(stores_list) >= 2:
            transfer_tx = 0
            for _ in range(3):
                src = random.choice(stores_list)
                dst = random.choice([s for s in stores_list if s.id != src.id])
                p = random.choice(products)
                qty = random.randint(5, 20)
                if p.stock_quantity >= qty:
                    p.stock_quantity -= qty
                    st = StockTransfer(
                        product_id=p.id,
                        from_store_id=src.id,
                        to_store_id=dst.id,
                        quantity=qty,
                        status=random.choice([StockTransferStatus.COMPLETED, StockTransferStatus.APPROVED, StockTransferStatus.PENDING]),
                        requested_by=admin.id,
                        approved_by=admin.id if random.random() > 0.3 else None,
                        notes=f"Seed transfer batch {_+1}",
                        created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10)),
                    )
                    session.add(st)
                    await session.flush()
                    out_mov = InventoryMovement(product_id=p.id, shopkeeper_id=admin.id, store_id=src.id, movement_type=MovementType.TRANSFER_OUT, quantity=-qty, reference=f"StockTransfer-{st.id}", created_at=st.created_at)
                    session.add(out_mov)
                    if st.status in (StockTransferStatus.COMPLETED, StockTransferStatus.APPROVED):
                        in_mov = InventoryMovement(product_id=p.id, shopkeeper_id=admin.id, store_id=dst.id, movement_type=MovementType.TRANSFER_IN, quantity=qty, reference=f"StockTransfer-{st.id}", created_at=st.created_at)
                        session.add(in_mov)
                    transfer_tx += 1

        notification_configs = [
            (NotificationType.LOW_STOCK, "Low Stock Alert", "Paracetamol 500mg is running low (5 units remaining)"),
            (NotificationType.EXPIRY, "Expiry Warning", "5 products will expire in the next 30 days"),
            (NotificationType.PAYMENT_REMINDER, "Payment Due", "Tech Corp has an outstanding balance of ₹12,500"),
            (NotificationType.AI_RECOMMENDATION, "Restock Suggestion", "Consider restocking Electronics - demand forecast shows 20% increase"),
            (NotificationType.LOW_STOCK, "Low Stock Alert", "Basmati Rice 1kg has only 8 units left"),
            (NotificationType.AI_RECOMMENDATION, "Seasonal Trend", "Clothing demand expected to rise 35% next month"),
        ]
        for ntype, title, msg in notification_configs:
            n = Notification(
                user_id=admin.id,
                type=ntype,
                title=title,
                message=msg,
                is_read=random.random() > 0.5,
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72)),
            )
            session.add(n)
        await session.commit()

        print(f"Seeded: {len(products)} products, {len(suppliers)} suppliers, {len(customers)} customers, 30 orders, 10 purchase orders, {transfer_tx} transfers, 6 notifications")
        print(f"Users: admin@khatabox.com / Admin@123, shop@khatabox.com / Shop@123")


if __name__ == "__main__":
    asyncio.run(seed())
