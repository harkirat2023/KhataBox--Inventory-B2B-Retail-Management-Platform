"""
One-time demo data seeder for KhataBox.

Idempotent — safe to run multiple times. Uses email (for users),
SKU (for products), and store name (for stores) as unique identifiers.
Skips existing records gracefully.

Usage:
    python backend/scripts/seed_demo_data.py
"""

import asyncio
import random
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
import os
import sys

# Ensure project root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from faker import Faker
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session, engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.store import Store
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.customer import Customer
from app.models.order import Order, OrderItem, OrderStatus, PaymentMethod
from app.models.invoice import Invoice
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem, POStatus
from app.models.inventory import InventoryMovement, MovementType, StockTransfer, StockTransferStatus
from app.models.notification import Notification, NotificationType
from app.models.audit_log import AuditLog
from app.models.seed_product import SeedProduct

fake = Faker("en_IN")
Faker.seed(42)
random.seed(42)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
GST_RATES = {"standard": 0.18, "reduced": 0.12, "low": 0.05, "nil": 0.0}

INDIAN_CITIES = [
    ("Mumbai", "Maharashtra"), ("Delhi", "Delhi"), ("Bangalore", "Karnataka"),
    ("Hyderabad", "Telangana"), ("Ahmedabad", "Gujarat"), ("Chennai", "Tamil Nadu"),
    ("Kolkata", "West Bengal"), ("Pune", "Maharashtra"), ("Jaipur", "Rajasthan"),
    ("Lucknow", "Uttar Pradesh"), ("Surat", "Gujarat"), ("Indore", "Madhya Pradesh"),
    ("Bhopal", "Madhya Pradesh"), ("Chandigarh", "Punjab"), ("Patna", "Bihar"),
    ("Amritsar", "Punjab"), ("Nagpur", "Maharashtra"), ("Thane", "Maharashtra"),
]

# ---- Shopkeepers ----
SHOPKEEPER_DATA = [
    ("Aman Kirana Store", "Aman Verma", "aman@khatabox.com", "9876543210", "kirana"),
    ("Gupta General Store", "Rajesh Gupta", "gupta@khatabox.com", "9876543211", "kirana"),
    ("Sharma Super Mart", "Vikram Sharma", "sharma@khatabox.com", "9876543212", "supermart"),
    ("Punjab Grocers", "Harpreet Singh", "punjab@khatabox.com", "9876543213", "supermart"),
    ("Fresh Basket", "Priya Patel", "fresh@khatabox.com", "9876543214", "kirana"),
    ("City Medicos", "Dr. Suresh Kumar", "medicos@khatabox.com", "9876543215", "pharmacy"),
    ("Daily Needs Store", "Mohan Lal", "daily@khatabox.com", "9876543216", "kirana"),
    ("Patel Provision Store", "Amit Patel", "patel@khatabox.com", "9876543217", "kirana"),
    ("Royal Bakers", "Gurpreet Kaur", "royal@khatabox.com", "9876543218", "restaurant"),
    ("Green Mart", "Sunil Reddy", "green@khatabox.com", "9876543219", "supermart"),
    ("Singh Electronics", "Balwinder Singh", "singh.elec@khatabox.com", "9876543220", "electronics"),
    ("Kapoor Fashion Store", "Neha Kapoor", "kapoor@khatabox.com", "9876543221", "clothing"),
    ("Verma Book Depot", "Ravi Verma", "verma@khatabox.com", "9876543222", "other"),
    ("Joshi Medical Store", "Dr. Anand Joshi", "joshi@khatabox.com", "9876543223", "pharmacy"),
    ("Desi Bazaar", "Karan Mehta", "desi@khatabox.com", "9876543224", "kirana"),
]

CITY_ASSIGNMENTS = [
    ("Delhi", "Delhi"), ("Mumbai", "Maharashtra"), ("Chandigarh", "Punjab"),
    ("Amritsar", "Punjab"), ("Pune", "Maharashtra"), ("Hyderabad", "Telangana"),
    ("Jaipur", "Rajasthan"), ("Lucknow", "Uttar Pradesh"), ("Bangalore", "Karnataka"),
    ("Bengaluru", "Karnataka"), ("Chennai", "Tamil Nadu"), ("Ahmedabad", "Gujarat"),
    ("Surat", "Gujarat"), ("Indore", "Madhya Pradesh"), ("Nagpur", "Maharashtra"),
]

# ---- Customers ----
CUSTOMER_DATA = [
    ("Rajesh Traders", "Rajesh Agrawal", "rajesh.trader@client.com", "9988776655", 50000),
    ("Priya Enterprises", "Priya Sharma", "priya.enterprise@client.com", "9988776656", 75000),
    ("Singh Brothers", "Amar Singh", "singh.bros@client.com", "9988776657", 100000),
    ("Desi Wholesale", "Manoj Yadav", "desi.whole@client.com", "9988776658", 60000),
    ("Gupta Distributors", "Sunil Gupta", "gupta.dist@client.com", "9988776659", 80000),
    ("Khan & Sons", "Imran Khan", "khan.sons@client.com", "9988776660", 45000),
    ("Mehta General Store", "Rohit Mehta", "mehta.general@client.com", "9988776661", 35000),
    ("Green Valley Retail", "Anita Desai", "green.retail@client.com", "9988776662", 55000),
    ("City Mart", "Vikas Jain", "city.mart@client.com", "9988776663", 90000),
    ("Om Trading Co", "Shyam Sundar", "om.trading@client.com", "9988776664", 40000),
    ("New Bharat Stores", "Dinesh Kumar", "bharat.store@client.com", "9988776665", 70000),
    ("Apex Retail", "Sneha Reddy", "apex.retail@client.com", "9988776666", 65000),
]

# ---- Suppliers ----
SUPPLIER_DATA = [
    ("Hindustan Unilever Ltd", "Amit Shah", "amit.shah@hul.com", "9123456701"),
    ("Britannia Industries", "Pooja Mehta", "pooja.mehta@britannia.com", "9123456702"),
    ("ITC Limited", "Rahul Verma", "rahul.verma@itc.in", "9123456703"),
    ("Nestle India Pvt Ltd", "Kiran Rao", "kiran.rao@nestle.com", "9123456704"),
    ("Tata Consumer Products", "Vikram Seth", "vikram.seth@tata.com", "9123456705"),
    ("Patanjali Ayurved", "Yogi Sharma", "yogi.sharma@patanjali.com", "9123456706"),
    ("Amul Dairy", "Natwar Patel", "natwar.patel@amul.com", "9123456707"),
    ("Parle Products", "Suresh Kamath", "suresh.kamath@parle.com", "9123456708"),
    ("PepsiCo India", "Neha Kapur", "neha.kapur@pepsico.com", "9123456709"),
    ("Coca-Cola India", "Raj Malhotra", "raj.malhotra@cocacola.com", "9123456710"),
    ("Godrej Consumer", "Anil Joshi", "anil.joshi@godrej.com", "9123456711"),
    ("Marico Limited", "Deepak Shah", "deepak.shah@marico.com", "9123456712"),
    ("Dabur India Ltd", "Sonia Gupta", "sonia.gupta@dabur.com", "9123456713"),
    ("Cipla Limited", "Dr. Sanjay Desai", "sanjay.desai@cipla.com", "9123456714"),
    ("Asian Paints", "Rakesh Bhardwaj", "rakesh.bhardwaj@asianpaints.com", "9123456715"),
]

# ---- Complete Product Catalog ----
PRODUCT_CATALOG = {
    "Groceries & Staples": {
        "gst": "low",
        "brands": ["Tata", "Britannia", "Nestle", "Amul", "Patanjali", "Fortune", "Aashirvaad"],
        "products": [
            ("Basmati Rice 1kg", 60, 120), ("Basmati Rice 5kg", 290, 550), ("Sonam Masoori Rice 5kg", 200, 380),
            ("Wheat Flour (Atta) 5kg", 140, 260), ("Wheat Flour (Atta) 10kg", 275, 499),
            ("Sugar 1kg", 38, 48), ("Sugar 5kg", 185, 235), ("Salt 1kg", 12, 25),
            ("Toor Dal 1kg", 85, 150), ("Moong Dal 1kg", 70, 130), ("Chana Dal 1kg", 55, 110),
            ("Masoor Dal 1kg", 65, 120), ("Refined Oil 1L", 120, 195), ("Mustard Oil 1L", 150, 230),
            ("Ghee 500ml", 225, 380), ("Tea 250g", 120, 225), ("Coffee 100g", 150, 295),
            ("Biscuits Pack 200g", 25, 50), ("Turmeric Powder 100g", 25, 50), ("Red Chilli Powder 100g", 30, 65),
        ]
    },
    "Beverages": {
        "gst": "reduced",
        "brands": ["Coca-Cola", "Pepsi", "Dabur", "Real", "Paper Boat", "Bisleri", "Kinley"],
        "products": [
            ("Coca-Cola 750ml", 25, 45), ("Pepsi 750ml", 25, 45), ("Sprite 750ml", 25, 45),
            ("Maaza Mango Drink 1L", 40, 75), ("Real Fruit Juice 1L", 65, 120),
            ("Bisleri Water 1L", 12, 20), ("Packaged Coconut Water 200ml", 25, 55),
            ("Energy Drink 250ml", 50, 100), ("Chaas (Buttermilk) 1L", 25, 50),
            ("Lassi 1L", 40, 80), ("Green Tea 25 bags", 75, 150),
        ]
    },
    "Electronics": {
        "gst": "standard",
        "brands": ["Samsung", "LG", "Sony", "Bajaj", "Philips", "Panasonic", "Havells"],
        "products": [
            ("LED Bulb 9W", 45, 85), ("LED Bulb 12W", 55, 110), ("LED Tube Light 20W", 180, 320),
            ("Table Fan", 850, 1499), ("Ceiling Fan", 1200, 2200),
            ("Electric Kettle 1.5L", 450, 895), ("Mixer Grinder 750W", 1800, 3200),
            ("Extension Board 6-way", 150, 350), ("Power Bank 10000mAh", 500, 999),
            ("Bluetooth Speaker", 600, 1299), ("Wired Mouse", 150, 350), ("Wireless Mouse", 350, 699),
            ("HDMI Cable 2m", 120, 299), ("Mobile Cover", 50, 199),
        ]
    },
    "Medicines & Wellness": {
        "gst": "reduced",
        "brands": ["Cipla", "Sun Pharma", "Dr Reddy's", "Pfizer", "GSK", "Abbott", "Zydus"],
        "products": [
            ("Paracetamol 500mg Strip 15", 10, 35), ("Paracetamol 650mg Strip 15", 12, 40),
            ("Vitamin C Tablets 60", 45, 120), ("Multivitamin Tablets 30", 60, 150),
            ("Cough Syrup 100ml", 35, 85), ("Antacid Tablets Strip 10", 15, 40),
            ("Band Aid Pack 20", 20, 50), ("Dettol Antiseptic 200ml", 55, 115),
            ("Pain Balm 30g", 30, 75), ("Sanitizer 500ml", 60, 130),
            ("Surgical Mask Box 50", 150, 350), ("Thermometer Digital", 60, 150),
        ]
    },
    "Clothing & Fashion": {
        "gst": "reduced",
        "brands": ["Levi's", "Nike", "Adidas", "Zara", "H&M", "Puma", "Raymond", "Peter England"],
        "products": [
            ("Cotton T-Shirt Men", 250, 599), ("Polo T-Shirt Men", 350, 799), ("Formal Shirt Men", 400, 999),
            ("Jeans Men", 600, 1499), ("Kurta Women", 450, 999), ("Saree", 400, 1999),
            ("Kids T-Shirt", 150, 399), ("Socks Pair Pack 3", 80, 199), ("Belt Men", 200, 499),
            ("Cap", 100, 299), ("Scarf", 150, 399), ("Lungi", 200, 399),
        ]
    },
    "Stationery & Office": {
        "gst": "reduced",
        "brands": ["Parker", "Camlin", "Classmate", "Navneet", "Linc", "Reynolds", "Faber-Castell"],
        "products": [
            ("Ball Pen Blue Pack 10", 30, 75), ("Gel Pen Pack 5", 50, 120),
            ("Pencil HB Pack 10", 20, 50), ("Notebook 100pg Ruled", 25, 60),
            ("Notebook 200pg Ruled", 45, 100), ("Eraser Pack 5", 15, 35),
            ("Geometry Box", 50, 150), ("Paper Pack A4 500", 150, 350),
            ("Stapler Small", 45, 120), ("File Folder", 15, 40),
        ]
    },
    "Personal Care & Beauty": {
        "gst": "standard",
        "brands": ["Hindustan Unilever", "P&G", "L'Oreal", "Dove", "Nivea", "Lakme", "Garnier"],
        "products": [
            ("Bathing Soap Pack 3", 60, 135), ("Hand Wash 250ml", 60, 140), ("Shampoo 200ml", 80, 180),
            ("Toothpaste 150g", 60, 140), ("Toothbrush Pack 2", 40, 100),
            ("Deodorant Spray 150ml", 120, 280), ("Body Lotion 200ml", 120, 260),
            ("Face Cream 50g", 100, 250), ("Face Wash 100g", 70, 165),
            ("Hair Oil 200ml", 80, 180), ("Sanitary Pad Pack 10", 30, 80),
        ]
    },
    "Home & Kitchen": {
        "gst": "standard",
        "brands": ["Prestige", "Hawkins", "Borosil", "Milton", "Cello", "Butterfly", "Vaya"],
        "products": [
            ("Steel Pressure Cooker 3L", 800, 1599), ("Non-Stick Fry Pan 24cm", 350, 750),
            ("Steel Kadai 20cm", 350, 699), ("Glass Bowl Set 3pc", 200, 450),
            ("Dinner Set 12pc", 500, 1299), ("Tiffin Box 2-tier", 200, 450),
            ("Water Bottle 1L", 100, 250), ("Steel Tumbler Set 6", 250, 550),
            ("Casserole 1.5L", 400, 850), ("Cutting Board Plastic", 80, 199),
            ("Knife Set 3pc", 150, 350), ("Mug Ceramic Set 4", 300, 699),
        ]
    },
}

STATUSES = ["pending", "completed", "cancelled", "rejected", "confirmed"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def exists(db: AsyncSession, model, **kwargs) -> bool:
    stmt = select(model).filter_by(**kwargs).limit(1)
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def get_or_none(db: AsyncSession, model, **kwargs):
    stmt = select(model).filter_by(**kwargs).limit(1)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_admin(db: AsyncSession, stats: dict):
    email = "admin@khatabox.com"
    if await exists(db, User, email=email, role=UserRole.ADMIN):
        stats["skipped"]["admin"] += 1
        return await get_or_none(db, User, email=email, role=UserRole.ADMIN)

    admin = User(
        email=email,
        password_hash=hash_password("Admin@123"),
        name="Super Admin",
        role=UserRole.ADMIN,
        phone="9999999999",
        is_active=True,
    )
    db.add(admin)
    await db.flush()
    stats["created"]["admin"] += 1
    return admin


async def create_shopkeepers(db: AsyncSession, stats: dict):
    created_count = 0
    for name, person, email, phone, store_type in SHOPKEEPER_DATA:
        if await exists(db, User, email=email, role=UserRole.SHOPKEEPER):
            stats["skipped"]["shopkeepers"] += 1
            continue

        user = User(
            email=email,
            password_hash=hash_password("Shop@123"),
            name=person,
            role=UserRole.SHOPKEEPER,
            phone=phone,
            store_name=name,
            is_active=True,
        )
        db.add(user)
        await db.flush()

        city, state = CITY_ASSIGNMENTS[random.randint(0, len(CITY_ASSIGNMENTS) - 1)]
        store = Store(
            name=name,
            store_type=store_type,
            address=f"{random.randint(1, 999)}, {fake.street_name()}, {city}",
            city=city,
            state=state,
            pin_code=str(random.randint(100000, 999999)),
            gst_number=f"27AABCU{random.randint(1000, 9999)}3{random.randint(1, 9)}Z{random.randint(0, 9)}",
            owner_id=user.id,
            is_active=True,
        )
        db.add(store)
        await db.flush()
        created_count += 1

    stats["created"]["shopkeepers"] = created_count


async def create_customers_for_user(db: AsyncSession, shopkeeper_id: int, stats: dict):
    for name, person, email, phone, limit_amt in CUSTOMER_DATA:
        # Each shopkeeper gets unique customer emails
        cust_email = f"{email.split('@')[0]}+{shopkeeper_id}@client.com"
        if await exists(db, Customer, email=cust_email, owner_id=shopkeeper_id):
            stats["skipped"]["customers"] += 1
            continue

        customer = Customer(
            company_name=name,
            contact_person=person,
            email=cust_email,
            phone=phone,
            credit_limit=float(limit_amt),
            credit_used=round(random.uniform(0, limit_amt * 0.6), 2),
            price_tier=random.choice(["standard", "premium", "wholesale"]),
            gst_number=f"27ABCDE{random.randint(1000, 9999)}1Z{random.randint(0, 9)}",
            owner_id=shopkeeper_id,
        )
        db.add(customer)
        await db.flush()
        stats["created"]["customers"] += 1


async def create_suppliers_for_user(db: AsyncSession, shopkeeper_id: int, stats: dict):
    for name, contact, email, phone in SUPPLIER_DATA:
        if await exists(db, Supplier, email=email, owner_id=shopkeeper_id):
            stats["skipped"]["suppliers"] += 1
            continue

        supplier = Supplier(
            name=name,
            contact_person=contact,
            email=email,
            phone=phone,
            address=f"{random.randint(1, 999)}, {fake.street_name()}, {random.choice(INDIAN_CITIES)[0]}",
            owner_id=shopkeeper_id,
        )
        db.add(supplier)
        await db.flush()
        stats["created"]["suppliers"] += 1


async def create_products_for_user(db: AsyncSession, shopkeeper_id: int, store_id: int, stats: dict):
    categories = list(PRODUCT_CATALOG.keys())
    product_idx = {cat: 0 for cat in categories}

    for cat_name, cat_data in PRODUCT_CATALOG.items():
        for prod_name, cost, sell in cat_data["products"]:
            sku = f"SKU-{shopkeeper_id}-{cat_name[:3].upper()}-{product_idx[cat_name]:04d}"
            product_idx[cat_name] += 1

            if await exists(db, Product, sku=sku, owner_id=shopkeeper_id):
                stats["skipped"]["products"] += 1
                continue

            brand = random.choice(cat_data["brands"])
            gst_rate = GST_RATES[cat_data["gst"]]
            stock = random.randint(15, 200)
            threshold = random.randint(5, 20)

            product = Product(
                product_uuid=str(uuid.uuid4()),
                name=prod_name,
                sku=sku,
                category=cat_name,
                brand=brand,
                description=f"{brand} {prod_name} — quality product",
                cost_price=float(cost),
                selling_price=float(sell),
                market_price=float(sell * 1.15),
                stock_quantity=stock,
                reorder_threshold=threshold,
                owner_id=shopkeeper_id,
                store_id=store_id,
                is_active=True,
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 365)),
            )
            db.add(product)
            await db.flush()
            stats["created"]["products"] += 1


async def create_orders_for_user(db: AsyncSession, shopkeeper_id: int, store_id: int, customers: list[int], products: list[dict], stats: dict):
    """Create 3-6 months of historical orders plus recent orders."""
    now = datetime.now(timezone.utc)
    order_idx = 1

    for days_ago in range(1, 180, random.randint(1, 3)):
        order_date = now - timedelta(days=days_ago)
        num_items = random.randint(1, 5)
        selected_products = random.sample(products, min(num_items, len(products)))
        status = random.choices(
            ["completed", "completed", "completed", "cancelled", "pending"],
            weights=[50, 30, 10, 5, 5],
        )[0]
        customer_id = random.choice(customers) if customers else None

        # Check for duplicate
        order_number = f"ORD-{shopkeeper_id}-{order_idx:04d}"
        if await exists(db, Order, order_number=order_number):
            stats["skipped"]["orders"] += 1
            continue

        subtotal = 0.0
        items_data = []
        for prod in selected_products:
            qty = random.randint(1, 8)
            unit_price = prod["price"]
            total_price = round(qty * unit_price, 2)
            subtotal += total_price
            items_data.append({
                "product_id": prod["id"],
                "product_name": prod["name"],
                "quantity": qty,
                "unit_price": unit_price,
                "total_price": total_price,
            })

        gst = round(subtotal * 0.18, 2) if status == "completed" else 0
        discount = round(subtotal * random.uniform(0, 0.1), 2)
        total = round(max(0, subtotal + gst - discount), 2)
        payment = random.choice(["cash", "upi", "credit", "bank_transfer"]) if status == "completed" else None

        order = Order(
            order_number=order_number,
            shopkeeper_id=shopkeeper_id,
            customer_id=customer_id,
            status=OrderStatus(status) if status in [s.value for s in OrderStatus] else OrderStatus.PENDING,
            payment_method=PaymentMethod(payment) if payment else None,
            subtotal=subtotal,
            discount=discount,
            gst=gst,
            total=total,
            is_b2c=False,
            notes=fake.sentence(nb_words=8) if random.random() > 0.7 else None,
            created_at=order_date,
            updated_at=order_date,
        )
        db.add(order)
        await db.flush()

        for item in items_data:
            oi = OrderItem(order_id=order.id, **item)
            db.add(oi)

            if status == "completed":
                for item in items_data:
                    im = InventoryMovement(
                        product_id=item["product_id"],
                        shopkeeper_id=shopkeeper_id,
                        movement_type=MovementType.SALE,
                        quantity=-item["quantity"],
                        reference=order_number,
                        notes=f"Order {order_number}",
                        created_at=order_date,
                        store_id=store_id,
                    )
                    db.add(im)

        order_idx += 1
        stats["created"]["orders"] += 1


async def create_purchase_orders(db: AsyncSession, shopkeeper_id: int, suppliers: list[int], products: list[dict], stats: dict):
    po_idx = 1
    now = datetime.now(timezone.utc)

    for days_ago in range(1, 120, random.randint(5, 15)):
        po_date = now - timedelta(days=days_ago)
        po_number = f"PO-{shopkeeper_id}-{po_idx:04d}"

        if await exists(db, PurchaseOrder, order_number=po_number):
            stats["skipped"]["purchase_orders"] += 1
            continue

        num_items = random.randint(1, 4)
        selected = random.sample(products, min(num_items, len(products)))
        status = random.choice(["pending", "approved", "received", "cancelled"])

        supplier_id = random.choice(suppliers) if suppliers else None
        po = PurchaseOrder(
            order_number=po_number,
            shopkeeper_id=shopkeeper_id,
            supplier_id=supplier_id,
            status=status,
            notes=fake.sentence(nb_words=6),
            created_at=po_date,
            updated_at=po_date,
        )
        db.add(po)
        await db.flush()

        for prod in selected:
            qty = random.randint(10, 100)
            unit_cost = round(prod["price"] * random.uniform(0.6, 0.85), 2)
            poi = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=prod["id"],
                product_name=prod["name"],
                quantity=qty,
                unit_cost=unit_cost,
                total_cost=round(qty * unit_cost, 2),
            )
            db.add(poi)
        po_idx += 1
        stats["created"]["purchase_orders"] += 1


async def create_notifications(db: AsyncSession, shopkeeper_id: int, stats: dict):
    types = [
        NotificationType.LOW_STOCK, NotificationType.ORDER_COMPLETED,
        NotificationType.STOCK_UPDATED, NotificationType.PAYMENT,
        NotificationType.PRODUCT_CREATED,
    ]
    now = datetime.now(timezone.utc)
    for i in range(20):
        notif_type = random.choice(types)
        days_ago = random.randint(0, 30)
        title_map = {
            NotificationType.LOW_STOCK: "Low Stock Alert",
            NotificationType.ORDER_COMPLETED: "Order Completed",
            NotificationType.STOCK_UPDATED: "Stock Updated",
            NotificationType.PAYMENT: "Payment Received",
            NotificationType.PRODUCT_CREATED: "Product Added",
        }
        msg_map = {
            NotificationType.LOW_STOCK: f"Product {random.choice(['Aashirvaad Atta', 'Fortune Oil', 'Basmati Rice', 'Sugar'])} is running low",
            NotificationType.ORDER_COMPLETED: f"Order ORD-{random.randint(1000,9999)} has been completed",
            NotificationType.STOCK_UPDATED: f"Stock updated for {random.randint(1,5)} products",
            NotificationType.PAYMENT: f"Payment of ₹{random.randint(100,5000)} received",
            NotificationType.PRODUCT_CREATED: f"New product added to inventory",
        }
        # Avoid exact duplicates (same type+title for same user on same day)
        dup_check = await db.execute(
            select(Notification).where(
                Notification.user_id == shopkeeper_id,
                Notification.type == notif_type,
                Notification.title == title_map[notif_type],
                Notification.created_at >= now - timedelta(days=1),
            ).limit(1)
        )
        if dup_check.scalar_one_or_none():
            continue

        n = Notification(
            user_id=shopkeeper_id,
            type=notif_type,
            title=title_map[notif_type],
            message=msg_map[notif_type],
            is_read=random.random() > 0.4,
            reference_id=None,
            created_at=now - timedelta(days=days_ago, hours=random.randint(0, 12)),
        )
        db.add(n)
        stats["created"]["notifications"] += 1


async def add_seed_products(db: AsyncSession, stats: dict):
    """Add seed products for onboarding if not present."""
    seed_data = {
        "kirana": [
            ("Aashirvaad Atta 5kg", "AASH-ATTA", "Groceries & Staples", 140, 260),
            ("Fortune Refined Oil 1L", "FORT-OIL", "Groceries & Staples", 120, 195),
            ("Tata Salt 1kg", "TATA-SALT", "Groceries & Staples", 12, 25),
            ("Amul Ghee 500ml", "AMUL-GHEE", "Groceries & Staples", 225, 380),
            ("Parle-G 200g", "PARLE-G", "Groceries & Staples", 25, 50),
            ("Maggi Noodles 12-pack", "MAGGI-12", "Groceries & Staples", 60, 120),
            ("Bisleri Water 1L", "BIS-1L", "Beverages", 12, 20),
            ("Coca-Cola 750ml", "COKE-750", "Beverages", 25, 45),
        ],
        "supermart": [
            ("Basmati Rice 5kg", "BAS-5KG", "Groceries & Staples", 290, 550),
            ("Fortune Refined Oil 5L", "FORT-OIL5", "Groceries & Staples", 580, 950),
            ("Britannia Bread", "BRIT-BREAD", "Groceries & Staples", 25, 45),
            ("Amul Milk 1L", "AMUL-MILK", "Beverages", 30, 56),
            ("Dove Soap Pack 3", "DOVE-SOAP3", "Personal Care & Beauty", 60, 135),
            ("Colgate Toothpaste 150g", "COLG-TP", "Personal Care & Beauty", 60, 140),
            ("Surf Excel Detergent 1kg", "SURF-1KG", "Home & Kitchen", 80, 180),
        ],
        "pharmacy": [
            ("Paracetamol 500mg Strip 15", "PARA-500", "Medicines & Wellness", 10, 35),
            ("Vitamin C Tablets 60", "VITC-60", "Medicines & Wellness", 45, 120),
            ("Cough Syrup 100ml", "COUGH-100", "Medicines & Wellness", 35, 85),
            ("Dettol Antiseptic 200ml", "DETTOL-200", "Medicines & Wellness", 55, 115),
            ("Band Aid Pack 20", "BANDAID-20", "Medicines & Wellness", 20, 50),
            ("Sanitizer 500ml", "SAN-500", "Medicines & Wellness", 60, 130),
        ],
        "electronics": [
            ("LED Bulb 9W", "LED-9W", "Electronics", 45, 85),
            ("Table Fan", "FAN-TABLE", "Electronics", 850, 1499),
            ("Extension Board 6-way", "EXT-6WAY", "Electronics", 150, 350),
            ("Power Bank 10000mAh", "PB-10K", "Electronics", 500, 999),
            ("Bluetooth Speaker", "BT-SPKR", "Electronics", 600, 1299),
            ("Mobile Cover", "MC-GEN", "Electronics", 50, 199),
        ],
        "clothing": [
            ("Cotton T-Shirt Men", "TSHIRT-M", "Clothing & Fashion", 250, 599),
            ("Jeans Men", "JEANS-M", "Clothing & Fashion", 600, 1499),
            ("Kurta Women", "KURTA-W", "Clothing & Fashion", 450, 999),
            ("Saree", "SAREE", "Clothing & Fashion", 400, 1999),
            ("Kids T-Shirt", "TSHIRT-K", "Clothing & Fashion", 150, 399),
        ],
        "restaurant": [
            ("Basmati Rice 1kg", "RICE-BAS", "Groceries & Staples", 60, 120),
            ("Refined Oil 1L", "OIL-REF", "Groceries & Staples", 120, 195),
            ("Tea 250g", "TEA-250", "Groceries & Staples", 120, 225),
            ("Coffee 100g", "COFFEE-100", "Groceries & Staples", 150, 295),
            ("Bisleri Water 1L", "WATER-1L", "Beverages", 12, 20),
        ],
    }

    for store_type, items in seed_data.items():
        for name, sku_prefix, category, cost, sell in items:
            if await exists(db, SeedProduct, name=name, store_type=store_type):
                stats["skipped"]["seed_products"] += 1
                continue
            sp = SeedProduct(
                store_type=store_type,
                name=name,
                sku_prefix=sku_prefix,
                category=category,
                default_selling_price=float(sell),
                default_cost_price=float(cost),
            )
            db.add(sp)
            stats["created"]["seed_products"] += 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def seed():
    stats = {
        "created": defaultdict(int),
        "skipped": defaultdict(int),
        "errors": [],
    }

    print("=" * 60)
    print("  KhataBox Demo Data Seeder")
    print("=" * 60)

    async with async_session() as db:
        async with db.begin():
            try:
                # 1. Admin
                admin = await create_admin(db, stats)
                print(f"  [OK] Admin: {admin.email}")

                # 2. Shopkeepers + Stores
                await create_shopkeepers(db, stats)
                print(f"  [OK] Shopkeepers: {stats['created']['shopkeepers']} created, {stats['skipped']['shopkeepers']} skipped")

                # Get all shopkeeper users
                result = await db.execute(
                    select(User).where(User.role == UserRole.SHOPKEEPER).order_by(User.id)
                )
                shopkeepers = result.scalars().all()

                for shopkeeper in shopkeepers:
                    s_result = await db.execute(
                        select(Store).where(Store.owner_id == shopkeeper.id).limit(1)
                    )
                    store = s_result.scalar_one_or_none()
                    if not store:
                        continue

                    # 3. Customers
                    await create_customers_for_user(db, shopkeeper.id, stats)

                    # 4. Suppliers
                    await create_suppliers_for_user(db, shopkeeper.id, stats)

                    # 5. Products
                    await create_products_for_user(db, shopkeeper.id, store.id, stats)

                    # 6. Get created IDs for relationships
                    cust_result = await db.execute(
                        select(Customer).where(Customer.owner_id == shopkeeper.id)
                    )
                    customers = [c.id for c in cust_result.scalars().all()]

                    supp_result = await db.execute(
                        select(Supplier).where(Supplier.owner_id == shopkeeper.id)
                    )
                    suppliers = [s.id for s in supp_result.scalars().all()]

                    prod_result = await db.execute(
                        select(Product).where(
                            Product.owner_id == shopkeeper.id,
                            Product.is_active == True,
                        )
                    )
                    products = [
                        {"id": p.id, "name": p.name, "price": p.selling_price}
                        for p in prod_result.scalars().all()
                    ]

                    if not products:
                        continue

                    # 7. Orders
                    await create_orders_for_user(db, shopkeeper.id, store.id, customers, products, stats)

                    # 8. Purchase Orders
                    await create_purchase_orders(db, shopkeeper.id, suppliers, products, stats)

                    # 9. Notifications
                    await create_notifications(db, shopkeeper.id, stats)

                # 10. Seed Products (for onboarding)
                await add_seed_products(db, stats)

            except Exception as e:
                stats["errors"].append(str(e))
                print(f"  [ERR] Error: {e}")
                raise

        await db.commit()

    # Print Summary
    print()
    print("-" * 60)
    print("  SEEDING SUMMARY")
    print("-" * 60)
    total_created = sum(stats["created"].values())
    total_skipped = sum(stats["skipped"].values())
    for key in sorted(set(list(stats["created"].keys()) + list(stats["skipped"].keys()))):
        c = stats["created"].get(key, 0)
        s = stats["skipped"].get(key, 0)
        print(f"  {key.capitalize():20s}: {c:4d} created, {s:4d} skipped")

    print("-" * 60)
    print(f"  TOTAL: {total_created:4d} records created, {total_skipped:4d} records skipped")
    if stats["errors"]:
        print(f"  ERRORS: {len(stats['errors'])}")
        for err in stats["errors"]:
            print(f"    - {err}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
