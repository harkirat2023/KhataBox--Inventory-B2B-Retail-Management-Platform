---
title: KhataBox Database Schema
description: Complete database schema with all 24 tables, 12 enums, 25 migrations.
---

# Database Schema

Platform: PostgreSQL 15+ (Neon cloud)
ORM: SQLAlchemy 2.0 (async with asyncpg)
Migrations: Alembic (25 versions: 0001-0024)

---

## Core Tables

### users
id (UUID, PK), email (unique), password_hash, full_name, phone, role (enum: admin/shopkeeper/customer), is_active, store_id (FK stores), created_at, updated_at

### stores
id (UUID, PK), name, store_type (enum: grocery/electronics/clothing/general/medical/fashion), address, phone, logo_url, is_active, owner_id (FK users), created_at, deleted_at (soft delete)

### products
id (UUID, PK), name, description, category, brand, price, cost_price, gst_rate, unit, sku (unique), barcode, image_url, stock, min_stock, max_stock, low_stock_threshold, store_id (FK stores), supplier_id (FK suppliers), is_active, created_at, updated_at, deleted_at

### suppliers
id (UUID, PK), name, contact_person, phone, email, address, store_id (FK stores), is_active, created_at

### customers
id (UUID, PK), name, phone, email, address, credit_limit, credit_used, store_id (FK stores), user_id (FK users), is_active, created_at

### orders
id (UUID, PK), order_number (auto), customer_id (FK customers), store_id (FK stores), status (enum: pending/confirmed/completed/cancelled/processing/b2c_pending), subtotal, gst, discount, total, payment_method, notes, created_at, completed_at

### order_items
id (UUID, PK), order_id (FK orders), product_id (FK products), product_name, quantity, unit_price, total_price, gst_amount

### receipts & receipt_items
Receipts: id (UUID, PK), order_id (FK orders), receipt_number, total, payment_method, created_at
ReceiptItems: id (UUID, PK), receipt_id (FK receipts), product_name, quantity, unit_price, total_price

### invoices
id (UUID, PK), order_id (FK orders), invoice_number, invoice_date, total_amount, pdf_url, created_at

### inventory_movements
id (UUID, PK), product_id (FK products), store_id (FK stores), quantity_change, movement_type (enum: add/remove/adjust/reserve_out/reserve_cancelled_in/consume_out), reference_type, reference_id, notes, created_at

### purchase_orders & purchase_order_items
PO: id (UUID, PK), supplier_id (FK suppliers), store_id (FK stores), status (enum: draft/sent/received/cancelled), total_amount, created_at, updated_at
POItems: id (UUID, PK), po_id (FK POs), product_id (FK products), quantity, unit_price, total_price

### transfers
id (UUID, PK), source_store_id (FK stores), target_store_id (FK stores), status (enum: pending/approved/rejected/completed), notes, created_at, updated_at

### transfer_items
id (UUID, PK), transfer_id (FK transfers), product_id (FK products), quantity

### notifications
id (UUID, PK), user_id (FK users), title, message, type, is_read, created_at

### audit_logs
id (UUID, PK), user_id (FK users), action, entity_type, entity_id, details (JSONB), created_at

### price_history
id (UUID, PK), product_id (FK products), old_price, new_price, changed_by (FK users), created_at

### product_activity
id (UUID, PK), product_id (FK products), action, details (JSONB), created_at

### b2c_orders & b2c_order_items
B2COrders: id (UUID, PK), customer_id (FK customers), store_id (FK stores), status (enum), subtotal, gst, total, created_at
B2COrderItems: id (UUID, PK), order_id (FK b2c_orders), product_id (FK products), quantity, unit_price, total_price

### customer_carts & customer_cart_items
Carts: id (UUID, PK), customer_id (FK customers), store_id (FK stores), status (active/checked_out/abandoned), created_at
CartItems: id (UUID, PK), cart_id (FK carts), product_id (FK products), quantity, created_at

### payments
id (UUID, PK), order_id (FK orders), amount, payment_method, transaction_id, status, created_at

### seed_products
id (UUID, PK), name, description, category, brand, unit, store_type, image_url, is_active

## Enums
UserRole: admin, shopkeeper, customer
OrderStatus: pending, confirmed, completed, cancelled, processing, b2c_pending, counter
MovementType: add, remove, adjust, reserve_out, reserve_cancelled_in, consume_out
POStatus: draft, sent, received, cancelled
TransferStatus: pending, approved, rejected, completed
StoreType: grocery, electronics, clothing, general, medical, fashion
PaymentMethod: cash, card, upi, credit
NotificationType: info, warning, success, error
B2COrderStatus: pending, approved, processing, rejected, cancelled, completed
CartStatus: active, checked_out, abandoned
PaymentStatus: pending, completed, failed, refunded

## Migration History
0001_initial - Core tables: users, stores
0002_add_product_tracking - products, price_history, product_activity
0003_add_suppliers - suppliers table
0004_add_customers - customers table
0005_add_orders - orders, order_items
0006_add_inventory - inventory_movements
0007_add_purchase_orders - POs, PO items
0008_add_transfers - transfers, transfer_items
0009_add_notifications - notifications
0010_add_audit_logs - audit_logs
0011_receipt_system - receipts, receipt_items
0012_add_invoices - invoices
0013_add_b2c_tables - b2c_orders, b2c_order_items
0014_add_b2c_enum - B2C status enum, add counter to OrderStatus
0015_add_customer_carts - customer_carts, customer_cart_items
0016_add_payments - payments table
0017_seed_products_table - seed_products table
0018_add_product_fields - additional product fields
0019_update_order_status - order status updates
0020_add_cascade_deletes - cascade delete rules
0021_add_indexes - performance indexes
0022_add_store_type - store_type column
0023_update_constraints - constraint updates
0024_final_cleanup - final schema cleanup