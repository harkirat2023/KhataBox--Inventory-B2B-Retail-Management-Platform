---
title: KhataBox Features
description: Comprehensive feature inventory of the KhataBox B2B retail management platform.
---

# Features

## 1. Multi-Tenant Architecture

**Description:** The platform supports multiple tenants (shopkeepers) who own their own data. An admin super-user can view and manage all tenants. Each shopkeeper sees only their own products, orders, customers, suppliers, and stores. Customers are scoped to the shopkeeper who created them.

**User Role:** Admin, Shopkeeper, Customer

**Status:** Implemented

**Related APIs:** All modules filter by `owner_id` or `shopkeeper_id`

**Related Database Tables:** users, products, orders, customers, suppliers, stores, purchase_orders

**Related Frontend Pages:** All dashboard pages

---

## 2. Role-Based Access Control (RBAC)

**Description:** Three roles — admin, shopkeeper, customer — with hierarchical permissions. Admin has full access across all tenants. Shopkeeper manages their own store data. Customer can browse catalog, place orders with credit limits, and view their own order history. Role enforcement happens at the API layer via `require_role()` dependency.

**User Role:** Admin, Shopkeeper, Customer

**Status:** Implemented

**Related APIs:** All modules use `require_role()` decorators

**Related Database Tables:** users (role column)

**Related Frontend Pages:** `/login`, `/register`, `role-guard.tsx`, `proxy.ts` (server-side guard)

---

## 3. Multi-Store Inventory Management

**Description:** Shopkeepers can create multiple stores and assign products to specific stores. Inventory is tracked per store. The dashboard and product listings can be filtered by store. Each store has business metadata (type, address, GST, revenue).

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** stores (CRUD), products (store_id filter), inventory (store_id filter), dashboard (store_id filter)

**Related Database Tables:** stores, products (store_id)

**Related Frontend Pages:** `/dashboard/stores`, `/dashboard/inventory`

---

## 4. Stock Transfers Between Stores

**Description:** Shopkeepers can transfer stock from one store to another. The system records transfer requests with pending/approved/rejected/completed statuses. Source store stock is decremented on request creation; destination stock is incremented on approval. Inventory movements track both sides.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** transfers (CRUD + status update)

**Related Database Tables:** stock_transfers, inventory_movements

**Related Frontend Pages:** `/dashboard/transfers`

---

## 5. B2B Customer Management

**Description:** Shopkeepers can create and manage B2B customers with company details, GST number, credit limits, and price tiers. Customers can place bulk orders on credit, with the system enforcing credit limit checks. Credit usage is automatically tracked against orders.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** customers (CRUD), orders (bulk with credit check)

**Related Database Tables:** customers (credit_limit, credit_used, price_tier, gst_number)

**Related Frontend Pages:** `/dashboard/customers`

---

## 6. Order Lifecycle Management

**Description:** Orders progress through five statuses: Pending -> Confirmed -> Processing -> Completed -> Cancelled. Confirmation reserves inventory stock. Completion consumes reserved stock and generates a receipt. Cancellation releases reserved stock back to available. Each transition creates an inventory movement record.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** orders (CRUD + status update)

**Related Database Tables:** orders, order_items, inventory_movements, receipts, receipt_items

**Related Frontend Pages:** `/dashboard/orders`

---

## 7. Inventory Reservation System

**Description:** Products have both `stock_quantity` (available) and `reserved_quantity` (allocated to confirmed/processing orders). The reservation system ensures inventory accuracy: confirming an order moves stock from available to reserved, completing consumes reserved stock, and cancelling releases it back.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** orders (status transitions), inventory

**Related Database Tables:** products (stock_quantity, reserved_quantity), inventory_movements (reserve_out, consume_out, reserve_cancelled_in)

**Related Frontend Pages:** `/dashboard/orders`, `/dashboard/inventory`

---

## 8. QR Code Product Labeling

**Description:** Each product has a UUID (`product_uuid`) that can be encoded in a QR code. Shopkeepers can generate individual QR codes or batch label sheets with up to 18 labels per page (3 columns x 6 rows). Labels show product name, SKU, price, stock, and category alongside the QR code. QR can encode either the integer ID (legacy) or the permanent UUID.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** qrcodes (individual, batch, permanent, regenerate)

**Related Database Tables:** products (product_uuid)

**Related Frontend Pages:** `/dashboard/qr-labels`

---

## 9. ML Demand Forecasting

**Description:** A scikit-learn RandomForestRegressor predicts demand for individual products. The model is trained on 2000 synthetic data points with features: product ID, category, day of week, month, and holiday status. The forecast endpoint returns predicted demand, recommended order quantity, confidence score, and seasonality factor. Falls back to heuristic if model file is unavailable.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** forecasting (GET /demand/{product_id})

**Related Database Tables:** products, orders, order_items

**Related Frontend Pages:** `/dashboard/forecasting`

---

## 10. Expiry Tracking for Batch Products

**Description:** Products with batch numbers and expiry dates can be tracked. The expiry API returns products expiring within 30, 60, and 90 day buckets. This applies to batch-managed inventory (e.g., medicines, food items).

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** expiry (GET /upcoming)

**Related Database Tables:** products (batch_number, mfg_date, expiry_date)

**Related Frontend Pages:** `/dashboard/inventory` (expiry alerts)

---

## 11. Full-Text Search on Products

**Description:** Products support PostgreSQL full-text search via a `search_vector` column (TSVECTOR type) and a GIN index. The products API accepts a `search` parameter that uses `plainto_tsquery` for ranked search results across product names and descriptions.

**User Role:** Admin, Shopkeeper, Customer

**Status:** Implemented

**Related APIs:** products (list with search), catalog (list with search)

**Related Database Tables:** products (search_vector)

**Related Frontend Pages:** `/dashboard/inventory`, `/dashboard/catalog`, `/catalog`

---

## 12. Real-Time Notifications (Socket.IO)

**Description:** The backend mounts a Socket.IO server at `/ws`. Notifications are emitted for order creation, order status changes, and inventory updates. The frontend uses `socket.io-client` for real-time updates. Notifications are also persisted in the database with types: low_stock, expiry, payment_reminder, ai_recommendation.

**User Role:** Admin, Shopkeeper, Customer

**Status:** Implemented

**Related APIs:** notifications (list, mark-read, mark-all-read)

**Related Database Tables:** notifications

**Related Frontend Pages:** `/dashboard/notifications`

---

## 13. PDF Invoice and Receipt Generation

**Description:** Invoices and receipts are generated as PDF documents using ReportLab. Invoices are generated per order with shop details, itemized line items, subtotal, discount, GST (18%), and total. Receipts are generated on order completion and include payment method information.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** invoices (POST /generate/{order_id}), receipts (GET /{receipt_id}/pdf)

**Related Database Tables:** invoices, receipts, receipt_items

**Related Frontend Pages:** `/dashboard/billing`, `/dashboard/order-history`, `/receipts/[id]`

---

## 14. Supplier Price Analysis

**Description:** The system analyzes purchase order history to compute profit margins per supplier. It compares last purchased price against current selling price for each product, calculates margin percentage and profit per unit, and groups results by supplier. This helps shopkeepers identify which suppliers offer the best margins.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** suppliers (GET /price-analysis)

**Related Database Tables:** suppliers, purchase_orders, purchase_order_items, products

**Related Frontend Pages:** `/dashboard/suppliers/price-analysis`

---

## 15. Audit Logging

**Description:** All entity changes are logged in the `audit_logs` table with user ID, action, entity type, entity ID, and details. The audit API provides paginated access to logs, filterable by entity type. Access is restricted to admin role.

**User Role:** Admin

**Status:** Implemented

**Related APIs:** audit (GET /logs)

**Related Database Tables:** audit_logs

**Related Frontend Pages:** None (API-only)

---

## 16. Bulk Data Export and Import

**Description:** Admin users can export products and orders as XLSX spreadsheets with styled headers. Products can be imported in bulk from CSV, XLSX, or XLS files. The system validates SKU uniqueness and reports import errors. Full database backup and restore (JSON format) supports both local and Cloudflare R2 storage.

**User Role:** Admin

**Status:** Implemented

**Related APIs:** data (export/products, export/orders, import/products, backup/export, backup/import, backup/export-r2, backup/restore-r2)

**Related Database Tables:** products, orders, all tables (backup)

**Related Frontend Pages:** `/dashboard/settings` (export options)

---

## 17. Customer Cart System

**Description:** Customers can create and manage carts with multiple items. The cart tracks subtotal, discount, GST, and total. Items can be added, updated, or removed. Carts have status lifecycle (active, checkout, completed, cancelled). Checkout converts a cart into an order with credit limit validation.

**User Role:** Customer

**Status:** Implemented

**Related APIs:** customer_cart (list, create, add-item, update-item, delete-item, checkout)

**Related Database Tables:** customer_carts, customer_cart_items, customers, orders

**Related Frontend Pages:** `/cart`, `/customer`

---

## 18. Dashboard Analytics

**Description:** The dashboard endpoint runs five parallel queries to compute stats: total products, total inventory value, today's sales (count and amount), pending orders count, and low-stock product count. Results are cached in Redis for 5 minutes. The frontend displays these as stat cards with Recharts visualizations.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** dashboard (GET /stats)

**Related Database Tables:** products, orders

**Related Frontend Pages:** `/dashboard`

---

## 19. Reporting

**Description:** Three customer-focused reports: top customers by total spend, repeat purchasers (customers with more than one order), and customer lifetime value (LTV) with average order value. Reports are filterable by minimum order count and result limit.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** reports (customers/top, customers/repeat-purchases, customers/clv)

**Related Database Tables:** customers, orders

**Related Frontend Pages:** `/dashboard/reports`

---

## 20. Purchase Order Management

**Description:** Shopkeepers can create purchase orders to suppliers with multiple line items. Purchase orders have a status lifecycle (draft, sent, received, cancelled). PO numbers are auto-generated with a "PO-" prefix.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** purchase_orders (CRUD + status update)

**Related Database Tables:** purchase_orders, purchase_order_items, suppliers

**Related Frontend Pages:** `/dashboard/purchase-orders`

---

## 21. QR Scanner

**Description:** The frontend includes a QR scanner page using the `html5-qrcode` library. This allows shopkeepers to scan product QR codes for quick stock lookups or inventory updates.

**User Role:** Admin, Shopkeeper

**Status:** Implemented

**Related APIs:** products (by UUID), inventory (stock-update)

**Related Database Tables:** products

**Related Frontend Pages:** `/dashboard/inventory/scan`, `/scan`
