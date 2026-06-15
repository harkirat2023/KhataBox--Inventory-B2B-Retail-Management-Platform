# KhataBox Indian Demo Data Seeder

Seeds the KhataBox database with realistic Indian demo data across all 14 tables.

## Quick Start

```bash
cd backend
python seed_india.py
```

## Prerequisites

- Python 3.12+
- PostgreSQL running with the `khatabox` database created
- Dependencies installed: `pip install -r requirements.txt`
- Alembic migrations applied: `alembic upgrade head`

## What Gets Seeded

| Entity | Count | Details |
|--------|-------|---------|
| Admin | 1 | admin@khatabox.com |
| Shopkeepers | 15 | One per Indian city |
| Stores | 16 | 15 shopkeeper stores + 1 admin office |
| Products | 350+ | 14 categories, 25 products each |
| Suppliers | 30 | Diverse industry coverage |
| Customers | 100 | B2B across industries |
| Orders | 1000+ | 12 months of sales history |
| Order Items | 1000+ | 1-5 items per order |
| Invoices | ~700 | For completed/processing orders |
| Purchase Orders | ~60 | Replenishment history |
| PO Items | ~300 | 3-8 items per PO |
| Sale Movements | 1000+ | One per order item |
| Stock Transfers | 20 | Inter-store transfers |
| Returns/Adjustments | 15 | Random return/adjust events |
| Notifications | 12 | All 4 types |
| Audit Logs | ~500 | Historical activity log |

## Seasonal Patterns

The sales data spans 12+ months and includes:

| Pattern | Effect | Categories Affected |
|---------|--------|-------------------|
| **Diwali (Oct-Nov)** | 2.5x-3x demand surge | Electronics, Festive, Clothing |
| **Holi (Mar)** | 2x-2.5x demand spike | Beverages, Clothing, Festive |
| **Summer (Apr-Jun)** | 1.5x-2x boost | Beverages (+100%), Electronics |
| **Winter (Nov-Feb)** | 1.5x-1.6x boost | Medicines & Wellness |
| **Weekends** | 1.3x multiplier | All categories |
| **Monsoon (Jul-Sep)** | Slight dampening | General retail |

## Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@khatabox.com` | `Admin@123` |
| **Shopkeepers** | `<shop_name>@khatabox.com` | `Shop@123` |
| **Customers** | `contact.<company>@client.com` | `customer123` |

### Shopkeeper Accounts

| Shop Name | City | Email |
|-----------|------|-------|
| City Electronics | Mumbai | `cityelectronics@khatabox.com` |
| MegaMart Grocery | Delhi | `megamartgrocery@khatabox.com` |
| Trends Fashion | Bangalore | `trendsfashion@khatabox.com` |
| MedLife Pharmacy | Hyderabad | `medlifepharmacy@khatabox.com` |
| Stationery Hub | Ahmedabad | `stationeryhub@khatabox.com` |
| Home Essentials | Chennai | `homeessentials@khatabox.com` |
| Wellness Care | Kolkata | `wellnesscare@khatabox.com` |
| Saraaf Electronics | Pune | `saraafelectronics@khatabox.com` |
| FreshMart | Jaipur | `freshmart@khatabox.com` |
| Fashion Point | Lucknow | `fashionpoint@khatabox.com` |
| General Store | Surat | `generalstore@khatabox.com` |
| Health Pharmacy | Indore | `healthpharmacy@khatabox.com` |
| Book & More | Bhopal | `bookandmore@khatabox.com` |
| City Mall | Chandigarh | `citymall@khatabox.com` |
| Patna Bazaar | Patna | `patnabazaar@khatabox.com` |

## Idempotency

The script is **idempotent**: re-running it will:
1. Detect existing admin user
2. Delete all data from all tables (except users)
3. Re-seed from scratch with fresh data

## Product Categories (14)

| Category | Count | GST Slab |
|----------|-------|----------|
| Electronics | 25 | 18% |
| Groceries & Staples | 25 | 5% |
| Beverages | 20 | 12% |
| Clothing & Fashion | 25 | 12% |
| Medicines & Wellness | 25 | 12% |
| Stationery & Office | 25 | 12% |
| Home & Kitchen | 25 | 18% |
| Personal Care & Beauty | 25 | 18% |
| Baby & Kids | 20 | 12% |
| Automotive & Accessories | 20 | 18% |
| Sports & Fitness | 20 | 12% |
| Pet Supplies | 20 | 12% |
| Festive & Decoration | 25 | 18% |

**Total: 300+ products**

## Data Generation Approach

- Uses `Faker` with `en_IN` locale for Indian names, addresses, phone numbers
- All prices in INR with realistic cost/margin structures
- GST numbers follow Indian format: `27AAAAA0000A1Z5`
- Order numbers: `ORD-YYYYMM-XXXXX`
- Invoice numbers: `INV-YYYYMMDD-XXXXX`
- PO numbers: `PO-YYYYMM-XXXXX`
- SKU format: `CAT-0001` (sequenced per category)

## Forecasting Readiness

The 12+ months of order data provides a rich historical dataset for:
- Demand forecasting (product-level aggregation)
- Seasonal trend analysis
- Customer lifetime value (CLV) reports
- Top customer and repeat purchase analysis
- Expiry tracking for medicines/groceries/baby products

## Verification

After seeding, verify with:

```bash
python -c "
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def verify():
    async with engine.connect() as conn:
        tables = ['users','stores','products','suppliers','customers',
                  'orders','order_items','invoices','purchase_orders',
                  'purchase_order_items','inventory_movements',
                  'stock_transfers','notifications','audit_logs']
        for t in tables:
            r = await conn.execute(text(f'SELECT count(*) FROM {t}'))
            print(f'{t:25s}: {r.scalar()}')

asyncio.run(verify())
"
```
