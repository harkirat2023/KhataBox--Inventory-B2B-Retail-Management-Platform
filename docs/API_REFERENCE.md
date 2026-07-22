---
title: KhataBox API Reference
description: Complete API reference for all 31 backend route modules.
---

# API Reference

Base URL: /api/v1

Authentication: JWT Bearer token (Authorization header).
OTP-based auth for registration and login.

Standard Response Codes:
200 OK | 201 Created | 204 No Content | 400 Bad Request
401 Unauthorized | 403 Forbidden | 404 Not Found | 500 Server Error

Pagination via headers: X-Total-Count, X-Page, X-Page-Size, X-Total-Pages

## Route Modules

1. auth.py - Authentication (send-otp, register, login, refresh, users CRUD)
2. dashboard.py - Dashboard stats (cached 30s Redis)
3. catalog.py - Public product catalog (search, category, brand, price filters)
4. products.py - Full product CRUD with inventory, images R2, bulk update
5. orders.py - Order lifecycle (create, bulk, approve, status updates)
6. suppliers.py - Supplier CRUD with price analysis
7. customers.py - Customer CRUD with credit management
8. forecasting.py - Demand/sales forecasting (ML + heuristic)
9. inventory.py - Stock movements and updates
10. invoices.py - PDF invoice generation
11. customer_invoices.py - Customer-facing invoice PDFs
12. receipts.py - Receipt history and PDF
13. purchase_orders.py - PO lifecycle (draft/sent/received/cancelled)
14. qrcodes.py - QR code generation (batch, permanent UUID)
15. expiry.py - Expiry tracking (30/60/90 day buckets)
16. audit.py - Audit log queries (admin)
17. notifications.py - Notification inbox
18. reports.py - Customer analytics and data exports
19. stores.py - Store CRUD with soft delete
20. transfers.py - Stock transfers between stores
21. customer_cart.py - Customer shopping cart
22. payments.py - Payment simulation
23. data.py - Import/export/backup (admin)
24. b2c.py - B2C order system (customer + shopkeeper endpoints)
25. seed_products.py - Seed product catalog by store type
26. price_analysis.py - Pricing insights and landed cost
27. price_history.py - Price change tracking
28. product_activity.py - Product activity log
29. global_search.py - Unified search across entities
30. health.py - Health check
31. stores_router.py (in stores.py) - Public store listing