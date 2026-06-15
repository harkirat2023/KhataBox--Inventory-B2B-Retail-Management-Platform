"""Seed script: populates DB with realistic Indian demo data for all 14 tables.

Run:  python seed_india.py
Req:  Faker, passlib[bcrypt], SQLAlchemy, asyncpg
"""
import asyncio
import random
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from faker import Faker
from sqlalchemy import select, text

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
]

SHOP_DATA = [
    ("City Electronics", "Mumbai", "Maharashtra", "electronics_repair"),
    ("MegaMart Grocery", "Delhi", "Delhi", "grocery"),
    ("Trends Fashion", "Bangalore", "Karnataka", "clothing"),
    ("MedLife Pharmacy", "Hyderabad", "Telangana", "pharmacy"),
    ("Stationery Hub", "Ahmedabad", "Gujarat", "stationery"),
    ("Home Essentials", "Chennai", "Tamil Nadu", "home_kitchen"),
    ("Wellness Care", "Kolkata", "West Bengal", "pharmacy"),
    ("Saraaf Electronics", "Pune", "Maharashtra", "electronics_repair"),
    ("FreshMart", "Jaipur", "Rajasthan", "grocery"),
    ("Fashion Point", "Lucknow", "Uttar Pradesh", "clothing"),
    ("General Store", "Surat", "Gujarat", "general"),
    ("Health Pharmacy", "Indore", "Madhya Pradesh", "pharmacy"),
    ("Book & More", "Bhopal", "Madhya Pradesh", "stationery"),
    ("City Mall", "Chandigarh", "Punjab", "general"),
    ("Patna Bazaar", "Patna", "Bihar", "general"),
]

# ---------------------------------------------------------------------------
# Product Catalogue  (350+ products across 14 categories)
# ---------------------------------------------------------------------------
PRODUCT_CATALOG = {
    "Electronics": {
        "gst": "standard",
        "brands": ["Samsung", "LG", "Sony", "Bajaj", "Philips", "Panasonic", "Havells"],
        "products": [
            ("LED Bulb 9W", 45, 85), ("LED Bulb 12W", 55, 110), ("LED Tube Light 20W", 180, 320),
            ("Table Fan", 850, 1499), ("Ceiling Fan", 1200, 2200), ("Exhaust Fan", 600, 1100),
            ("Electric Kettle 1.5L", 450, 895), ("Toaster 2-Slice", 500, 950), ("Mixer Grinder 750W", 1800, 3200),
            ("Iron Dry", 450, 850), ("Iron Steam", 700, 1350), ("Extension Board 6-way", 150, 350),
            ("USB Charger 3.1A", 120, 250), ("Power Bank 10000mAh", 500, 999), ("Bluetooth Speaker", 600, 1299),
            ("Wired Mouse", 150, 350), ("Wireless Mouse", 350, 699), ("Keyboard USB", 250, 550),
            ("HDMI Cable 2m", 120, 299), ("OTG Cable", 80, 180), ("Mobile Cover", 50, 199),
            ("Tempered Glass Screen Guard", 30, 99), ("Selfie Stick", 120, 299), ("USB Hub 4-port", 250, 550),
            ("Smart Plug WiFi", 500, 999),
        ]
    },
    "Groceries & Staples": {
        "gst": "low",
        "brands": ["Tata", "Britannia", "Nestle", "Amul", "Patanjali", "Fortune", "Aashirvaad"],
        "products": [
            ("Basmati Rice 1kg", 60, 120), ("Basmati Rice 5kg", 290, 550), ("Sonam Masoori Rice 5kg", 200, 380),
            ("Wheat Flour (Atta) 5kg", 140, 260), ("Wheat Flour (Atta) 10kg", 275, 499),
            ("Sugar 1kg", 38, 48), ("Sugar 5kg", 185, 235), ("Salt 1kg", 12, 25),
            ("Toor Dal 1kg", 85, 150), ("Moong Dal 1kg", 70, 130), ("Chana Dal 1kg", 55, 110),
            ("Masoor Dal 1kg", 65, 120), ("Refined Oil 1L", 120, 195), ("Mustard Oil 1L", 150, 230),
            ("Ghee 500ml", 225, 380), ("Ghee 1L", 440, 720), ("Tea 250g", 120, 225),
            ("Coffee 100g", 150, 295), ("Cooking Butter 500g", 180, 320), ("Cheese Slices 200g", 95, 180),
            ("Paneer 200g", 70, 120), ("Biscuits Pack 200g", 25, 50), ("Cooking Soda 200g", 15, 30),
            ("Turmeric Powder 100g", 25, 50), ("Red Chilli Powder 100g", 30, 65),
        ]
    },
    "Beverages": {
        "gst": "reduced",
        "brands": ["Coca-Cola", "Pepsi", "Dabur", "Real", "Paper Boat", "Bisleri", "Kinley"],
        "products": [
            ("Coca-Cola 750ml", 25, 45), ("Pepsi 750ml", 25, 45), ("Sprite 750ml", 25, 45),
            ("Mountain Dew 750ml", 25, 45), ("Thums Up 750ml", 25, 45), ("Fanta 750ml", 25, 45),
            ("Maaza Mango Drink 1L", 40, 75), ("Real Fruit Juice 1L", 65, 120),
            ("Paper Boat Aamras 200ml", 20, 40), ("Paper Boat Jaljeera 200ml", 20, 40),
            ("Bisleri Water 1L", 12, 20), ("Bisleri Water 20L", 40, 75),
            ("Kinley Water 1L", 12, 20), ("Packaged Coconut Water 200ml", 25, 55),
            ("Energy Drink 250ml", 50, 100), ("Chaas (Buttermilk) 1L", 25, 50),
            ("Lassi 1L", 40, 80), ("Glucose Powder 500g", 40, 80),
            ("Green Tea 25 bags", 75, 150), ("Lemon Juice Pack 1L", 50, 95),
        ]
    },
    "Clothing & Fashion": {
        "gst": "reduced",
        "brands": ["Levi's", "Nike", "Adidas", "Zara", "H&M", "Puma", "Raymond", "Peter England"],
        "products": [
            ("Cotton T-Shirt Men", 250, 599), ("Polo T-Shirt Men", 350, 799), ("Formal Shirt Men", 400, 999),
            ("Casual Shirt Men", 350, 899), ("Jeans Men", 600, 1499), ("Chinos Men", 500, 1299),
            ("Trousers Men", 450, 1199), ("Cotton T-Shirt Women", 250, 599), ("Kurta Women", 450, 999),
            ("Salwar Suit Set", 500, 1299), ("Saree", 400, 1999), ("Leggings", 200, 499),
            ("Tops Women", 300, 699), ("Kids T-Shirt", 150, 399), ("Kids Frock", 300, 699),
            ("Kids Shorts", 150, 349), ("Shorts Men", 250, 599), ("Innerwear Vest Pack 3", 150, 349),
            ("Socks Pair Pack 3", 80, 199), ("Belt Men", 200, 499), ("Cap", 100, 299),
            ("Scarf", 150, 399), ("Handkerchief Pack 5", 50, 125), ("Lungi", 200, 399),
            ("Dhoti", 180, 350),
        ]
    },
    "Medicines & Wellness": {
        "gst": "reduced",
        "brands": ["Cipla", "Sun Pharma", "Dr Reddy's", "Pfizer", "GSK", "Abbott", "Zydus"],
        "products": [
            ("Paracetamol 500mg Strip 15", 10, 35), ("Paracetamol 650mg Strip 15", 12, 40),
            ("Vitamin C Tablets 60", 45, 120), ("Multivitamin Tablets 30", 60, 150),
            ("Cough Syrup 100ml", 35, 85), ("Cough Syrup 200ml", 60, 145),
            ("Antacid Tablets Strip 10", 15, 40), ("Antacid Liquid 200ml", 50, 110),
            ("Band Aid Pack 20", 20, 50), ("Gauze Roll", 15, 35), ("Cotton Wool 100g", 30, 65),
            ("Dettol Antiseptic 200ml", 55, 115), ("Savlon Antiseptic 200ml", 50, 105),
            ("Pain Balm 30g", 30, 75), ("Moov Pain Relief 30g", 35, 85),
            ("Volini Gel 50g", 65, 140), ("Eye Drops 10ml", 30, 70),
            ("Allergy Relief Tablets 10", 25, 60), ("Antiseptic Cream 30g", 25, 55),
            ("Oral Rehydration Salt Pack 5", 15, 35), ("Thermometer Digital", 60, 150),
            ("BP Monitor", 1200, 2200), ("Glucose Meter", 500, 999), ("Surgical Mask Box 50", 150, 350),
            ("Sanitizer 500ml", 60, 130),
        ]
    },
    "Stationery & Office": {
        "gst": "reduced",
        "brands": ["Parker", "Camlin", "Classmate", "Navneet", "Linc", "Reynolds", "Faber-Castell"],
        "products": [
            ("Ball Pen Blue Pack 10", 30, 75), ("Ball Pen Black Pack 10", 30, 75), ("Gel Pen Pack 5", 50, 120),
            ("Parker Fountain Pen", 150, 450), ("Pencil HB Pack 10", 20, 50), ("Color Pencil Pack 12", 40, 95),
            ("Sketch Pen Set 12", 45, 110), ("Sketch Pen Set 24", 80, 180), ("Notebook 100pg Ruled", 25, 60),
            ("Notebook 200pg Ruled", 45, 100), ("Spiral Notebook 120pg", 35, 80), ("Drawing Book A4", 30, 75),
            ("Eraser Pack 5", 15, 35), ("Sharpener", 5, 15), ("Ruler 15cm", 5, 15),
            ("Geometry Box", 50, 150), ("Glue Stick 20g", 15, 35), ("Fevicol 100ml", 20, 50),
            ("Paper Pack A4 500", 150, 350), ("Envelope Pack 20", 25, 60),
            ("Stapler Small", 45, 120), ("Staples Pack 1000", 15, 40), ("Punching Machine", 50, 130),
            ("File Folder", 15, 40), ("Whiteboard Marker Pack 4", 80, 180),
        ]
    },
    "Home & Kitchen": {
        "gst": "standard",
        "brands": ["Prestige", "Hawkins", "Borosil", "Milton", "Cello", "Butterfly", "Vaya"],
        "products": [
            ("Steel Pressure Cooker 3L", 800, 1599), ("Steel Pressure Cooker 5L", 1100, 2199),
            ("Non-Stick Fry Pan 24cm", 350, 750), ("Non-Stick Tawa 28cm", 400, 850),
            ("Steel Kadai 20cm", 350, 699), ("Steel Saucepan 16cm", 250, 550),
            ("Glass Bowl Set 3pc", 200, 450), ("Steel Bowl Set 3pc", 250, 499),
            ("Dinner Set 12pc", 500, 1299), ("Tiffin Box 2-tier", 200, 450),
            ("Water Bottle 1L", 100, 250), ("Vacuum Flask 1L", 300, 650),
            ("Steel Tumbler Set 6", 250, 550), ("Glass Tumbler Set 6", 200, 450),
            ("Casserole 1.5L", 400, 850), ("Cutting Board Plastic", 80, 199),
            ("Knife Set 3pc", 150, 350), ("Spatula Set 3pc", 100, 250),
            ("Stainless Steel Spoon Set 6", 200, 450), ("Rice Scoop", 30, 80),
            ("Grater Steel", 50, 120), ("Measuring Cups Set", 60, 150),
            ("Rolling Pin & Board", 150, 350), ("Colander Steel", 100, 250),
            ("Mug Ceramic Set 4", 300, 699),
        ]
    },
    "Personal Care & Beauty": {
        "gst": "standard",
        "brands": ["Hindustan Unilever", "P&G", "L'Oreal", "Dove", "Nivea", "Lakme", "Garnier"],
        "products": [
            ("Bathing Soap Pack 3", 60, 135), ("Hand Wash 250ml", 60, 140), ("Shampoo 200ml", 80, 180),
            ("Conditioner 200ml", 100, 220), ("Toothpaste 150g", 60, 140), ("Toothbrush Pack 2", 40, 100),
            ("Mouthwash 250ml", 80, 180), ("Deodorant Spray 150ml", 120, 280),
            ("Body Lotion 200ml", 120, 260), ("Face Cream 50g", 100, 250),
            ("Face Wash 100g", 70, 165), ("Sunscreen Lotion 50g", 150, 350),
            ("Hair Oil 200ml", 80, 180), ("Hair Gel 100g", 70, 160),
            ("Shaving Cream 100g", 60, 140), ("Razor Pack 5", 80, 180),
            ("After Shave Lotion 100ml", 100, 240), ("Sanitary Pad Pack 10", 30, 80),
            ("Wet Wipes Pack 80", 80, 180), ("Talcum Powder 200g", 60, 140),
            ("Nail Polish", 40, 120), ("Lip Balm", 35, 95), ("Kajal Stick", 50, 150),
            ("Foundation 30ml", 200, 499), ("Compact Powder", 150, 399),
        ]
    },
    "Baby & Kids": {
        "gst": "reduced",
        "brands": ["Johnson & Johnson", "Huggies", "Pampers", "Mee Mee", "Baby Dove", "Sebamed"],
        "products": [
            ("Baby Shampoo 200ml", 100, 220), ("Baby Soap Pack 3", 80, 180),
            ("Baby Lotion 200ml", 120, 260), ("Baby Oil 200ml", 100, 220),
            ("Baby Powder 200g", 80, 180), ("Baby Wipes Pack 80", 120, 280),
            ("Diaper Pants Size M Pack 12", 200, 450), ("Diaper Pants Size L Pack 12", 220, 480),
            ("Baby Food Cereal 200g", 150, 330), ("Baby Food Jar 120g", 80, 180),
            ("Baby Bottle 250ml", 100, 250), ("Baby Bottle Nipple Pack 2", 60, 150),
            ("Baby Toothbrush", 40, 99), ("Baby Teether", 60, 150),
            ("Baby Nail Clipper", 80, 180), ("Baby Hair Brush", 80, 180),
            ("Baby Towel Soft", 150, 350), ("Baby Blanket", 300, 699),
            ("Baby Bib Set 3", 120, 280), ("Baby Socks Pack 5", 80, 180),
        ]
    },
    "Automotive & Accessories": {
        "gst": "standard",
        "brands": ["Castrol", "Shell", "Bosch", "Michelin", "TVS", "Exide", "Philips Automotive"],
        "products": [
            ("Engine Oil 1L 20W50", 250, 550), ("Engine Oil 1L 10W40", 280, 600),
            ("Coolant 1L", 150, 350), ("Windshield Washer 1L", 80, 200),
            ("Car Freshener", 50, 150), ("Car Shampoo 500ml", 100, 250),
            ("Dashboard Polish 200ml", 80, 200), ("Tyre Inflator 12V", 500, 1100),
            ("Jump Starter Cable", 300, 699), ("Car Charger 2USB", 150, 350),
            ("Phone Holder Car", 200, 450), ("Car Mat Set Rubber", 500, 1299),
            ("Car Cover Medium", 400, 999), ("Bike Cover", 250, 650),
            ("Bike Chain Spray", 120, 280), ("Bike Cleaner 500ml", 150, 350),
            ("Helmet Visor", 150, 400), ("Helmet Full Face", 600, 1800),
            ("Driving Gloves", 200, 499), ("Seat Cover Set", 800, 1999),
        ]
    },
    "Sports & Fitness": {
        "gst": "reduced",
        "brands": ["Nike", "Adidas", "Cosco", "Nivia", "SG", "MRF", "Decathlon"],
        "products": [
            ("Cricket Bat Kashmir Willow", 500, 1399), ("Cricket Ball Leather", 200, 550),
            ("Cricket Ball Tennis", 80, 220), ("Cricket Stumps Set", 300, 700),
            ("Football Size 5", 300, 799), ("Basketball Size 7", 400, 999),
            ("Badminton Racket Steel", 150, 399), ("Badminton Racket Graphite", 400, 999),
            ("Shuttlecock Pack 6", 80, 220), ("Table Tennis Bat Set 2", 300, 699),
            ("Table Tennis Ball Pack 6", 60, 150), ("Skipping Rope", 50, 150),
            ("Yoga Mat", 300, 699), ("Dumbbell Set 2kg Pair", 400, 899),
            ("Dumbbell Set 5kg Pair", 800, 1799), ("Resistance Band Set", 200, 499),
            ("Push Up Stand", 300, 699), ("Water Bottle Gym 1L", 150, 350),
            ("Gym Gloves", 200, 499), ("Sports Bag Large", 400, 999),
        ]
    },
    "Pet Supplies": {
        "gst": "reduced",
        "brands": ["Pedigree", "Whiskas", "Drools", "Petmate", "Trixie", "Purepet"],
        "products": [
            ("Dog Dry Food 1kg", 200, 450), ("Dog Dry Food 3kg", 550, 1250),
            ("Dog Wet Food Pouch 100g", 40, 100), ("Cat Dry Food 1kg", 250, 550),
            ("Cat Wet Food Pouch 85g", 35, 90), ("Dog Treats Pack 200g", 100, 250),
            ("Cat Treats Pack 60g", 80, 200), ("Pet Shampoo 200ml", 150, 350),
            ("Pet Brush", 150, 350), ("Pet Collar Small", 100, 250),
            ("Pet Leash", 150, 350), ("Pet Bowl Stainless", 200, 450),
            ("Pet Bed Small", 400, 999), ("Pet Toy Ball Pack 3", 100, 250),
            ("Pet Chew Bone", 80, 200), ("Litter Box", 300, 700),
            ("Cat Litter 5kg", 200, 450), ("Bird Seed Mix 500g", 60, 150),
            ("Fish Food Flakes 100g", 40, 100), ("Hamster Bedding 5L", 150, 350),
        ]
    },
    "Festive & Decoration": {
        "gst": "standard",
        "brands": ["Local Handloom", "FabIndia", "Khadi India", "Saraogi", "Rangoli", "DiyaKing"],
        "products": [
            ("Diya Set 10 Clay", 30, 80), ("Diya Set 20 Clay", 55, 140),
            ("LED Diya Set 5", 100, 250), ("Toran Mango Leaf 6ft", 50, 150),
            ("Toran Floral 6ft", 80, 200), ("Rangoli Colors Pack 8", 40, 100),
            ("Rangoli Sticker Sheet", 25, 65), ("Flower Garland Realistic 6ft", 60, 150),
            ("Pooja Thali Brass Small", 200, 499), ("Pooja Thali Steel", 100, 250),
            ("Incense Sticks Pack 100", 30, 80), ("Dhoop Cones Pack 50", 40, 100),
            ("Camphor 25g", 30, 70), ("Kumkum 50g", 20, 50), ("Sandalwood Paste 50g", 60, 150),
            ("Candle Set 6 Multi-color", 60, 150), ("Scented Candle Jar 200g", 200, 450),
            ("Oil Lamp Brass", 150, 399), ("Photo Frame 6x4 Set 2", 100, 250),
            ("Wall Hanging Decorative", 150, 399), ("Wind Chime Metal", 100, 280),
            ("Showpiece Brass Small", 200, 550), ("God Idol Small Brass", 300, 799),
            ("Murti Set Ganesha+Laxmi", 400, 999), ("Pooja Kit Complete", 500, 1199),
        ]
    },
}

# ---------------------------------------------------------------------------
# Suppliers data
# ---------------------------------------------------------------------------
SUPPLIER_DATA = [
    ("Sharma Distributors", "electronics"), ("Gupta Trading Co.", "groceries"),
    ("Patel Wholesale", "beverages"), ("Singh Textiles", "clothing"),
    ("Verma Pharmaceuticals", "medicines"), ("Joshi Stationery Mart", "stationery"),
    ("Desai Home Supplies", "home_kitchen"), ("Mehta Beauty Products", "personal_care"),
    ("Agarwal Baby World", "baby_kids"), ("Rao Auto Parts", "automotive"),
    ("Nair Sports Equipments", "sports"), ("Menon Pet Care", "pet_supplies"),
    ("Chopra Traders", "festive"), ("Malik Electronics", "electronics"),
    ("Kapoor Food Products", "groceries"), ("Reddy Beverages", "beverages"),
    ("Bhatia Clothing Co.", "clothing"), ("Saxena Medicos", "medicines"),
    ("Trivedi Stationery", "stationery"), ("Chauhan Home Needs", "home_kitchen"),
    ("Pillai Beauty World", "personal_care"), ("Nanda Baby Products", "baby_kids"),
    ("Prasad Auto Zone", "automotive"), ("Menon Sports World", "sports"),
    ("Iyer Pet Palace", "pet_supplies"), ("Kohli Decor", "festive"),
    ("Bajaj Electronics", "electronics"), ("Aggarwal Food Grain", "groceries"),
    ("Thakur Garments", "clothing"), ("Mishra Medical Hall", "medicines"),
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_order_counter = 0
_invoice_counter = 0
_po_counter = 0


def next_order_number() -> str:
    global _order_counter
    _order_counter += 1
    return f"ORD-{datetime.now(timezone.utc).strftime('%Y%m')}-{_order_counter:05d}"


def next_invoice_number() -> str:
    global _invoice_counter
    _invoice_counter += 1
    return f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{_invoice_counter:05d}"


def next_po_number() -> str:
    global _po_counter
    _po_counter += 1
    return f"PO-{datetime.now(timezone.utc).strftime('%Y%m')}-{_po_counter:05d}"


def indian_phone() -> str:
    prefixes = ["98", "99", "97", "96", "95", "93", "94", "91", "90", "88", "87", "86", "85", "84", "83", "82", "81", "80"]
    return f"+91{random.choice(prefixes)}{random.randint(10000000, 99999999)}"


def gst_number(state_code: str = "27") -> str:
    """Generate a realistic GSTIN format: 27AAAAA0000A1Z5"""
    pan = f"{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{'P'}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.randint(1000, 9999)}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}"
    return f"{state_code}{pan}1Z5"


ASEASONAL_MULTIPLIERS = {
    1: 1.0, 2: 1.0, 3: 1.4,   # Holi spike (Mar)
    4: 1.1, 5: 1.2, 6: 1.3,   # Summer peak (May-Jun: beverages)
    7: 1.0, 8: 1.0, 9: 1.1,   # Monsoon
    10: 1.5, 11: 1.8, 12: 1.6,  # Diwali (Oct-Nov) + Winter
}
HOLIDAY_DATES = {
    # Diwali 2025 (Oct-Nov window)
    (2025, 10, 20): 3.0, (2025, 10, 21): 3.0, (2025, 10, 22): 2.5,
    (2025, 10, 18): 2.0, (2025, 10, 19): 2.5,
    # Holi 2025
    (2025, 3, 14): 2.5, (2025, 3, 13): 2.0, (2025, 3, 15): 1.8,
    # Diwali 2026
    (2026, 11, 8): 3.0, (2026, 11, 9): 3.0, (2026, 11, 7): 2.5,
    # Holi 2026
    (2026, 3, 4): 2.5, (2026, 3, 3): 2.0, (2026, 3, 5): 1.8,
    # New Year
    (2026, 1, 1): 1.5, (2025, 1, 1): 1.5,
    # Republic Day
    (2025, 1, 26): 1.3, (2026, 1, 26): 1.3,
    # Independence Day
    (2025, 8, 15): 1.3, (2026, 8, 15): 1.3,
    # Christmas
    (2025, 12, 25): 1.8, (2026, 12, 25): 1.8,
    # Eid
    (2025, 4, 1): 1.5, (2026, 3, 21): 1.5,
}


def demand_multiplier(d: date) -> float:
    m = ASEASONAL_MULTIPLIERS.get(d.month, 1.0)
    m *= HOLIDAY_DATES.get((d.year, d.month, d.day), 1.0)
    # Weekend bump
    if d.weekday() >= 5:
        m *= 1.3
    return m


def category_seasonal_boost(category: str, d: date) -> float:
    month = d.month
    # Beverages spike in summer
    if category == "Beverages" and month in (4, 5, 6):
        return 2.0
    if category == "Beverages" and month in (3, 7):
        return 1.5
    # Winter medicine demand
    if category == "Medicines & Wellness" and month in (11, 12, 1, 2):
        return 1.6
    # Electronics during Diwali
    if category == "Electronics" and month in (10, 11):
        return 1.8
    # Clothing during festive
    if category == "Clothing & Fashion" and month in (10, 11, 3):
        return 1.5
    # Festive during Diwali
    if category == "Festive & Decoration" and month in (10, 11):
        return 2.5
    return 1.0


# ---------------------------------------------------------------------------
# Core seed logic
# ---------------------------------------------------------------------------
async def seed():
    """Main seed function - creates all demo data."""
    print("=" * 60)
    print("  KHATABOX - Indian Demo Data Seeder")
    print("=" * 60)
    start_ts = datetime.now(timezone.utc)

    async with async_session() as session:
        # ---------------------------------------------------------------
        # 0. Idempotency check & cleanup
        # ---------------------------------------------------------------
        result = await session.execute(select(User).where(User.email == "admin@khatabox.com"))
        existing_admin = result.scalar_one_or_none()
        if existing_admin:
            print("\nExisting data found. Truncating all tables...")
            tables = [
                "audit_logs", "notifications", "stock_transfers", "inventory_movements",
                "purchase_order_items", "purchase_orders", "invoices", "order_items", "orders",
                "products", "suppliers", "customers", "stores",
            ]
            for t in tables:
                await session.execute(text(f"DELETE FROM {t}"))
            # Delete all non-admin users (orphaned customer users from previous seeds)
            await session.execute(text("DELETE FROM users WHERE email != 'admin@khatabox.com'"))
            await session.commit()
            print("  All tables cleared.\n")

        # ---------------------------------------------------------------
        # 1. USERS
        # ---------------------------------------------------------------
        print("Seeding Users...")

        # Admin
        result = await session.execute(select(User).where(User.email == "admin@khatabox.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@khatabox.com",
                password_hash=hash_password("Admin@123"),
                name="Super Admin",
                role=UserRole.ADMIN,
                store_name="KhataBox Head Office",
                phone="+919999999999",
                is_active=True,
            )
            session.add(admin)
            await session.flush()
        else:
            admin.password_hash = hash_password("Admin@123")
            admin.name = "Super Admin"
            admin.store_name = "KhataBox Head Office"

        # Shopkeepers (15)
        shopkeepers = []
        for i, (shop_name, city, state, shop_type) in enumerate(SHOP_DATA):
            email = f"{shop_name.lower().replace(' ', '').replace('&', 'and')}@khatabox.com"
            result = await session.execute(select(User).where(User.email == email))
            existing = result.scalar_one_or_none()
            if existing:
                shopkeepers.append(existing)
                continue
            u = User(
                email=email,
                password_hash=hash_password("Shop@123"),
                name=f"{fake.first_name()} {fake.last_name()}",
                role=UserRole.SHOPKEEPER,
                store_name=shop_name,
                phone=indian_phone(),
                is_active=True,
            )
            session.add(u)
            await session.flush()
            shopkeepers.append(u)

        # Customer users (will create alongside customers)
        print(f"  Admin: admin@khatabox.com / Admin@123")
        print(f"  Shopkeepers: {len(shopkeepers)} created")

        await session.flush()
        all_users = [admin] + shopkeepers

        # ---------------------------------------------------------------
        # 2. STORES
        # ---------------------------------------------------------------
        print("Seeding Stores...")
        stores = []
        for i, (shop_name, city, state, shop_type) in enumerate(SHOP_DATA):
            owner = shopkeepers[i]
            result = await session.execute(
                select(Store).where(Store.name == shop_name, Store.owner_id == owner.id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                stores.append(existing)
                continue
            s = Store(
                name=shop_name,
                address=f"{random.randint(1, 999)}, {fake.street_name()}, {city} - {random.randint(100001, 800020)}",
                owner_id=owner.id,
                is_active=True,
            )
            session.add(s)
            await session.flush()
            stores.append(s)
        print(f"  {len(stores)} stores created across {len(set(s[1] for s in SHOP_DATA))} cities")

        # Also create a store for admin
        result = await session.execute(
            select(Store).where(Store.name == "KhataBox Head Office", Store.owner_id == admin.id)
        )
        admin_store = result.scalar_one_or_none()
        if not admin_store:
            admin_store = Store(
                name="KhataBox Head Office",
                address="1, Corporate Centre, Andheri East, Mumbai - 400093",
                owner_id=admin.id,
                is_active=True,
            )
            session.add(admin_store)
            await session.flush()
            stores.append(admin_store)

        # ---------------------------------------------------------------
        # 3. PRODUCTS  (350+ across 14 categories)
        # ---------------------------------------------------------------
        print("Seeding Products...")
        products = []
        sku_index = defaultdict(int)

        for cat_name, cat_data in PRODUCT_CATALOG.items():
            cat_code = cat_name[:3].upper().replace(" ", "")
            for pname, cost, price in cat_data["products"]:
                sku_index[cat_code] += 1
                sku = f"{cat_code}-{sku_index[cat_code]:04d}"
                # Medicine-like categories get batch/expiry
                batch = None
                mfg_date = None
                exp_date = None
                if cat_name in ("Medicines & Wellness", "Groceries & Staples", "Baby & Kids", "Beverages"):
                    batch = f"BATCH-{cat_code}-{random.randint(1000, 9999)}"
                    mfg = datetime.now(timezone.utc) - timedelta(days=random.randint(30, 400))
                    mfg_date = mfg.date()
                    exp_date = mfg_date + timedelta(days=random.choice([180, 365, 548, 730, 1095]))

                p = Product(
                    name=pname,
                    sku=sku,
                    category=cat_name,
                    brand=random.choice(cat_data["brands"]),
                    description=f"{pname} by {random.choice(cat_data['brands'])} - Premium quality",
                    cost_price=round(float(cost), 2),
                    selling_price=round(float(price), 2),
                    stock_quantity=random.randint(10, 200),
                    reorder_threshold=random.choice([5, 10, 15, 20, 25]),
                    batch_number=batch,
                    mfg_date=mfg_date,
                    expiry_date=exp_date,
                    owner_id=admin.id,
                    store_id=random.choice(stores).id,
                    is_active=True,
                )
                session.add(p)
                await session.flush()
                products.append(p)
        print(f"  {len(products)} products across {len(PRODUCT_CATALOG)} categories")

        # ---------------------------------------------------------------
        # 4. SUPPLIERS (30)
        # ---------------------------------------------------------------
        print("Seeding Suppliers...")
        suppliers = []
        for sup_name, specialty in SUPPLIER_DATA:
            result = await session.execute(
                select(Supplier).where(Supplier.name == sup_name, Supplier.owner_id == admin.id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                suppliers.append(existing)
                continue
            s = Supplier(
                name=sup_name,
                contact_person=fake.name(),
                email=f"{sup_name.lower().replace(' ', '.').replace('(', '').replace(')', '')}@supplier.in",
                phone=indian_phone(),
                address=f"{random.randint(1, 500)}, {fake.street_name()}, {random.choice(INDIAN_CITIES)[0]}",
                owner_id=admin.id,
            )
            session.add(s)
            await session.flush()
            suppliers.append(s)
        print(f"  {len(suppliers)} suppliers")

        # ---------------------------------------------------------------
        # 5. CUSTOMERS (100) + their user accounts
        # ---------------------------------------------------------------
        print("Seeding Customers...")
        customers = []
        customer_users = []
        industry_prefixes = [
            ("Tech", "Solutions", "IT"), ("Green", "Organics", "Food"), ("Fashion", "Styles", "Retail"),
            ("Medi", "Health", "Pharma"), ("Stationery", "World", "Education"), ("Urban", "Supplies", "Retail"),
            ("Royal", "Enterprises", "General"), ("Prime", "Trading", "Wholesale"), ("Metro", "Goods", "Retail"),
            ("Global", "Impex", "Import"), ("City", "Distributors", "Wholesale"), ("Star", "Retail", "Retail"),
            ("Omega", "Corporation", "General"), ("Delta", "Ventures", "IT"), ("Sigma", "Traders", "Wholesale"),
            ("Apex", "Supplies", "Retail"), ("Elite", "Merchants", "Import"), ("Unity", "Stores", "Retail"),
            ("Perfect", "Solutions", "IT"), ("Bright", "Future", "Education"),
        ]
        fname_list = ["Aarav", "Vihaan", "Vivaan", "Ananya", "Diya", "Aditya", "Arjun", "Sai", "Reyansh", "Ayaan",
                       "Aishwarya", "Lakshmi", "Priya", "Ravi", "Rajesh", "Suresh", "Amit", "Vijay", "Sanjay", "Manish"]
        lname_list = ["Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Reddy", "Joshi", "Desai", "Nair",
                       "Menon", "Iyer", "Rao", "Chopra", "Malhotra", "Kapoor", "Mehta", "Agarwal", "Bhatia", "Saxena"]

        for i in range(100):
            prefix, suffix, industry = industry_prefixes[i % len(industry_prefixes)]
            company = f"{prefix} {suffix} {fake.city()}"
            email = f"contact.{company.lower().replace(' ', '.').replace(',', '')}@client.com"
            cust_email = email

            # Check existence
            result = await session.execute(select(Customer).where(Customer.email == cust_email))
            existing = result.scalar_one_or_none()
            if existing:
                customers.append(existing)
                continue

            city_name, state_name = random.choice(INDIAN_CITIES)
            state_codes = {"Maharashtra": "27", "Delhi": "07", "Karnataka": "29", "Telangana": "36",
                           "Gujarat": "24", "Tamil Nadu": "33", "West Bengal": "19", "Rajasthan": "08",
                           "Uttar Pradesh": "09", "Punjab": "03", "Madhya Pradesh": "23", "Bihar": "10"}
            sc = state_codes.get(state_name, "27")

            cl = random.choice([50000, 75000, 100000, 150000, 200000, 300000, 500000])
            cu = random.randint(0, int(cl * 0.6))
            tier = random.choice(["standard", "premium", "standard", "standard", "premium"])

            c = Customer(
                company_name=company,
                contact_person=f"{random.choice(fname_list)} {random.choice(lname_list)}",
                email=cust_email,
                phone=indian_phone(),
                gst_number=gst_number(sc),
                credit_limit=float(cl),
                credit_used=float(cu),
                price_tier=tier,
                owner_id=admin.id,
            )
            session.add(c)
            await session.flush()
            customers.append(c)

            # Also create a customer user account
            result = await session.execute(select(User).where(User.email == cust_email))
            if not result.scalar_one_or_none():
                cu_user = User(
                    email=cust_email,
                    password_hash=hash_password("customer123"),
                    name=f"{random.choice(fname_list)} {random.choice(lname_list)}",
                    role=UserRole.CUSTOMER,
                    phone=indian_phone(),
                )
                session.add(cu_user)
                customer_users.append(cu_user)
        await session.flush()
        print(f"  {len(customers)} B2B customers")
        print(f"  {len(customer_users)} customer user accounts")

        # ---------------------------------------------------------------
        # 6. ORDERS + ORDER ITEMS + INVENTORY MOVEMENTS (1000+ over 12 months)
        # ---------------------------------------------------------------
        print("Seeding Orders & Sales History...")
        orders = []
        order_items_list = []
        sale_movements = []
        invoices = []
        invoices_to_create = []

        # Generate 12 months of dates
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=365)

        date_range = [start_date + timedelta(days=i) for i in range((end_date - start_date).days + 1)]

        total_orders_created = 0

        for d in date_range:
            mult = demand_multiplier(d)
            # Each day, generate orders across shopkeepers
            num_orders_today = max(1, int(3 * mult + random.uniform(-1, 2)))

            for _ in range(num_orders_today):
                shopkeeper = random.choice(shopkeepers)
                sk_store = next((s for s in stores if s.owner_id == shopkeeper.id), random.choice(stores))

                order_datetime = datetime(
                    d.year, d.month, d.day,
                    random.randint(9, 21), random.randint(0, 59),
                    random.randint(0, 59),
                    tzinfo=timezone.utc,
                )

                # 1-5 items per order
                num_items = random.choices([1, 2, 3, 4, 5], weights=[30, 30, 20, 12, 8])[0]
                selected_products = random.sample(products, min(num_items, len(products)))

                subtotal = 0.0
                items_data = []

                for p in selected_products:
                    qty = random.choices([1, 2, 3, 4, 5, 10], weights=[30, 25, 18, 12, 10, 5])[0]

                    # Seasonal price adjustment
                    cat_boost = category_seasonal_boost(p.category, d)
                    unit_price = round(p.selling_price * (1 + random.uniform(-0.05, 0.08)), 2)

                    # Apply festive premium (5-15% higher during Diwali/Holi)
                    festive_mult = max(1.0, (HOLIDAY_DATES.get((d.year, d.month, d.day), 1.0) - 1.0) * 0.15 + 1.0)
                    unit_price = round(unit_price * festive_mult, 2)

                    item_total = round(qty * unit_price, 2)
                    subtotal += item_total
                    items_data.append({
                        "product": p,
                        "qty": qty,
                        "unit_price": unit_price,
                        "total": item_total,
                    })

                # Assign customer (70% have customer, 30% walk-in)
                customer = random.choice(customers) if random.random() > 0.3 else None

                discount_rate = random.uniform(0, 0.08)
                discount = round(subtotal * discount_rate, 2)
                gst_rate = 0.18
                gst = round(subtotal * gst_rate, 2)
                total = round(subtotal + gst - discount, 2)

                # Status weighted toward completed for past dates
                status_weights = [10, 5, 10, 60, 10] if d < end_date else [40, 20, 20, 5, 10]
                status = random.choices(list(OrderStatus), weights=status_weights)[0]

                o = Order(
                    order_number=next_order_number(),
                    shopkeeper_id=shopkeeper.id,
                    customer_id=customer.id if customer else None,
                    status=status,
                    payment_method=random.choice(list(PaymentMethod)),
                    subtotal=round(subtotal, 2),
                    discount=discount,
                    gst=gst,
                    total=total,
                    notes=random.choice([None, None, None, f"Order for {customer.company_name if customer else 'walk-in'}"]) if random.random() > 0.7 else None,
                    created_at=order_datetime,
                    updated_at=order_datetime + timedelta(hours=random.randint(1, 12)),
                )
                session.add(o)
                await session.flush()
                orders.append(o)
                total_orders_created += 1

                for item in items_data:
                    oi = OrderItem(
                        order_id=o.id,
                        product_id=item["product"].id,
                        product_name=item["product"].name,
                        quantity=item["qty"],
                        unit_price=item["unit_price"],
                        total_price=item["total"],
                    )
                    session.add(oi)
                    order_items_list.append(oi)

                    # Inventory movement for sale (subtract stock)
                    inv_mov = InventoryMovement(
                        product_id=item["product"].id,
                        shopkeeper_id=shopkeeper.id,
                        store_id=sk_store.id,
                        movement_type=MovementType.SALE,
                        quantity=-item["qty"],
                        reference=f"Order {o.order_number}",
                        notes=f"Sold {item['qty']} x {item['product'].name}",
                        created_at=order_datetime,
                    )
                    session.add(inv_mov)
                    sale_movements.append(inv_mov)

                # Generate invoice for completed/processing orders
                if status in (OrderStatus.COMPLETED, OrderStatus.PROCESSING, OrderStatus.CONFIRMED):
                    inv = Invoice(
                        invoice_number=next_invoice_number(),
                        order_id=o.id,
                        shopkeeper_id=shopkeeper.id,
                        customer_id=customer.id if customer else None,
                        pdf_url=None,
                        subtotal=o.subtotal,
                        discount=o.discount,
                        gst=o.gst,
                        total=o.total,
                        created_at=order_datetime + timedelta(minutes=random.randint(5, 120)),
                    )
                    session.add(inv)
                    invoices.append(inv)

            # Flush every 30 days to keep memory manageable
            if total_orders_created % 300 == 0 and total_orders_created > 0:
                await session.flush()
                print(f"  ... {total_orders_created} orders created so far")

        await session.flush()
        print(f"  {total_orders_created} orders created")
        print(f"  {len(order_items_list)} order items")
        print(f"  {len(sale_movements)} sale inventory movements")
        print(f"  {len(invoices)} invoices generated")

        # ---------------------------------------------------------------
        # 7. PURCHASE ORDERS (replenishment history)
        # ---------------------------------------------------------------
        print("Seeding Purchase Orders...")
        purchase_orders = []
        po_items_list = []

        # Generate POs over past 8 months
        po_start = end_date - timedelta(days=240)

        # Create ~60 POs (roughly 2 per supplier, distributed over time)
        for i in range(60):
            po_date = po_start + timedelta(days=random.randint(0, 240))
            if po_date > end_date:
                continue
            po_datetime = datetime(
                po_date.year, po_date.month, po_date.day,
                random.randint(9, 18), random.randint(0, 59),
                tzinfo=timezone.utc,
            )

            supplier = random.choice(suppliers)
            shopkeeper = random.choice(shopkeepers)

            # 3-8 items per PO
            num_items = random.randint(3, 8)
            po_products = random.sample(products, min(num_items, len(products)))

            po_total = 0.0
            items = []

            for p in po_products:
                qty = random.randint(20, 500)
                # Supplier price = 75-95% of cost price
                unit_price = round(p.cost_price * random.uniform(0.75, 0.95), 2)
                item_total = round(qty * unit_price, 2)
                po_total += item_total
                items.append({
                    "product_id": p.id,
                    "product_name": p.name,
                    "quantity": qty,
                    "unit_price": unit_price,
                    "total_price": item_total,
                })

            status = random.choices(list(POStatus), weights=[10, 15, 60, 15])[0]

            po = PurchaseOrder(
                po_number=next_po_number(),
                supplier_id=supplier.id,
                shopkeeper_id=shopkeeper.id,
                status=status,
                total=round(po_total, 2),
                notes=f"Replenishment batch for {shopkeeper.store_name}",
                created_at=po_datetime,
                updated_at=po_datetime + timedelta(hours=random.randint(2, 48)),
            )
            session.add(po)
            await session.flush()
            purchase_orders.append(po)

            for item in items:
                poi = PurchaseOrderItem(
                    purchase_order_id=po.id,
                    **item,
                )
                session.add(poi)
                po_items_list.append(poi)

            # For received POs, create purchase inventory movements
            if status == POStatus.RECEIVED:
                for item in items:
                    # Pick a store
                    po_store = random.choice(stores)
                    inv_mov = InventoryMovement(
                        product_id=item["product_id"],
                        shopkeeper_id=shopkeeper.id,
                        store_id=po_store.id,
                        movement_type=MovementType.PURCHASE,
                        quantity=item["quantity"],
                        reference=f"PO {po.po_number}",
                        notes=f"Stock received from {supplier.name}",
                        created_at=po_datetime + timedelta(days=random.randint(1, 7)),
                    )
                    session.add(inv_mov)

        await session.flush()
        print(f"  {len(purchase_orders)} purchase orders created")
        print(f"  {len(po_items_list)} purchase order items")

        # ---------------------------------------------------------------
        # 8. STOCK TRANSFERS
        # ---------------------------------------------------------------
        print("Seeding Stock Transfers...")
        transfers_created = 0
        for _ in range(20):
            src = random.choice(stores)
            dst = random.choice([s for s in stores if s.id != src.id])
            p = random.choice(products)
            qty = random.randint(5, 50)

            st = StockTransfer(
                product_id=p.id,
                from_store_id=src.id,
                to_store_id=dst.id,
                quantity=qty,
                status=random.choice(list(StockTransferStatus)),
                requested_by=random.choice(shopkeepers).id,
                approved_by=random.choice(all_users).id if random.random() > 0.3 else None,
                notes=f"Stock transfer: {p.name}",
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60)),
            )
            session.add(st)
            await session.flush()

            # Transfer out movement
            out_mov = InventoryMovement(
                product_id=p.id,
                shopkeeper_id=admin.id,
                store_id=src.id,
                movement_type=MovementType.TRANSFER_OUT,
                quantity=-qty,
                reference=f"StockTransfer-{st.id}",
                created_at=st.created_at,
            )
            session.add(out_mov)

            # Transfer in movement for completed/approved
            if st.status in (StockTransferStatus.COMPLETED, StockTransferStatus.APPROVED):
                in_mov = InventoryMovement(
                    product_id=p.id,
                    shopkeeper_id=admin.id,
                    store_id=dst.id,
                    movement_type=MovementType.TRANSFER_IN,
                    quantity=qty,
                    reference=f"StockTransfer-{st.id}",
                    created_at=st.created_at,
                )
                session.add(in_mov)
            transfers_created += 1
        print(f"  {transfers_created} stock transfers")

        # ---------------------------------------------------------------
        # 9. RETURNS & ADJUSTMENTS (a few random ones)
        # ---------------------------------------------------------------
        print("Seeding Returns & Adjustments...")
        for _ in range(15):
            p = random.choice(products)
            sk = random.choice(stores)
            sp = random.choice(shopkeepers)
            is_return = random.random() > 0.5
            qty = random.randint(1, 10)
            mt = MovementType.RETURN if is_return else MovementType.ADJUSTMENT
            sign = 1 if is_return else random.choice([-1, 1])
            im = InventoryMovement(
                product_id=p.id,
                shopkeeper_id=sp.id,
                store_id=sk.id,
                movement_type=mt,
                quantity=qty * sign,
                reference=f"{'Return' if is_return else 'Adjustment'}-{uuid.uuid4().hex[:8].upper()}",
                notes=f"{'Customer return' if is_return else 'Stock adjustment'} for {p.name}",
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 90)),
            )
            session.add(im)
        print(f"  15 return/adjustment movements")

        # ---------------------------------------------------------------
        # 10. NOTIFICATIONS
        # ---------------------------------------------------------------
        print("Seeding Notifications...")
        notifications = []
        notification_configs = [
            (NotificationType.LOW_STOCK, "Low Stock Alert", "{product} is running low ({stock} units remaining)", True),
            (NotificationType.LOW_STOCK, "Low Stock Alert", "{product} has only {stock} units left - reorder soon", True),
            (NotificationType.EXPIRY, "Expiry Warning", "{count} products will expire in the next 30 days", True),
            (NotificationType.EXPIRY, "Expiry Warning", "{product} expires on {date} - consider discounting", True),
            (NotificationType.PAYMENT_REMINDER, "Payment Due", "{customer} has an outstanding balance of Rs.{amount}", True),
            (NotificationType.PAYMENT_REMINDER, "Payment Overdue", "{customer}'s payment of Rs.{amount} is overdue by {days} days", True),
            (NotificationType.AI_RECOMMENDATION, "Restock Suggestion", "Consider restocking {category} - demand forecast shows {pct}% increase", True),
            (NotificationType.AI_RECOMMENDATION, "Seasonal Trend", "{category} demand expected to rise {pct}% next month due to {reason}", True),
            (NotificationType.AI_RECOMMENDATION, "Price Optimization", "Consider revising price of {product} - market rate is Rs.{price}", True),
            (NotificationType.LOW_STOCK, "Critical Stock", "{product} is out of stock in {store}", True),
            (NotificationType.AI_RECOMMENDATION, "Festive Opportunity", "Festive season approaching! Stock up on {category} for {festival}", True),
            (NotificationType.PAYMENT_REMINDER, "Credit Limit Warning", "{customer} has used {pct}% of credit limit (Rs.{used}/{limit})", True),
        ]

        low_stock_products = [p for p in products if p.stock_quantity <= p.reorder_threshold]
        if not low_stock_products:
            low_stock_products = products[:5]

        for ntype, title, msg_template, active in notification_configs:
            if not active:
                continue
            target_user = random.choice(all_users)

            msg = msg_template.format(
                product=random.choice(products).name if "{product" in msg_template else "",
                stock=random.randint(2, 15) if "{stock" in msg_template else 0,
                count=random.randint(3, 12) if "{count" in msg_template else 0,
                date=(datetime.now(timezone.utc) + timedelta(days=random.randint(5, 30))).strftime("%d %b %Y") if "{date" in msg_template else "",
                customer=random.choice(customers).company_name if "{customer" in msg_template else "",
                amount=random.randint(5000, 150000) if "{amount" in msg_template else 0,
                days=random.randint(7, 60) if "{days" in msg_template else 0,
                category=random.choice(list(PRODUCT_CATALOG.keys())) if "{category" in msg_template else "",
                pct=random.randint(15, 60) if "{pct" in msg_template else 0,
                reason=random.choice(["festive season", "weather change", "upcoming holidays", "market trend"]) if "{reason" in msg_template else "",
                price=random.randint(50, 5000) if "{price" in msg_template else 0,
                store=random.choice(stores).name if "{store" in msg_template else "",
                festival=random.choice(["Diwali", "Holi", "Pongal", "Eid", "Christmas", "Navratri"]) if "{festival" in msg_template else "",
                used=random.randint(10000, 500000) if "{used" in msg_template else 0,
                limit=random.randint(50000, 500000) if "{limit" in msg_template else 0,
                pct_used=random.randint(50, 95) if "{pct" in msg_template else 0,
            )

            n = Notification(
                user_id=target_user.id,
                type=ntype,
                title=title,
                message=msg,
                is_read=random.random() > 0.5,
                reference_id=random.choice(products).id if ntype in (NotificationType.LOW_STOCK, NotificationType.EXPIRY) else None,
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 168)),
            )
            session.add(n)
            notifications.append(n)
        print(f"  {len(notifications)} notifications")

        # ---------------------------------------------------------------
        # 11. AUDIT LOGS
        # ---------------------------------------------------------------
        print("Seeding Audit Logs...")
        audit_actions = [
            ("user.login", "User logged in", "session"),
            ("product.create", "Created new product", "product"),
            ("product.update", "Updated product price", "product"),
            ("order.create", "Created new order", "order"),
            ("order.update_status", "Updated order status", "order"),
            ("supplier.create", "Added new supplier", "supplier"),
            ("customer.create", "Registered new customer", "customer"),
            ("inventory.adjust", "Adjusted inventory count", "inventory"),
            ("stock.transfer", "Transferred stock between stores", "inventory"),
            ("report.generate", "Generated sales report", "report"),
            ("user.update", "Updated user profile", "user"),
            ("settings.update", "Updated store settings", "settings"),
        ]
        audit_logs_created = 0
        for day_offset in range(1, 90):
            if random.random() > 0.3:  # ~70% of days have audit logs
                continue
            log_date = datetime.now(timezone.utc) - timedelta(days=day_offset)
            num_logs = random.randint(1, 8)
            for _ in range(num_logs):
                action, desc, entity = random.choice(audit_actions)
                al = AuditLog(
                    user_id=random.choice(all_users).id,
                    action=action,
                    entity_type=entity,
                    entity_id=random.randint(1, 500),
                    details=f"{desc} by {random.choice(fname_list)} {random.choice(lname_list)}",
                    created_at=log_date + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59)),
                )
                session.add(al)
                audit_logs_created += 1
        print(f"  ~{audit_logs_created} audit log entries")

        # ---------------------------------------------------------------
        # FINAL COMMIT
        # ---------------------------------------------------------------
        await session.commit()

    # ---------------------------------------------------------------
    # Summary
    # ---------------------------------------------------------------
    elapsed = (datetime.now(timezone.utc) - start_ts).total_seconds()
    print("\n" + "=" * 60)
    print("  SEED COMPLETE")
    print("=" * 60)
    print(f"  Duration: {elapsed:.1f}s")
    print(f"\n  Users: {1 + len(shopkeepers) + len(customer_users)} ({len(shopkeepers)} shopkeepers, {len(customer_users)} customers)")
    print(f"  Stores: {len(stores)}")
    print(f"  Products: {len(products)}")
    print(f"  Suppliers: {len(suppliers)}")
    print(f"  Customers: {len(customers)}")
    print(f"  Orders: {total_orders_created}")
    print(f"  Order Items: {len(order_items_list)}")
    print(f"  Invoices: {len(invoices)}")
    print(f"  Purchase Orders: {len(purchase_orders)}")
    print(f"  Purchase Order Items: {len(po_items_list)}")
    print(f"  Sale Movements: {len(sale_movements)}")
    print(f"  Stock Transfers: {transfers_created}")
    print(f"  Notifications: {len(notifications)}")
    print(f"  Audit Logs: ~{audit_logs_created}")
    print(f"\n  Credentials:")
    print(f"    Admin:     admin@khatabox.com / Admin@123")
    print(f"    Shopkeeper: <shop_name>@khatabox.com / Shop@123")
    print(f"    Customer:  <customer_email> / customer123")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
