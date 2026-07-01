---
title: KhataBox Database Schema
description: Complete database schema documentation for all 18 tables, including columns, types, constraints, indexes, and migrations.
---

# Database Schema

## Overview

KhataBox uses PostgreSQL 16 with SQLAlchemy 2.0 async ORM. The schema consists of 18 tables organized into domain groups: users and authentication, commerce (products, orders, invoices), business relationships (customers, suppliers, stores), inventory management (movements, transfers, purchase orders), and system (notifications, audit logs, receipts, carts).

**Database:** PostgreSQL 16
**ORM:** SQLAlchemy 2.0 async (asyncpg driver)
**Migrations:** Alembic (12 migration files)

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ PRODUCTS : owns
    USERS ||--o{ ORDERS : manages
    USERS ||--o{ CUSTOMERS : owns
    USERS ||--o{ SUPPLIERS : owns
    USERS ||--o{ STORES : owns
    USERS ||--o{ PURCHASE_ORDERS : creates
    USERS ||--o{ NOTIFICATIONS : receives

    STORES ||--o{ PRODUCTS : contains
    STORES ||--o{ INVENTORY_MOVEMENTS : logs
    STORES ||--o{ STOCK_TRANSFERS : from
    STORES ||--o{ STOCK_TRANSFERS : to
    STORES ||--o{ RECEIPTS : issued_by

    PRODUCTS ||--o{ ORDER_ITEMS : includes
    PRODUCTS ||--o{ PURCHASE_ORDER_ITEMS : includes
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : tracks
    PRODUCTS ||--o{ STOCK_TRANSFERS : transferred
    PRODUCTS ||--o{ RECEIPT_ITEMS : listed
    PRODUCTS ||--o{ CUSTOMER_CART_ITEMS : in_carts

    CUSTOMERS ||--o{ ORDERS : places
    CUSTOMERS ||--o{ CUSTOMER_CARTS : has
    CUSTOMERS ||--o{ RECEIPTS : receives

    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ INVOICES : generates
    ORDERS ||--o{ RECEIPTS : completes

    SUPPLIERS ||--o{ PURCHASE_ORDERS : supplies

    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : contains

    CUSTOMER_CARTS ||--o{ CUSTOMER_CART_ITEMS : contains

    RECEIPTS ||--o{ RECEIPT_ITEMS : contains
```

---

## Tables

### 1. `users`

Authentication and user management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | User ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email address (used as login) |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| name | VARCHAR(255) | NOT NULL | Display name |
| role | ENUM | NOT NULL, DEFAULT 'shopkeeper' | admin, shopkeeper, customer |
| store_name | VARCHAR(255) | NULLABLE | Shop/store name (for shopkeepers) |
| phone | VARCHAR(20) | NULLABLE | Contact phone |
| is_active | BOOLEAN | DEFAULT true | Account active flag |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now(), ON UPDATE | Last update timestamp |

---

### 2. `stores`

Multi-store management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Store ID |
| name | VARCHAR(255) | NOT NULL | Store name |
| store_type | VARCHAR(50) | NOT NULL, DEFAULT 'other' | kirana, supermart, pharmacy, electronics, clothing, restaurant, other |
| address | VARCHAR(500) | NULLABLE | Street address |
| city | VARCHAR(100) | NULLABLE | City |
| state | VARCHAR(100) | NULLABLE | State |
| pin_code | VARCHAR(10) | NULLABLE | Postal code |
| gst_number | VARCHAR(20) | NULLABLE | GST registration number |
| monthly_revenue | NUMERIC(12,2) | NULLABLE | Estimated monthly revenue |
| business_description | VARCHAR(1000) | NULLABLE | Business description |
| owner_id | INTEGER | NOT NULL | FK to users.id |
| is_active | BOOLEAN | DEFAULT true | Active flag |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now(), ON UPDATE | Last update timestamp |

---

### 3. `products`

Product catalog with inventory tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Product ID |
| product_uuid | UUID | UNIQUE, NOT NULL | Permanent UUID for QR codes |
| name | VARCHAR(255) | NOT NULL | Product name |
| sku | VARCHAR(100) | UNIQUE, NOT NULL | Stock keeping unit |
| category | VARCHAR(100) | NOT NULL | Product category |
| brand | VARCHAR(100) | NULLABLE | Brand name |
| description | TEXT | NULLABLE | Product description |
| cost_price | FLOAT | NOT NULL | Cost price (purchase price) |
| selling_price | FLOAT | NOT NULL | Selling price |
| stock_quantity | INTEGER | DEFAULT 0 | Available stock |
| reserved_quantity | INTEGER | DEFAULT 0 | Reserved for confirmed orders |
| reorder_threshold | INTEGER | DEFAULT 10 | Low stock alert threshold |
| batch_number | VARCHAR(100) | NULLABLE | Manufacturing batch number |
| mfg_date | DATE | NULLABLE | Manufacturing date |
| expiry_date | DATE | NULLABLE | Expiry date |
| owner_id | INTEGER | NOT NULL | FK to users.id |
| store_id | INTEGER | NULLABLE | FK to stores.id |
| image_url | VARCHAR(500) | NULLABLE | Product image URL (R2) |
| is_active | BOOLEAN | DEFAULT true | Soft delete flag |
| search_vector | TSVECTOR | NULLABLE | Full-text search vector |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now(), ON UPDATE | Last update timestamp |

**Indexes:**
- `ix_products_search_vector` GIN index on `search_vector`
- Composite indexes on `(owner_id, is_active)`, `(owner_id, category)`, `(owner_id, store_id)`

---

### 4. `orders`

Order records with lifecycle status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Order ID |
| order_number | VARCHAR(50) | UNIQUE, NOT NULL | Human-readable order number (ORD-XXXXXXXX) |
| shopkeeper_id | INTEGER | NOT NULL | FK to users.id (the seller) |
| customer_id | INTEGER | NULLABLE | FK to customers.id |
| status | ENUM | NOT NULL, DEFAULT 'pending' | pending, confirmed, processing, completed, cancelled |
| payment_method | ENUM | NULLABLE | cash, upi, credit, bank_transfer |
| subtotal | FLOAT | DEFAULT 0 | Sum of item prices before tax/discount |
| discount | FLOAT | DEFAULT 0 | Discount amount |
| gst | FLOAT | DEFAULT 0 | GST amount (18% of subtotal) |
| total | FLOAT | DEFAULT 0 | Final total (subtotal - discount + gst) |
| notes | VARCHAR(500) | NULLABLE | Order notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now(), ON UPDATE | Last update timestamp |

**Relationships:** items (OrderItem, cascade delete)

---

### 5. `order_items`

Line items within an order.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Item ID |
| order_id | INTEGER | FK, NOT NULL | FK to orders.id |
| product_id | INTEGER | NOT NULL | FK to products.id |
| product_name | VARCHAR(255) | NOT NULL | Denormalized product name |
| quantity | INTEGER | NOT NULL | Quantity ordered |
| unit_price | FLOAT | NOT NULL | Price per unit at time of order |
| total_price | FLOAT | NOT NULL | quantity * unit_price |

---

### 6. `invoices`

Generated invoices linked to orders.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Invoice ID |
| invoice_number | VARCHAR(50) | UNIQUE, NOT NULL | Auto-generated invoice number |
| order_id | INTEGER | FK, NOT NULL | FK to orders.id |
| shopkeeper_id | INTEGER | NOT NULL | FK to users.id |
| customer_id | INTEGER | NULLABLE | FK to customers.id |
| pdf_url | VARCHAR(500) | NULLABLE | URL to stored PDF (optional) |
| subtotal | FLOAT | DEFAULT 0 | Invoice subtotal |
| discount | FLOAT | DEFAULT 0 | Discount amount |
| gst | FLOAT | DEFAULT 0 | GST amount |
| total | FLOAT | DEFAULT 0 | Total amount |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

---

### 7. `suppliers`

Supplier records for purchase orders.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Supplier ID |
| name | VARCHAR(255) | NOT NULL | Company name |
| contact_person | VARCHAR(255) | NULLABLE | Contact person name |
| email | VARCHAR(255) | NULLABLE | Email address |
| phone | VARCHAR(20) | NULLABLE | Phone number |
| address | VARCHAR(500) | NULLABLE | Business address |
| owner_id | INTEGER | NOT NULL | FK to users.id |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now(), ON UPDATE | Last update timestamp |

---

### 8. `purchase_orders`

Purchase orders to suppliers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | PO ID |
| po_number | VARCHAR(50) | UNIQUE, NOT NULL | Auto-generated (PO-XXXXXXXX) |
| supplier_id | INTEGER | NOT NULL | FK to suppliers.id |
| shopkeeper_id | INTEGER | NOT NULL | FK to users.id |
| status | ENUM | NOT NULL, DEFAULT 'draft' | draft, sent, received, cancelled |
| total | FLOAT | DEFAULT 0 | Sum of item totals |
| notes | VARCHAR(500) | NULLABLE | PO notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now(), ON UPDATE | Last update timestamp |

**Relationships:** items (PurchaseOrderItem, cascade delete)

---

### 9. `purchase_order_items`

Line items within a purchase order.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Item ID |
| purchase_order_id | INTEGER | FK, NOT NULL | FK to purchase_orders.id |
| product_id | INTEGER | NOT NULL | FK to products.id |
| product_name | VARCHAR(255) | NOT NULL | Denormalized product name |
| quantity | INTEGER | NOT NULL | Quantity ordered |
| unit_price | FLOAT | NOT NULL | Price per unit |
| total_price | FLOAT | NOT NULL | quantity * unit_price |

---

### 10. `customers`

B2B customer records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Customer ID |
| company_name | VARCHAR(255) | NOT NULL | Business name |
| contact_person | VARCHAR(255) | NULLABLE | Contact person |
| email | VARCHAR(255) | NULLABLE | Email address (used for customer auth) |
| phone | VARCHAR(20) | NULLABLE | Phone number |
| gst_number | VARCHAR(50) | NULLABLE | GST registration |
| credit_limit | FLOAT | DEFAULT 0 | Maximum credit allowed |
| credit_used | FLOAT | DEFAULT 0 | Current credit usage |
| price_tier | VARCHAR(50) | DEFAULT 'standard' | Pricing tier |
| owner_id | INTEGER | NOT NULL | FK to users.id (shopkeeper who owns) |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now(), ON UPDATE | Last update timestamp |

**Relationships:** carts (CustomerCart, cascade delete)

---

### 11. `customer_carts`

Customer shopping carts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Cart ID |
| customer_id | INTEGER | FK, NOT NULL | FK to customers.id |
| status | ENUM | NOT NULL, DEFAULT 'active' | active, checkout, completed, cancelled |
| subtotal | FLOAT | DEFAULT 0 | Sum of item prices |
| discount | FLOAT | DEFAULT 0 | Discount amount |
| gst | FLOAT | DEFAULT 0 | GST amount |
| total | FLOAT | DEFAULT 0 | Cart total |
| notes | VARCHAR(500) | NULLABLE | Cart notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now(), ON UPDATE | Last update timestamp |

**Relationships:** items (CustomerCartItem, cascade delete), customer (Customer)

---

### 12. `customer_cart_items`

Line items within a customer cart.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Item ID |
| cart_id | INTEGER | FK, NOT NULL | FK to customer_carts.id |
| product_id | INTEGER | NOT NULL | FK to products.id |
| product_name | VARCHAR(255) | NOT NULL | Denormalized product name |
| sku | VARCHAR(100) | NOT NULL | Product SKU |
| unit_price | FLOAT | NOT NULL | Price per unit |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | Quantity |
| total_price | FLOAT | NOT NULL | quantity * unit_price |

---

### 13. `inventory_movements`

Audit trail for all stock changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Movement ID |
| product_id | INTEGER | NOT NULL | FK to products.id |
| shopkeeper_id | INTEGER | NOT NULL | FK to users.id |
| store_id | INTEGER | FK, NULLABLE | FK to stores.id |
| movement_type | ENUM | NOT NULL | sale, purchase, adjustment, return, transfer_in, transfer_out, reserve_out, consume_out, reserve_cancelled_in |
| quantity | INTEGER | NOT NULL | Quantity changed (negative for outbound) |
| reference | VARCHAR(255) | NULLABLE | Reference (e.g., "Order #ORD-12345") |
| notes | VARCHAR(500) | NULLABLE | Movement notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Indexes:** Composite indexes on `(product_id, shopkeeper_id)`, `(shopkeeper_id, created_at)`, `(store_id, movement_type)`

---

### 14. `stock_transfers`

Inter-store stock transfer requests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Transfer ID |
| product_id | INTEGER | NOT NULL | FK to products.id |
| from_store_id | INTEGER | FK, NOT NULL | Source store (FK to stores.id) |
| to_store_id | INTEGER | FK, NOT NULL | Destination store (FK to stores.id) |
| quantity | INTEGER | NOT NULL | Quantity to transfer |
| status | ENUM | NOT NULL, DEFAULT 'pending' | pending, approved, rejected, completed |
| requested_by | INTEGER | NOT NULL | FK to users.id |
| approved_by | INTEGER | NULLABLE | FK to users.id (approver) |
| notes | VARCHAR(500) | NULLABLE | Transfer notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now(), ON UPDATE | Last update timestamp |

---

### 15. `notifications`

In-app notifications for users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Notification ID |
| user_id | INTEGER | NOT NULL | FK to users.id (recipient) |
| type | ENUM | NOT NULL | low_stock, expiry, payment_reminder, ai_recommendation |
| title | VARCHAR(255) | NOT NULL | Notification title |
| message | VARCHAR(1000) | NOT NULL | Notification message |
| is_read | BOOLEAN | DEFAULT false | Read status |
| reference_id | INTEGER | NULLABLE | Related entity ID |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

---

### 16. `audit_logs`

Audit trail for entity changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Log ID |
| user_id | INTEGER | NOT NULL | FK to users.id (who performed action) |
| action | VARCHAR(255) | NOT NULL | Action description (e.g., "create", "update", "delete") |
| entity_type | VARCHAR(50) | NOT NULL | Entity type (e.g., "product", "order", "customer") |
| entity_id | INTEGER | NULLABLE | ID of the affected entity |
| details | TEXT | NULLABLE | JSON or text details |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

---

### 17. `receipts`

Receipts generated on order completion.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Receipt ID |
| receipt_number | VARCHAR(50) | UNIQUE, NOT NULL | Auto-generated (RCPT-XXXXXXXX) |
| order_id | INTEGER | FK, NOT NULL | FK to orders.id |
| shopkeeper_id | INTEGER | NOT NULL | FK to users.id |
| customer_id | INTEGER | NULLABLE | FK to customers.id |
| store_id | INTEGER | NOT NULL | FK to stores.id (denormalized for fast queries) |
| payment_method | ENUM | NULLABLE | cash, upi, credit, bank_transfer |
| subtotal | FLOAT | NOT NULL, DEFAULT 0 | Subtotal |
| discount | FLOAT | NOT NULL, DEFAULT 0 | Discount applied |
| taxes | FLOAT | NOT NULL, DEFAULT 0 | Tax amount |
| total_amount | FLOAT | NOT NULL, DEFAULT 0 | Final amount |
| generated_at | TIMESTAMPTZ | NOT NULL | When the receipt was generated |

**Relationships:** items (ReceiptItem, cascade delete)

---

### 18. `receipt_items`

Line items within a receipt.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Item ID |
| receipt_id | INTEGER | FK, NOT NULL | FK to receipts.id |
| order_item_id | INTEGER | FK, NULLABLE | FK to order_items.id |
| product_id | INTEGER | NOT NULL | FK to products.id |
| product_name | VARCHAR(255) | NOT NULL | Denormalized product name |
| quantity | INTEGER | NOT NULL | Quantity |
| unit_price | FLOAT | NOT NULL | Price per unit |
| line_total | FLOAT | NOT NULL | quantity * unit_price |
| taxes | FLOAT | NOT NULL, DEFAULT 0 | Tax on this line |
| discount | FLOAT | NOT NULL, DEFAULT 0 | Discount on this line |

---

## Migration History

| Migration | Description | Tables Affected |
|-----------|-------------|-----------------|
| 0001 | Initial schema | 11 base tables + 5 enums (users, products, orders, order_items, invoices, suppliers, purchase_orders, purchase_order_items, customers, inventory_movements, notifications, audit_logs) |
| 0002 | Full-text search | Adds `search_vector` TSVECTOR + GIN index to products |
| 0003 | Expiry batch tracking | Adds `batch_number`, `mfg_date`, `expiry_date` to products |
| 0004 | Multi-store | Creates `stores` table, adds `store_id` FK to products |
| 0005 | Product image | Adds `image_url` column to products |
| 0006 | Performance indexes | 5 composite indexes on inventory_movements, orders, products |
| 0007 | Stock transfers | Creates `stock_transfers` table, adds `store_id` to inventory_movements |
| 0008 | Transfer enum values | Adds `transfer_in`/`transfer_out` to MovementType enum |
| 0009 | Product UUID | Adds `product_uuid` UUID column to products for permanent QR |
| 0010 | Inventory reservation | Adds `reserved_quantity` to products + new movement types (reserve_out, consume_out, reserve_cancelled_in) |
| 0011 | Receipt system | Creates `receipts` + `receipt_items` tables |
| 0012 | Store business fields | Adds `store_type`, `city`, `state`, `pin_code`, `gst_number`, `monthly_revenue`, `business_description` to stores |

---

## Indexes

### Performance Indexes (Migration 0006)

- `inventory_movements_product_id_shopkeeper_id_idx` on `inventory_movements(product_id, shopkeeper_id)`
- `inventory_movements_shopkeeper_id_created_at_idx` on `inventory_movements(shopkeeper_id, created_at DESC)`
- `inventory_movements_store_id_movement_type_idx` on `inventory_movements(store_id, movement_type)`
- `orders_shopkeeper_id_created_at_idx` on `orders(shopkeeper_id, created_at DESC)`
- `products_owner_id_is_active_idx` on `products(owner_id, is_active)`
- `products_owner_id_category_idx` on `products(owner_id, category)`
- `products_owner_id_store_id_idx` on `products(owner_id, store_id)`

### Full-Text Search Index

- GIN index on `products.search_vector` for efficient `@@` tsquery operations

---

## Enums

| Enum Name | Values |
|-----------|--------|
| UserRole | admin, shopkeeper, customer |
| OrderStatus | pending, confirmed, processing, completed, cancelled |
| PaymentMethod | cash, upi, credit, bank_transfer |
| POStatus | draft, sent, received, cancelled |
| MovementType | sale, purchase, adjustment, return, transfer_in, transfer_out, reserve_out, consume_out, reserve_cancelled_in |
| StockTransferStatus | pending, approved, rejected, completed |
| NotificationType | low_stock, expiry, payment_reminder, ai_recommendation |
| CartStatus | active, checkout, completed, cancelled |
| StoreType | kirana, supermart, pharmacy, electronics, clothing, restaurant, other |
