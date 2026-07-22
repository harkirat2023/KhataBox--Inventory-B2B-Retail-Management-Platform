---
title: KhataBox Project Structure
description: Complete file tree of the KhataBox monorepo.
---

# Project Structure

KhataBox/ (monorepo root)
|
|-- backend/                    # FastAPI Python backend
|   |-- app/
|   |   |-- __init__.py
|   |   |-- main.py           # FastAPI app entry point
|   |   |-- api/
|   |   |   |-- __init__.py
|   |   |   |-- v1/           # 31 route modules
|   |   |       |-- __init__.py
|   |   |       |-- router.py # Main router aggregator
|   |   |       |-- auth.py
|   |   |       |-- b2c.py
|   |   |       |-- catalog.py
|   |   |       |-- customer_cart.py
|   |   |       |-- customer_invoices.py
|   |   |       |-- customers.py
|   |   |       |-- dashboard.py
|   |   |       |-- data.py
|   |   |       |-- expiry.py
|   |   |       |-- forecasting.py
|   |   |       |-- global_search.py
|   |   |       |-- inventory.py
|   |   |       |-- invoices.py
|   |   |       |-- notifications.py
|   |   |       |-- orders.py
|   |   |       |-- payments.py
|   |   |       |-- price_analysis.py
|   |   |       |-- price_history.py
|   |   |       |-- product_activity.py
|   |   |       |-- products.py
|   |   |       |-- purchase_orders.py
|   |   |       |-- qrcodes.py
|   |   |       |-- receipts.py
|   |   |       |-- reports.py
|   |   |       |-- seed_products.py
|   |   |       |-- stores.py
|   |   |       |-- suppliers.py
|   |   |       |-- transfers.py
|   |   |-- models/           # 20 SQLAlchemy models
|   |   |   |-- __init__.py
|   |   |   |-- user.py, store.py, product.py
|   |   |   |-- supplier.py, customer.py
|   |   |   |-- order.py, order_item.py
|   |   |   |-- receipt.py, receipt_item.py
|   |   |   |-- inventory_movement.py
|   |   |   |-- purchase_order.py, purchase_order_item.py
|   |   |   |-- transfer.py, transfer_item.py
|   |   |   |-- notification.py, audit_log.py
|   |   |   |-- price_history.py, product_activity.py
|   |   |   |-- b2c_order.py, b2c_order_item.py
|   |   |   |-- customer_cart.py, customer_cart_item.py
|   |   |   |-- payment.py, seed_product.py
|   |   |   |-- invoice.py
|   |   |-- schemas/          # 17 Pydantic schemas
|   |   |-- services/         # Business logic
|   |   |   |-- order_service.py
|   |   |   |-- auth_service.py
|   |   |   |-- dashboard_service.py
|   |   |   |-- customer_service.py
|   |   |   |-- inventory_service.py
|   |   |   |-- notification_service.py
|   |   |   |-- product_service.py
|   |   |   |-- report_service.py
|   |   |   |-- etc.
|   |   |-- core/             # Core config
|   |   |   |-- config.py, database.py, security.py
|   |   |   |-- cache.py, deps.py, exceptions.py
|   |-- alembic/              # 25 migration versions
|   |   |-- versions/ (0025 files)
|   |   |-- env.py, alembic.ini
|   |-- scripts/              # DB seeding scripts
|   |   |-- seed_india.py (1413 lines, 14 tables)
|   |   |-- seed_seed_products.py (229 lines, 178 products)
|   |-- requirements.txt, .env.example
|
|-- frontend/                 # Next.js TypeScript frontend
|   |-- src/
|   |   |-- app/
|   |   |   |-- (customer)/   # 11 customer-facing routes
|   |   |   |   |-- layout.tsx
|   |   |   |   |-- page.tsx (landing)
|   |   |   |   |-- login/, register/
|   |   |   |   |-- stores/, stores/[id]/
|   |   |   |   |-- b2c/orders/, b2c/orders/[id]/
|   |   |   |   |-- my-orders/, my-orders/[id]/
|   |   |   |   |-- receipts/, receipts/[id]/
|   |   |   |-- (dashboard)/  # 24 dashboard routes
|   |   |   |   |-- layout.tsx
|   |   |   |   |-- page.tsx (dashboard home)
|   |   |   |   |-- billing/
|   |   |   |   |-- orders/, orders/[id]/
|   |   |   |   |-- order-history/
|   |   |   |   |-- products/, products/new/
|   |   |   |   |-- inventory/, inventory/movements/
|   |   |   |   |-- customers/, customers/new/
|   |   |   |   |-- customers/scan/
|   |   |   |   |-- suppliers/, suppliers/new/
|   |   |   |   |-- purchase-orders/, purchase-orders/new/
|   |   |   |   |-- transfers/
|   |   |   |   |-- reports/
|   |   |   |   |-- price-analysis/
|   |   |   |   |-- forecasting/
|   |   |   |   |-- qrcodes/
|   |   |   |   |-- receipts/
|   |   |   |   |-- expiry/
|   |   |   |   |-- setup-inventory/
|   |   |   |   |-- notifications/
|   |   |   |   |-- search/
|   |   |   |   |-- stores/
|   |   |   |   |-- settings/
|   |   |   |-- layout.tsx (root)
|   |   |   |-- page.tsx (root redirect)
|   |   |   |-- brand/page.tsx
|   |   |-- components/       # UI components
|   |   |   |-- ui/ (22 shadcn components)
|   |   |   |-- layout/ (5 components: sidebar, header, etc.)
|   |   |-- lib/              # 8 utility modules
|   |   |   |-- client-api.ts, utils.ts
|   |   |   |-- ui-constants.ts, ui-helpers.ts
|   |   |   |-- api-helpers.ts, validation.ts
|   |   |   |-- format.ts, date.ts
|   |   |-- stores/           # 4 Zustand stores
|   |   |   |-- authStore.ts, store.ts
|   |   |   |-- billingStore.ts, cartStore.ts
|   |   |-- types/            # 6 type definition files
|   |   |-- middleware.ts
|   |-- package.json, tsconfig.json, tailwind.config.ts
|   |-- next.config.ts, postcss.config.js
|
|-- docs/                     # Documentation (6 files)
|   |-- AGENTS.md
|   |-- API_REFERENCE.md
|   |-- ARCHITECTURE.md
|   |-- DATABASE.md
|   |-- FEATURES.md
|   |-- PROJECT_STRUCTURE.md
|   |-- SEEDING_PLAN.md
|
|-- scripts/                  # Shell scripts
|   |-- start-khatabox.bat   # One-click startup
|
|-- README.md
|-- AGENTS.md
|-- .gitignore