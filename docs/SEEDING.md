# Seeding Demo Data

## Quick Start

Run the idempotent seeder against your configured database:

```bash
# Activate your Python environment first (e.g., .venv\Scripts\activate)
python backend/scripts/seed_demo_data.py
```

The seeder checks for existing records by email (users), SKU (products), order number (orders), and store name (stores). Safe to run multiple times — existing records are skipped.

## What It Seeds (per run)

| Entity            | Count    | Details                                |
|-------------------|----------|----------------------------------------|
| Admin             | 1        | `admin@khatabox.com` / `Admin@123`     |
| Shopkeepers       | 15       | Across kirana, supermart, pharmacy, electronics, clothing, restaurant, other |
| Stores            | 15       | One per shopkeeper, spread across 15 Indian cities |
| Customers         | 180      | 12 per shopkeeper, with realistic credit limits & usage |
| Suppliers         | 225      | 15 per shopkeeper (Indian FMCG brands) |
| Products          | ~2000+   | 100+ per store across 8 categories (Groceries, Beverages, Electronics, Medicines, Clothing, Stationery, Personal Care, Home & Kitchen) |
| Orders            | ~800-900 | 3-6 months of historical orders per shopkeeper |
| Purchase Orders   | ~250-350 | 2-4 months of historical POs per shopkeeper |
| Notifications     | ~300     | 20 per shopkeeper (mixed types, recent) |
| Seed Products     | ~40      | Onboarding products for 6 store types |

**Database.** Uses whichever `DATABASE_URL` is configured in `backend/.env`. By default this points to the Neon remote database. To seed locally, comment out the Neon URL and uncomment the local one:

```
# Local
DATABASE_URL=postgresql+asyncpg://khatabox:khatabox123@localhost:5432/khatabox
```

## Notes

- **Idempotent.** Re-running only adds missing records; no duplicates.
- **Deterministic.** Uses `Faker.seed(42)` and `random.seed(42)` for reproducibility.
- **One-time use.** Designed for demo/staging environments, not production.
