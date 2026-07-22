---
title: KhataBox Features
description: All 31 features organized by domain.
---

# Features

## Authentication & Users (3 features)
1. OTP-based registration and login (phone)
2. Password-based registration and login (email)
3. JWT token management (access + refresh, role-based)

## Store Management (2 features)
4. Multi-store support (create, update, soft-delete)
5. Store types (grocery, electronics, clothing, general, medical, fashion)

## Product Management (4 features)
6. Full product CRUD with category, brand, SKU, barcode
7. Image upload to Cloudflare R2
8. Bulk price/supplier updates
9. Price history tracking and product activity log

## Inventory (3 features)
10. Stock movements (add/remove/adjust)
11. Reservation system (reserve/consume/cancel)
12. Low stock and expiry tracking (30/60/90 day alerts)

## Order Management (5 features)
13. Regular orders (B2B) with auto-inventory deduction
14. Bulk orders with credit validation
15. B2C orders with approval lifecycle
16. Order status updates with inventory reversals
17. Receipt generation (inline + PDF)

## Customer Management (3 features)
18. Customer CRUD with credit limits
19. Customer shopping cart (add/checkout)
20. Customer analytics (top spenders, repeat purchases, CLV)

## Supplier Management (1 feature)
21. Supplier CRUD with price analysis and landed cost

## Purchase Orders (1 feature)
22. Purchase order lifecycle (draft -> sent -> received -> cancelled)

## Stock Transfers (1 feature)
23. Inter-store transfers (pending -> approved/rejected -> completed)

## QR Codes (1 feature)
24. QR code generation (individual, batch sheets, permanent UUID)

## Forecasting (1 feature)
25. ML + heuristic demand forecasting with sales history

## Pricing (1 feature)
26. Price analysis (overview, landed cost, dynamic suggestions)

## Reports & Exports (2 features)
27. Customer reports (top, repeat, CLV)
28. Data export (products, orders, customers, suppliers - CSV/XLSX)

## Data Management (2 features)
29. Full DB backup/restore (local JSON + R2)
30. Product import (CSV/XLSX)

## System (2 features)
31. Audit logging, notification system, global search, health check

---

## Dashboard Features
- Total products, inventory value
- Today's sales count/amount
- Pending orders count
- Low stock/out of stock alerts
- Revenue charts (today/month/year)
- Sales charts and activity feed
- Quick action cards (6 items including Our Suggestions)
- Setup Inventory banner

## Multi-Cart Billing System
- Multiple concurrent carts (active/incomplete/cancelled states)
- Cart switching via left/right arrows and numbered tabs
- ORDERS section shows incomplete carts with delete
- ORDER HISTORY shows cancelled carts
- QR scan auto-adds with inline quantity adjustment
- Stock validation prevents over-addition
- GST toggle per order