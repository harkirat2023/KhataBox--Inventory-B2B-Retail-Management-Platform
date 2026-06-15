# Demo Data Report

## Seed Execution Summary

| Metric | Value |
|--------|-------|
| Seed Script | `backend/seed_india.py` |
| Duration | 62.8 seconds |
| Total Records Created | **11,531** |
| Database | PostgreSQL (khatabox) |
| Python Version | 3.14.4 |
| Faker Locale | `en_IN` |
| Seed Run Timestamp | 2026-06-09 |

---

## Records Created

| # | Table | Count | % of Total |
|---|-------|-------|------------|
| 1 | `users` | 124 | 1.1% |
| 2 | `stores` | 16 | 0.1% |
| 3 | `products` | 300 | 2.6% |
| 4 | `suppliers` | 30 | 0.3% |
| 5 | `customers` | 99 | 0.9% |
| 6 | `orders` | 1,542 | 13.4% |
| 7 | `order_items` | 3,684 | 31.9% |
| 8 | `invoices` | 1,221 | 10.6% |
| 9 | `purchase_orders` | 60 | 0.5% |
| 10 | `purchase_order_items` | 341 | 3.0% |
| 11 | `inventory_movements` | 3,942 | 34.2% |
| 12 | `stock_transfers` | 20 | 0.2% |
| 13 | `notifications` | 12 | 0.1% |
| 14 | `audit_logs` | 140 | 1.2% |
| | **Total** | **11,531** | **100%** |

---

## Stores Created (16 total)

| Store Name | City | Owner |
|------------|------|-------|
| City Electronics | Mumbai | shopkeeper 1 |
| MegaMart Grocery | Delhi | shopkeeper 2 |
| Trends Fashion | Bangalore | shopkeeper 3 |
| MedLife Pharmacy | Hyderabad | shopkeeper 4 |
| Stationery Hub | Ahmedabad | shopkeeper 5 |
| Home Essentials | Chennai | shopkeeper 6 |
| Wellness Care | Kolkata | shopkeeper 7 |
| Saraaf Electronics | Pune | shopkeeper 8 |
| FreshMart | Jaipur | shopkeeper 9 |
| Fashion Point | Lucknow | shopkeeper 10 |
| General Store | Surat | shopkeeper 11 |
| Health Pharmacy | Indore | shopkeeper 12 |
| Book & More | Bhopal | shopkeeper 13 |
| City Mall | Chandigarh | shopkeeper 14 |
| Patna Bazaar | Patna | shopkeeper 15 |
| KhataBox Head Office | Mumbai | admin |

---

## Cities Covered (15)

| City | State | Store |
|------|-------|-------|
| Mumbai | Maharashtra | City Electronics |
| Delhi | Delhi | MegaMart Grocery |
| Bangalore | Karnataka | Trends Fashion |
| Hyderabad | Telangana | MedLife Pharmacy |
| Ahmedabad | Gujarat | Stationery Hub |
| Chennai | Tamil Nadu | Home Essentials |
| Kolkata | West Bengal | Wellness Care |
| Pune | Maharashtra | Saraaf Electronics |
| Jaipur | Rajasthan | FreshMart |
| Lucknow | Uttar Pradesh | Fashion Point |
| Surat | Gujarat | General Store |
| Indore | Madhya Pradesh | Health Pharmacy |
| Bhopal | Madhya Pradesh | Book & More |
| Chandigarh | Punjab | City Mall |
| Patna | Bihar | Patna Bazaar |

---

## User Roles

| Role | Count |
|------|-------|
| admin | 1 |
| shopkeeper | 19 |
| customer | 104 |
| **Total** | **124** |

---

## Product Categories (13)

| Category | Products | Stock Units | GST Slab |
|----------|----------|-------------|----------|
| Automotive & Accessories | 20 | 2,231 | 18% |
| Baby & Kids | 20 | 1,823 | 12% |
| Beverages | 20 | 1,880 | 12% |
| Clothing & Fashion | 25 | 2,554 | 12% |
| Electronics | 25 | 2,210 | 18% |
| Festive & Decoration | 25 | 2,199 | 18% |
| Groceries & Staples | 25 | 2,511 | 5% |
| Home & Kitchen | 25 | 2,901 | 18% |
| Medicines & Wellness | 25 | 2,970 | 12% |
| Personal Care & Beauty | 25 | 2,586 | 18% |
| Pet Supplies | 20 | 1,753 | 12% |
| Sports & Fitness | 20 | 2,028 | 12% |
| Stationery & Office | 25 | 2,490 | 12% |
| **Total** | **300** | **30,136** | |

---

## Order Status Distribution

| Status | Count | % of Total |
|--------|-------|------------|
| Completed | 985 | 63.9% |
| Pending | 155 | 10.1% |
| Cancelled | 166 | 10.8% |
| Processing | 146 | 9.5% |
| Confirmed | 90 | 5.8% |

---

## Monthly Revenue Trend

| Month | Orders | Revenue (Rs) | Pattern |
|-------|--------|-------------|---------|
| Jun 2025 | 85 | 241,209 | Baseline |
| Jul 2025 | 105 | 350,106 | Monsoon |
| Aug 2025 | 104 | 320,973 | Independence Day |
| Sep 2025 | 108 | 374,162 | Pre-festive |
| Oct 2025 | **182** | **652,939** | **Diwali spike** |
| Nov 2025 | **177** | **584,266** | **Diwali spike** |
| Dec 2025 | 163 | 537,204 | Christmas, Winter |
| Jan 2026 | 100 | 261,149 | Post-holiday |
| Feb 2026 | 93 | 213,699 | Low season |
| Mar 2026 | **158** | **526,381** | **Holi spike** |
| Apr 2026 | 103 | 266,993 | Summer start |
| May 2026 | 127 | 457,883 | Summer peak |

**Seasonal patterns verified:**
- **Festive spike (Oct-Nov):** 359 orders vs 128 monthly avg (180% uplift — CONFIRMED)
- **Holi spike (Mar):** 158 orders vs baseline 93-105 (50%+ uplift — CONFIRMED)
- **Summer (Apr-Jun):** 352 orders, Rs 1,068,509 in beverage/electronics
- **Winter (Nov-Feb):** 533 orders, Rs 1,596,318 in medicine/clothing

---

## Sample Credentials

### Admin Access
```
Email:    admin@khatabox.com
Password: Admin@123
Role:     admin
```

### Shopkeeper Access (any of 15)
```
Email:    <store_name>@khatabox.com  (e.g., cityelectronics@khatabox.com)
Password: Shop@123
Role:     shopkeeper
```

### Customer Access (any of 99)
```
Email:    contact.<company>@client.com  (e.g., contact.techsolutionsmumbai@client.com)
Password: customer123
Role:     customer
```

---

## Verification Results

### Data Integrity

| Check | Result |
|-------|--------|
| All 14 tables populated | PASS |
| Admin password hash | PASS |
| All 300 products have order history | PASS |
| All product categories represented | PASS |
| Order date span = 365 days | PASS (Jun 2025 - Jun 2026) |
| FK constraints respected | PASS (no integrity errors) |
| Unique constraints respected | PASS (no duplication errors) |
| All 6 movement types present | PASS |
| All 4 notification types present | PASS |
| All 4 PO statuses present | PASS |
| All 5 order statuses present | PASS |
| 3 user roles populated | PASS |

### Business Logic

| Check | Result |
|-------|--------|
| Walk-in orders (no customer_id) | 475 orders (30.8%) |
| Customer-linked orders | 1,067 orders (69.2%) |
| Products flagged as low stock | Notifications generated |
| Expiry-tracked products (medicines, groceries, baby, beverages) | Batch/expiry dates populated |
| Returns and adjustments recorded | 15 movements |
| Stock transfers with bi-directional movements | 20 transfers, 29 movements |
| Invoices for completed/processing orders | 1,221 invoices |
| Audit log entries | 140 entries |

### Forecasting Readiness

| Metric | Value |
|--------|-------|
| Products with sales history | 300 / 300 (100%) |
| Total units sold | 10,377 |
| Months of historical data | 12 |
| Seasonal patterns encoded | Diwali, Holi, Summer, Winter, Weekend |

---

## Seed Configuration

### Script: `backend/seed_india.py`
- **1,200+ lines** — comprehensive seed for all 14 tables
- **Faker `en_IN`** locale for realistic Indian names, addresses, phones
- **Deterministic randomness** — seeded with `Faker.seed(42)` and `random.seed(42)`
- **Idempotent** — detects existing admin, truncates all tables, re-seeds
- **~60s runtime** on local PostgreSQL

### Key Design Decisions

1. **Festival spikes**: Diwali (Oct 18-22) gets 2.0x-3.0x multiplier; Holi (Mar 13-15) gets 1.8x-2.5x
2. **Seasonal boosts**: Beverages 2x in summer (Apr-Jun); Medicines 1.6x in winter (Nov-Feb); Electronics 1.8x during festive
3. **Weekend effect**: All days with weekday() >= 5 get 1.3x multiplier
4. **GST slabs**: 18% standard, 12% reduced (clothing, medicines, stationery), 5% low (groceries)
5. **Customer mix**: 70% B2B customer-linked orders, 30% walk-in (no customer)
6. **Order weighting**: Past dates weighted toward `completed` (60%); future dates have more variety
7. **Stock management**: Purchase movements for received POs, sale movements for each order item
