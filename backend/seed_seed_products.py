"""Seed the seed_products table — works on Neon (no superuser perms needed)."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

SEED_PRODUCT_CATALOG = {
    "kirana": [
        ("Basmati Rice 1kg", "RICE", "Groceries & Staples", 120, 60),
        ("Basmati Rice 5kg", "RICE", "Groceries & Staples", 550, 290),
        ("Sonam Masoori Rice 5kg", "RICE", "Groceries & Staples", 380, 200),
        ("Wheat Flour (Atta) 5kg", "ATTA", "Groceries & Staples", 260, 140),
        ("Wheat Flour (Atta) 10kg", "ATTA", "Groceries & Staples", 499, 275),
        ("Sugar 1kg", "SUGR", "Groceries & Staples", 48, 38),
        ("Sugar 5kg", "SUGR", "Groceries & Staples", 235, 185),
        ("Salt 1kg", "SALT", "Groceries & Staples", 25, 12),
        ("Toor Dal 1kg", "TDAL", "Groceries & Staples", 150, 85),
        ("Moong Dal 1kg", "MDAL", "Groceries & Staples", 130, 70),
        ("Chana Dal 1kg", "CDAL", "Groceries & Staples", 110, 55),
        ("Masoor Dal 1kg", "MSR", "Groceries & Staples", 120, 65),
        ("Refined Oil 1L", "OIL", "Groceries & Staples", 195, 120),
        ("Mustard Oil 1L", "OIL", "Groceries & Staples", 230, 150),
        ("Ghee 500ml", "GHEE", "Groceries & Staples", 380, 225),
        ("Ghee 1L", "GHEE", "Groceries & Staples", 720, 440),
        ("Tea 250g", "TEA", "Beverages", 225, 120),
        ("Coffee 100g", "COFF", "Beverages", 295, 150),
        ("Biscuits Pack 200g", "BISC", "Groceries & Staples", 50, 25),
        ("Cooking Soda 200g", "SODA", "Groceries & Staples", 30, 15),
        ("Turmeric Powder 100g", "TURM", "Groceries & Staples", 50, 25),
        ("Red Chilli Powder 100g", "CHIL", "Groceries & Staples", 65, 30),
        ("Coca-Cola 750ml", "COLA", "Beverages", 45, 25),
        ("Pepsi 750ml", "PEPS", "Beverages", 45, 25),
        ("Bisleri Water 1L", "WTR", "Beverages", 20, 12),
        ("Cooking Butter 500g", "BUTR", "Groceries & Staples", 320, 180),
        ("Cheese Slices 200g", "CHSE", "Groceries & Staples", 180, 95),
        ("Paneer 200g", "PNR", "Groceries & Staples", 120, 70),
        ("LED Bulb 9W", "BULB", "Electronics", 85, 45),
        ("Candle Set 6 Multi-color", "CAND", "Festive & Decoration", 150, 60),
        ("Bathing Soap Pack 3", "SOAP", "Personal Care & Beauty", 135, 60),
        ("Toothpaste 150g", "PSTE", "Personal Care & Beauty", 140, 60),
        ("Shampoo 200ml", "SHMP", "Personal Care & Beauty", 180, 80),
        ("Detergent Powder 1kg", "DTER", "Home & Kitchen", 120, 65),
        ("Dishwash Liquid 500ml", "DSHW", "Home & Kitchen", 95, 50),
    ],
    "supermart": [
        ("Basmati Rice 5kg", "RICE", "Groceries & Staples", 550, 290),
        ("Basmati Rice 10kg", "RICE", "Groceries & Staples", 1050, 560),
        ("Wheat Flour (Atta) 10kg", "ATTA", "Groceries & Staples", 499, 275),
        ("Sugar 5kg", "SUGR", "Groceries & Staples", 235, 185),
        ("Toor Dal 5kg", "TDAL", "Groceries & Staples", 720, 400),
        ("Refined Oil 5L", "OIL", "Groceries & Staples", 950, 590),
        ("Ghee 1L", "GHEE", "Groceries & Staples", 720, 440),
        ("Coca-Cola 2.25L", "COLA", "Beverages", 85, 50),
        ("Pepsi 2.25L", "PEPS", "Beverages", 85, 50),
        ("Bisleri Water 20L", "WTR", "Beverages", 75, 40),
        ("Maaza Mango Drink 1L", "MAAZ", "Beverages", 75, 40),
        ("Real Fruit Juice 1L", "JUIC", "Beverages", 120, 65),
        ("Green Tea 25 bags", "GTEA", "Beverages", 150, 75),
        ("Tata Tea Premium 500g", "TATE", "Beverages", 275, 160),
        ("Bru Coffee 200g", "BRCO", "Beverages", 450, 250),
        ("Fortune Sunflower Oil 5L", "FORT", "Groceries & Staples", 875, 540),
        ("Aashirvaad Atta 10kg", "AASH", "Groceries & Staples", 525, 310),
        ("Britannia Good Day 300g", "BRIT", "Groceries & Staples", 90, 50),
        ("Parle G 800g", "PARL", "Groceries & Staples", 80, 45),
        ("Nestle Maggi 12 Pack", "MAGI", "Groceries & Staples", 140, 85),
        ("Amul Butter 500g", "AMUL", "Groceries & Staples", 320, 180),
        ("Amul Cheese Slices 400g", "AMUL", "Groceries & Staples", 340, 195),
        ("Surf Excel Detergent 4kg", "SRFX", "Home & Kitchen", 580, 360),
        ("Tide Plus 2kg", "TIDE", "Home & Kitchen", 340, 200),
        ("Harpic Liquid 1L", "HRPC", "Home & Kitchen", 180, 100),
        ("Colgate Toothpaste 200g", "CLGA", "Personal Care & Beauty", 195, 110),
        ("Dove Shampoo 400ml", "DOVE", "Personal Care & Beauty", 340, 190),
        ("Lux Soap Pack 6", "LUX", "Personal Care & Beauty", 285, 160),
        ("Pears Soap Pack 4", "PEAR", "Personal Care & Beauty", 240, 140),
        ("Nivea Body Lotion 400ml", "NIVE", "Personal Care & Beauty", 495, 280),
        ("Kellogg's Corn Flakes 500g", "KELF", "Groceries & Staples", 280, 165),
        ("Saffola Gold Oil 5L", "SAFF", "Groceries & Staples", 990, 620),
        ("Patanjali Ghee 1L", "PATJ", "Groceries & Staples", 680, 410),
        ("MTR Ready Mix Pack 6", "MTR", "Groceries & Staples", 240, 140),
    ],
    "pharmacy": [
        ("Paracetamol 500mg Strip 15", "CRO", "Medicines & Wellness", 35, 10),
        ("Paracetamol 650mg Strip 15", "CRO", "Medicines & Wellness", 40, 12),
        ("Vitamin C Tablets 60", "VITC", "Medicines & Wellness", 120, 45),
        ("Multivitamin Tablets 30", "VITM", "Medicines & Wellness", 150, 60),
        ("Cough Syrup 100ml", "COGH", "Medicines & Wellness", 85, 35),
        ("Cough Syrup 200ml", "COGH", "Medicines & Wellness", 145, 60),
        ("Antacid Tablets Strip 10", "ANTC", "Medicines & Wellness", 40, 15),
        ("Antacid Liquid 200ml", "ANTC", "Medicines & Wellness", 110, 50),
        ("Band Aid Pack 20", "BAND", "Medicines & Wellness", 50, 20),
        ("Gauze Roll", "GAUZ", "Medicines & Wellness", 35, 15),
        ("Cotton Wool 100g", "CTTN", "Medicines & Wellness", 65, 30),
        ("Dettol Antiseptic 200ml", "DETT", "Medicines & Wellness", 115, 55),
        ("Savlon Antiseptic 200ml", "SAVL", "Medicines & Wellness", 105, 50),
        ("Pain Balm 30g", "PBLM", "Medicines & Wellness", 75, 30),
        ("Volini Gel 50g", "VOLI", "Medicines & Wellness", 140, 65),
        ("Eye Drops 10ml", "EYED", "Medicines & Wellness", 70, 30),
        ("Allergy Relief Tablets 10", "ALGY", "Medicines & Wellness", 60, 25),
        ("Antiseptic Cream 30g", "ANTI", "Medicines & Wellness", 55, 25),
        ("ORH Pack 5", "ORHS", "Medicines & Wellness", 35, 15),
        ("Digital Thermometer", "THRM", "Medicines & Wellness", 150, 60),
        ("BP Monitor", "BPMO", "Medicines & Wellness", 2200, 1200),
        ("Glucose Meter", "GLUC", "Medicines & Wellness", 999, 500),
        ("Surgical Mask Box 50", "MASK", "Medicines & Wellness", 350, 150),
        ("Sanitizer 500ml", "SNTZ", "Medicines & Wellness", 130, 60),
        ("Hand Sanitizer 200ml", "SNTZ", "Medicines & Wellness", 75, 35),
        ("Moov Pain Relief 30g", "MOOV", "Medicines & Wellness", 85, 35),
        ("Digene Tablets 24", "DIGN", "Medicines & Wellness", 95, 45),
        ("Crocin 500mg Strip 15", "CROC", "Medicines & Wellness", 30, 10),
        ("Dolo 650mg Strip 15", "DOLO", "Medicines & Wellness", 42, 14),
    ],
    "electronics": [
        ("LED Bulb 9W", "BULB", "Electronics", 85, 45),
        ("LED Bulb 12W", "BULB", "Electronics", 110, 55),
        ("LED Tube Light 20W", "BULB", "Electronics", 320, 180),
        ("Table Fan", "FAN", "Electronics", 1499, 850),
        ("Ceiling Fan", "FAN", "Electronics", 2200, 1200),
        ("Exhaust Fan", "FAN", "Electronics", 1100, 600),
        ("Electric Kettle 1.5L", "KETL", "Electronics", 895, 450),
        ("Toaster 2-Slice", "TOST", "Electronics", 950, 500),
        ("Mixer Grinder 750W", "MIXR", "Electronics", 3200, 1800),
        ("Electric Iron Dry", "IRON", "Electronics", 850, 450),
        ("Electric Iron Steam", "IRON", "Electronics", 1350, 700),
        ("Extension Board 6-way", "EXTN", "Electronics", 350, 150),
        ("USB Charger 3.1A", "USB", "Electronics", 250, 120),
        ("Power Bank 10000mAh", "PWBN", "Electronics", 999, 500),
        ("Bluetooth Speaker", "BTSP", "Electronics", 1299, 600),
        ("Wired Mouse", "MOUS", "Electronics", 350, 150),
        ("Wireless Mouse", "MOUS", "Electronics", 699, 350),
        ("Keyboard USB", "KYBD", "Electronics", 550, 250),
        ("HDMI Cable 2m", "HDMI", "Electronics", 299, 120),
        ("Mobile Cover", "MCOV", "Electronics", 199, 50),
        ("Tempered Glass Screen Guard", "GLSS", "Electronics", 99, 30),
        ("USB Hub 4-port", "USBH", "Electronics", 550, 250),
        ("Smart Plug WiFi", "SPLG", "Electronics", 999, 500),
        ("Selfie Stick", "SELF", "Electronics", 299, 120),
        ("OTG Cable", "OTGC", "Electronics", 180, 80),
    ],
    "clothing": [
        ("Cotton T-Shirt Men", "TSHT", "Clothing & Fashion", 599, 250),
        ("Polo T-Shirt Men", "POLO", "Clothing & Fashion", 799, 350),
        ("Formal Shirt Men", "SHFT", "Clothing & Fashion", 999, 400),
        ("Casual Shirt Men", "SHFT", "Clothing & Fashion", 899, 350),
        ("Jeans Men", "JEAN", "Clothing & Fashion", 1499, 600),
        ("Chinos Men", "CHNO", "Clothing & Fashion", 1299, 500),
        ("Trousers Men", "TRSR", "Clothing & Fashion", 1199, 450),
        ("Cotton T-Shirt Women", "TSHT", "Clothing & Fashion", 599, 250),
        ("Kurta Women", "KURT", "Clothing & Fashion", 999, 450),
        ("Salwar Suit Set", "SLWR", "Clothing & Fashion", 1299, 500),
        ("Saree", "SARE", "Clothing & Fashion", 1999, 400),
        ("Leggings", "LEGG", "Clothing & Fashion", 499, 200),
        ("Tops Women", "TOPS", "Clothing & Fashion", 699, 300),
        ("Kids T-Shirt", "KTSH", "Clothing & Fashion", 399, 150),
        ("Kids Frock", "KFRO", "Clothing & Fashion", 699, 300),
        ("Kids Shorts", "KSHT", "Clothing & Fashion", 349, 150),
        ("Shorts Men", "SHRT", "Clothing & Fashion", 599, 250),
        ("Socks Pair Pack 3", "SOCK", "Clothing & Fashion", 199, 80),
        ("Belt Men", "BELT", "Clothing & Fashion", 499, 200),
        ("Cap", "CAP", "Clothing & Fashion", 299, 100),
        ("Scarf", "SCAR", "Clothing & Fashion", 399, 150),
        ("Lungi", "LUNG", "Clothing & Fashion", 399, 200),
        ("Dhoti", "DHOT", "Clothing & Fashion", 350, 180),
        ("Handkerchief Pack 5", "HNDK", "Clothing & Fashion", 125, 50),
        ("Innerwear Vest Pack 3", "INNR", "Clothing & Fashion", 349, 150),
    ],
    "restaurant": [
        ("Basmati Rice 5kg", "RICE", "Groceries & Staples", 550, 290),
        ("Wheat Flour (Atta) 5kg", "ATTA", "Groceries & Staples", 260, 140),
        ("Refined Oil 5L", "OIL", "Groceries & Staples", 950, 590),
        ("Ghee 1L", "GHEE", "Groceries & Staples", 720, 440),
        ("Toor Dal 5kg", "TDAL", "Groceries & Staples", 720, 400),
        ("Tea 250g", "TEA", "Beverages", 225, 120),
        ("Coffee 200g", "COFF", "Beverages", 450, 250),
        ("Sugar 5kg", "SUGR", "Groceries & Staples", 235, 185),
        ("Salt 1kg", "SALT", "Groceries & Staples", 25, 12),
        ("Turmeric Powder 500g", "TURM", "Groceries & Staples", 200, 100),
        ("Red Chilli Powder 500g", "CHIL", "Groceries & Staples", 280, 140),
        ("Cooking Butter 500g", "BUTR", "Groceries & Staples", 320, 180),
        ("Cheese Slices 400g", "CHSE", "Groceries & Staples", 340, 195),
        ("Paneer 1kg", "PNR", "Groceries & Staples", 480, 300),
        ("Coca-Cola 2.25L", "COLA", "Beverages", 85, 50),
        ("Bisleri Water 20L", "WTR", "Beverages", 75, 40),
        ("Paper Boat Aamras 200ml", "PBOA", "Beverages", 40, 20),
        ("Paper Boat Jaljeera 200ml", "PBOA", "Beverages", 40, 20),
        ("Green Chilli 1kg", "GCHL", "Groceries & Staples", 60, 30),
        ("Lemon 1kg", "LEMN", "Groceries & Staples", 120, 50),
        ("Potato 10kg", "POTA", "Groceries & Staples", 250, 150),
        ("Onion 10kg", "ONIN", "Groceries & Staples", 300, 180),
        ("Tomato 10kg", "TOMA", "Groceries & Staples", 400, 200),
        ("Garlic 1kg", "GARL", "Groceries & Staples", 280, 150),
        ("Ginger 1kg", "GING", "Groceries & Staples", 200, 100),
        ("Dishwash Liquid 1L", "DSHW", "Home & Kitchen", 180, 100),
        ("Hand Wash 250ml", "HWAS", "Personal Care & Beauty", 140, 60),
        ("Tissue Paper Pack 200", "TISU", "Home & Kitchen", 120, 60),
        ("Aluminium Foil Roll", "ALFO", "Home & Kitchen", 180, 100),
        ("Cling Wrap Roll", "CLING", "Home & Kitchen", 150, 80),
    ],
}

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_3OHUh6oqskSP@ep-damp-meadow-aqu8cl38-pooler.c-8.us-east-1.aws.neon.tech/neondb"


async def seed():
    engine = create_async_engine(DATABASE_URL, pool_size=1)
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT COUNT(*) FROM seed_products"))
        if r.scalar():
            print("seed_products already populated — skipping")
            return

        # Bulk insert using multiple value rows (much faster on Neon)
        all_rows = []
        for store_type, items in SEED_PRODUCT_CATALOG.items():
            for name, sku_prefix, category, selling_price, cost_price in items:
                all_rows.append(
                    f"('{store_type}', '{name.replace(chr(39), chr(39)+chr(39))}', '{sku_prefix}', "
                    f"'{category}', {float(selling_price)}, {float(cost_price)}, NOW())"
                )
        batch_size = 50
        for i in range(0, len(all_rows), batch_size):
            batch = all_rows[i:i+batch_size]
            sql = "INSERT INTO seed_products (store_type, name, sku_prefix, category, default_selling_price, default_cost_price, created_at) VALUES " + ",".join(batch)
            await conn.execute(text(sql))
        await conn.commit()
        print(f"Inserted {len(all_rows)} seed products across {len(SEED_PRODUCT_CATALOG)} store types")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
