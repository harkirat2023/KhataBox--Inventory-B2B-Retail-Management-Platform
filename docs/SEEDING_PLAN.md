---
title: KhataBox Seeding Plan
description: Database seeding strategy, scripts, and data.
---

# Seeding Plan

## Overview
Two seed scripts populate the database with realistic Indian market data.
The system has 24 tables, 12 enums, 25 migrations, and 11,531+ records.

---

## Script 1: seed_india.py (1413 lines)

### Purpose
Full DB seeding with realistic Indian business data. Idempotent on re-run.

### Tables Seeded (14)
1. users - Admin + 6 shopkeepers + customers per store
2. stores - 6 stores (one per type: grocery, electronics, etc.)
3. products - 20-30 products per store with Indian brands/pricing
4. suppliers - 2-3 per store
5. customers - 5-8 per store with phone/credit data
6. orders - 15-25 per store with various statuses
7. order_items - Items for each order
8. receipts + receipt_items - For completed orders
9. inventory_movements - Stock change tracking
10. purchase_orders + purchase_order_items - 5-8 per store
11. transfers - 3-5 inter-store transfers
12. notifications - Sample notifications
13. audit_logs - Sample audit entries
14. payments - For completed orders
15. b2c_orders + b2c_order_items - B2C sample orders
16. customer_carts + customer_cart_items - Sample carts

### Seeding Logic
- Status weights for varied order status distribution
- Realistic Indian product names (Amul, Tata, Britannia, etc.)
- Proper GST rates (0%, 5%, 12%, 18%, 28%)
- Credit tracking for B2B customers
- Uses SET session_replication_role = replica to bypass FK order
- Deletes non-admin users on re-run for idempotency

---

## Script 2: seed_seed_products.py (229 lines)

### Purpose
Seeds the seed_products reference table with 178 products across 6 store types.
Used by the Setup Inventory wizard for new stores.

### Products by Store Type
- Grocery: 38 products (staples, dairy, beverages, snacks, spices)
- Electronics: 28 products (mobiles, accessories, appliances)
- Clothing: 30 products (men, women, kids, accessories)
- General: 32 products (household, personal care, stationery)
- Medical: 26 products (medicines, first aid, supplements)
- Fashion: 24 products (apparel, footwear, accessories)

### Technical Details
- Uses batched INSERT (no superuser needed for Neon)
- Skips existing products (idempotent)
- Each product has: name, description, category, brand, unit, store_type, image_url
- Compatible with Neon PostgreSQL (no CREATE TYPE needed)

---

## Database State
- 14 tables created + populated
- 11,531+ total records
- 178 seed product references
- 25 migrations applied
- 12 enums defined

## Access Credentials
- Admin: admin@khatabox.com / Admin@123
- Shopkeeper: {store}@khatabox.com / Shop@123
- Customer: contact.{store}@client.com / customer123

## Re-seeding
Run seed_india.py to reset all data (preserves admin user).
Run seed_seed_products.py to (re)populate seed_products table.
Both scripts are idempotent.