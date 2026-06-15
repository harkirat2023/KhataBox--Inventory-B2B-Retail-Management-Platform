# Seeding Plan — KhataBox

## 1. All Entities Discovered

### Tables (14 total)

| # | Table | ORM Model | File | Lines |
|---|-------|-----------|------|-------|
| 1 | `users` | `User` | `backend/app/models/user.py` | 30 |
| 2 | `stores` | `Store` | `backend/app/models/store.py` | 20 |
| 3 | `products` | `Product` | `backend/app/models/product.py` | 34 |
| 4 | `suppliers` | `Supplier` | `backend/app/models/supplier.py` | 22 |
| 5 | `customers` | `Customer` | `backend/app/models/customer.py` | 25 |
| 6 | `orders` | `Order` | `backend/app/models/order.py` | 58 |
| 7 | `order_items` | `OrderItem` | `backend/app/models/order.py` | 58 |
| 8 | `invoices` | `Invoice` | `backend/app/models/invoice.py` | 22 |
| 9 | `purchase_orders` | `PurchaseOrder` | `backend/app/models/purchase_order.py` | 46 |
| 10 | `purchase_order_items` | `PurchaseOrderItem` | `backend/app/models/purchase_order.py` | 46 |
| 11 | `inventory_movements` | `InventoryMovement` | `backend/app/models/inventory.py` | 58 |
| 12 | `stock_transfers` | `StockTransfer` | `backend/app/models/inventory.py` | 58 |
| 13 | `notifications` | `Notification` | `backend/app/models/notification.py` | 27 |
| 14 | `audit_logs` | `AuditLog` | `backend/app/models/audit_log.py` | 18 |

### Enumerations (7)

| Enum | Values | Used By |
|------|--------|---------|
| `UserRole` | `admin`, `shopkeeper`, `customer` | `users.role` |
| `OrderStatus` | `pending`, `confirmed`, `processing`, `completed`, `cancelled` | `orders.status` |
| `PaymentMethod` | `cash`, `upi`, `credit`, `bank_transfer` | `orders.payment_method` |
| `POStatus` | `draft`, `sent`, `received`, `cancelled` | `purchase_orders.status` |
| `MovementType` | `sale`, `purchase`, `adjustment`, `return`, `transfer_in`, `transfer_out` | `inventory_movements.movement_type` |
| `StockTransferStatus` | `pending`, `approved`, `rejected`, `completed` | `stock_transfers.status` |
| `NotificationType` | `low_stock`, `expiry`, `payment_reminder`, `ai_recommendation` | `notifications.type` |

---

## 2. Entity Field Reference

### users
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| email | String(255) | UNIQUE, NOT NULL |
| password_hash | String(255) | NOT NULL |
| name | String(255) | NOT NULL |
| role | Enum(UserRole) | NOT NULL, default: `shopkeeper` |
| store_name | String(255) | NULLABLE |
| phone | String(20) | NULLABLE |
| is_active | Boolean | default: `true` |
| created_at | DateTime(tz) | NOT NULL |
| updated_at | DateTime(tz) | NOT NULL, onupdate |

### stores
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| name | String(255) | NOT NULL |
| address | String(500) | NULLABLE |
| owner_id | Integer | NOT NULL (logical FK → users.id) |
| is_active | Boolean | default: `true` |
| created_at | DateTime(tz) | NOT NULL |
| updated_at | DateTime(tz) | NOT NULL, onupdate |

### products
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| name | String(255) | NOT NULL |
| sku | String(100) | UNIQUE, NOT NULL |
| category | String(100) | NOT NULL |
| brand | String(100) | NULLABLE |
| description | Text | NULLABLE |
| cost_price | Float | NOT NULL |
| selling_price | Float | NOT NULL |
| stock_quantity | Integer | default: 0 |
| reorder_threshold | Integer | default: 10 |
| batch_number | String(100) | NULLABLE |
| mfg_date | Date | NULLABLE |
| expiry_date | Date | NULLABLE |
| owner_id | Integer | NOT NULL (logical FK → users.id) |
| store_id | Integer | NULLABLE (logical FK → stores.id) |
| image_url | String(500) | NULLABLE |
| is_active | Boolean | default: `true` |
| search_vector | TSVECTOR | NULLABLE (PG trigger-managed) |
| created_at | DateTime(tz) | NOT NULL |
| updated_at | DateTime(tz) | NOT NULL, onupdate |

### suppliers
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| name | String(255) | NOT NULL |
| contact_person | String(255) | NULLABLE |
| email | String(255) | NULLABLE |
| phone | String(20) | NULLABLE |
| address | String(500) | NULLABLE |
| owner_id | Integer | NOT NULL (logical FK → users.id) |
| created_at | DateTime(tz) | NOT NULL |
| updated_at | DateTime(tz) | NOT NULL, onupdate |

### customers
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| company_name | String(255) | NOT NULL |
| contact_person | String(255) | NULLABLE |
| email | String(255) | NULLABLE |
| phone | String(20) | NULLABLE |
| gst_number | String(50) | NULLABLE |
| credit_limit | Float | default: 0 |
| credit_used | Float | default: 0 |
| price_tier | String(50) | default: `"standard"` |
| owner_id | Integer | NOT NULL (logical FK → users.id) |
| created_at | DateTime(tz) | NOT NULL |
| updated_at | DateTime(tz) | NOT NULL, onupdate |

### orders
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| order_number | String(50) | UNIQUE, NOT NULL |
| shopkeeper_id | Integer | NOT NULL (logical FK → users.id) |
| customer_id | Integer | NULLABLE (logical FK → customers.id) |
| status | Enum(OrderStatus) | default: `pending` |
| payment_method | Enum(PaymentMethod) | NULLABLE |
| subtotal | Float | default: 0 |
| discount | Float | default: 0 |
| gst | Float | default: 0 |
| total | Float | default: 0 |
| notes | String(500) | NULLABLE |
| created_at | DateTime(tz) | NOT NULL |
| updated_at | DateTime(tz) | NOT NULL, onupdate |

### order_items
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| order_id | Integer | FK → orders.id, ON DELETE CASCADE, NOT NULL |
| product_id | Integer | NOT NULL (logical FK → products.id) |
| product_name | String(255) | NOT NULL |
| quantity | Integer | NOT NULL |
| unit_price | Float | NOT NULL |
| total_price | Float | NOT NULL |

### invoices
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| invoice_number | String(50) | UNIQUE, NOT NULL |
| order_id | Integer | FK → orders.id, NOT NULL |
| shopkeeper_id | Integer | NOT NULL (logical FK → users.id) |
| customer_id | Integer | NULLABLE (logical FK → customers.id) |
| pdf_url | String(500) | NULLABLE |
| subtotal | Float | default: 0 |
| discount | Float | default: 0 |
| gst | Float | default: 0 |
| total | Float | default: 0 |
| created_at | DateTime(tz) | NOT NULL |

### purchase_orders
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| po_number | String(50) | UNIQUE, NOT NULL |
| supplier_id | Integer | NOT NULL (logical FK → suppliers.id) |
| shopkeeper_id | Integer | NOT NULL (logical FK → users.id) |
| status | Enum(POStatus) | default: `draft` |
| total | Float | default: 0 |
| notes | String(500) | NULLABLE |
| created_at | DateTime(tz) | NOT NULL |
| updated_at | DateTime(tz) | NOT NULL, onupdate |

### purchase_order_items
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| purchase_order_id | Integer | FK → purchase_orders.id, ON DELETE CASCADE, NOT NULL |
| product_id | Integer | NOT NULL (logical FK → products.id) |
| product_name | String(255) | NOT NULL |
| quantity | Integer | NOT NULL |
| unit_price | Float | NOT NULL |
| total_price | Float | NOT NULL |

### inventory_movements
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| product_id | Integer | NOT NULL (logical FK → products.id) |
| shopkeeper_id | Integer | NOT NULL (logical FK → users.id) |
| store_id | Integer | FK → stores.id, NULLABLE |
| movement_type | Enum(MovementType) | NOT NULL |
| quantity | Integer | NOT NULL |
| reference | String(255) | NULLABLE |
| notes | String(500) | NULLABLE |
| created_at | DateTime(tz) | NOT NULL |

### stock_transfers
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| product_id | Integer | NOT NULL (logical FK → products.id) |
| from_store_id | Integer | FK → stores.id, NOT NULL |
| to_store_id | Integer | FK → stores.id, NOT NULL |
| quantity | Integer | NOT NULL |
| status | Enum(StockTransferStatus) | default: `pending` |
| requested_by | Integer | NOT NULL (logical FK → users.id) |
| approved_by | Integer | NULLABLE (logical FK → users.id) |
| notes | String(500) | NULLABLE |
| created_at | DateTime(tz) | NOT NULL |
| updated_at | DateTime(tz) | NOT NULL, onupdate |

### notifications
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| user_id | Integer | NOT NULL (logical FK → users.id) |
| type | Enum(NotificationType) | NOT NULL |
| title | String(255) | NOT NULL |
| message | String(1000) | NOT NULL |
| is_read | Boolean | default: `false` |
| reference_id | Integer | NULLABLE |
| created_at | DateTime(tz) | NOT NULL |

### audit_logs
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, autoincrement |
| user_id | Integer | NOT NULL (logical FK → users.id) |
| action | String(255) | NOT NULL |
| entity_type | String(50) | NOT NULL |
| entity_id | Integer | NULLABLE |
| details | Text | NULLABLE |
| created_at | DateTime(tz) | NOT NULL |

---

## 3. Relationships Between Entities

### Foreign Key Constraints (SQL-enforced, ON DELETE rules)

| Child | Column | Parent | Column | Delete Rule | Migration |
|-------|--------|--------|--------|-------------|-----------|
| `order_items` | `order_id` | `orders` | `id` | CASCADE | 0001 |
| `invoices` | `order_id` | `orders` | `id` | NO ACTION | 0001 |
| `purchase_order_items` | `purchase_order_id` | `purchase_orders` | `id` | CASCADE | 0001 |
| `inventory_movements` | `store_id` | `stores` | `id` | NO ACTION | 0007 |
| `stock_transfers` | `from_store_id` | `stores` | `id` | NO ACTION | 0007 |
| `stock_transfers` | `to_store_id` | `stores` | `id` | NO ACTION | 0007 |

### Logical References (no FK constraint, application-enforced)

| Child | Column | Parent | Column |
|-------|--------|--------|--------|
| `stores` | `owner_id` | `users` | `id` |
| `products` | `owner_id` | `users` | `id` |
| `products` | `store_id` | `stores` | `id` |
| `suppliers` | `owner_id` | `users` | `id` |
| `customers` | `owner_id` | `users` | `id` |
| `orders` | `shopkeeper_id` | `users` | `id` |
| `orders` | `customer_id` | `customers` | `id` |
| `order_items` | `product_id` | `products` | `id` |
| `invoices` | `shopkeeper_id` | `users` | `id` |
| `invoices` | `customer_id` | `customers` | `id` |
| `purchase_orders` | `supplier_id` | `suppliers` | `id` |
| `purchase_orders` | `shopkeeper_id` | `users` | `id` |
| `purchase_order_items` | `product_id` | `products` | `id` |
| `inventory_movements` | `product_id` | `products` | `id` |
| `inventory_movements` | `shopkeeper_id` | `users` | `id` |
| `stock_transfers` | `product_id` | `products` | `id` |
| `stock_transfers` | `requested_by` | `users` | `id` |
| `stock_transfers` | `approved_by` | `users` | `id` |
| `notifications` | `user_id` | `users` | `id` |
| `audit_logs` | `user_id` | `users` | `id` |

### ORM Relationships (SQLAlchemy)

| Parent | Child | Type | Back-populates | Cascade |
|--------|-------|------|----------------|---------|
| `Order` | `OrderItem.items` | one-to-many | `OrderItem.order` | all, delete-orphan |
| `PurchaseOrder` | `PurchaseOrderItem.items` | one-to-many | `PurchaseOrderItem.purchase_order` | all, delete-orphan |
| `InventoryMovement` | `Store` | many-to-one | — | selectin |
| `StockTransfer` | `Store.from_store` | many-to-one | — | selectin |
| `StockTransfer` | `Store.to_store` | many-to-one | — | selectin |

### Entity Relationship Diagram (dependency graph)

```
users (root — no dependencies)
  ├── stores          (owner_id → users.id)
  ├── products        (owner_id → users.id, store_id → stores.id)
  ├── suppliers       (owner_id → users.id)
  ├── customers       (owner_id → users.id)
  ├── orders          (shopkeeper_id → users.id, customer_id → customers.id)
  │   ├── order_items    (order_id → orders.id [FK CASCADE], product_id → products.id)
  │   └── invoices       (order_id → orders.id [FK], shopkeeper_id → users.id, customer_id → customers.id)
  ├── purchase_orders    (supplier_id → suppliers.id, shopkeeper_id → users.id)
  │   └── purchase_order_items (purchase_order_id → purchase_orders.id [FK CASCADE], product_id → products.id)
  ├── inventory_movements (product_id → products.id, shopkeeper_id → users.id, store_id → stores.id [FK])
  ├── stock_transfers    (product_id → products.id, from_store_id → stores.id [FK], to_store_id → stores.id [FK], requested_by/approved_by → users.id)
  ├── notifications      (user_id → users.id)
  └── audit_logs         (user_id → users.id)
```

---

## 4. Required Seed Order

| Step | Table | Depends On | Strategy |
|------|-------|------------|----------|
| 1 | `users` | — | Create admin + shopkeeper + customer users |
| 2 | `stores` | `users` (owner_id) | 3 stores owned by admin |
| 3 | `products` | `users` (owner_id), `stores` (store_id) | 50 products across 5 categories |
| 4 | `suppliers` | `users` (owner_id) | 8 suppliers owned by admin |
| 5 | `customers` | `users` (owner_id) | 5 B2B customers owned by admin |
| 6 | `orders` | `users` (shopkeeper_id), `customers` (customer_id) | 30 orders |
| 7 | `order_items` | `orders` (id, FK CASCADE), `products` (product_id) | 1 item per order |
| 8 | `invoices` | `orders` (id, FK), `users`, `customers` | 0–30 invoices (generated for completed orders) |
| 9 | `purchase_orders` | `suppliers` (supplier_id), `users` (shopkeeper_id) | 10 purchase orders |
| 10 | `purchase_order_items` | `purchase_orders` (id, FK CASCADE), `products` | 1–5 items per PO |
| 11 | `inventory_movements` | `products` (product_id), `users`, `stores` (id, FK) | 1 per order + 2 per transfer |
| 12 | `stock_transfers` | `products` (product_id), `stores` (from/to, FK), `users` | 3 transfers |
| 13 | `notifications` | `users` (user_id) | 6 notifications |
| 14 | `audit_logs` | `users` (user_id) | Optional — generated by business logic at runtime |

---

## 5. Foreign Key Dependencies (detailed)

### Seed must respect these FK constraints:

**Enforced FK constraints (will fail if violated):**
1. `order_items.order_id` → `orders.id` — insert orders before their items
2. `invoices.order_id` → `orders.id` — insert orders before invoices
3. `purchase_order_items.purchase_order_id` → `purchase_orders.id` — insert POs before their items
4. `inventory_movements.store_id` → `stores.id` — insert stores before movements with store_id
5. `stock_transfers.from_store_id` → `stores.id` — insert stores before transfers
6. `stock_transfers.to_store_id` → `stores.id` — insert stores before transfers

**Non-enforced but logically required (app will 500 if missing):**
1. `stores.owner_id` → `users.id` — users must be seeded first
2. `products.owner_id` → `users.id` — users must be seeded first
3. `products.store_id` → `stores.id` — stores must be seeded first
4. `suppliers.owner_id` → `users.id`
5. `customers.owner_id` → `users.id`
6. `orders.shopkeeper_id` → `users.id`
7. `orders.customer_id` → `customers.id` — customers before orders with customer
8. `order_items.product_id` → `products.id`
9. `invoices.shopkeeper_id` → `users.id`
10. `invoices.customer_id` → `customers.id`
11. `purchase_orders.supplier_id` → `suppliers.id`
12. `purchase_orders.shopkeeper_id` → `users.id`
13. `purchase_order_items.product_id` → `products.id`
14. `inventory_movements.product_id` → `products.id`
15. `inventory_movements.shopkeeper_id` → `users.id`
16. `stock_transfers.product_id` → `products.id`
17. `stock_transfers.requested_by` → `users.id`
18. `stock_transfers.approved_by` → `users.id`
19. `notifications.user_id` → `users.id`
20. `audit_logs.user_id` → `users.id`

### Unique constraints to consider:
- `users.email` — duplicate email will raise integrity error
- `products.sku` — duplicate SKU will raise integrity error
- `orders.order_number` — must be unique
- `invoices.invoice_number` — must be unique
- `purchase_orders.po_number` — must be unique

---

## 6. Expected Record Counts

| Table | Count | Rationale |
|-------|-------|-----------|
| `users` | 8 | 1 admin + 1 shopkeeper + 5 customer users + 1 spare |
| `stores` | 3 | Main Store, Branch Store, Warehouse |
| `products` | 50 | 10 per category × 5 categories (electronics, groceries, clothing, medicines, stationery) |
| `suppliers` | 8 | Realistic supply chain |
| `customers` | 5 | B2B clients with varying credit tiers |
| `orders` | 30 | Mix of statuses, spread over 60 days |
| `order_items` | 30 | 1 item per order |
| `invoices` | 15–20 | Generated for completed/confirmed/processing orders |
| `purchase_orders` | 10 | Varying statuses |
| `purchase_order_items` | 30–50 | 1–5 items per PO |
| `inventory_movements` | 36–45 | 30 (sales) + 6 (transfers: 3 out + 3 in) + optional purchase/adjustment |
| `stock_transfers` | 3 | Inter-store stock movement |
| `notifications` | 6 | 2 low_stock, 1 expiry, 1 payment_reminder, 2 ai_recommendation |
| `audit_logs` | 0 (seed) | Created by runtime actions; can optionally seed a few |

**Total records: ~190–210**

---

## 7. Data Generation Strategy

### 7.1 Users
- **Admin**: `admin@khatabox.com` / `Admin@123`, role: `admin`, store_name: "KhataBox Main Store"
- **Shopkeeper**: `shop@khatabox.com` / `Shop@123`, role: `shopkeeper`, store_name: "KhataBox Retail Outlet"
- **Customer users**: 5 users with role `customer`, one per B2B customer company, password: `customer123`
- Password hashing via `hash_password()` from `app.core.security` (bcrypt)

### 7.2 Stores
- 3 stores: "Main Store", "Branch Store", "Warehouse"
- All owned by admin user
- Addresses: `"123, {name} Road"`

### 7.3 Products
- 5 categories: `electronics`, `groceries`, `clothing`, `medicines`, `stationery`
- 10 products per category with realistic names
- SKU format: `{cat_prefix}-{NNN}` (e.g., `ELE-001`, `GRO-001`)
- Cost price: base per category + random offset (−20 to +50)
- Margin: random 20%–50%
- Stock quantity: random 5–120
- Reorder threshold: random choice of [5, 10, 15, 20]
- Batch/expiry data: only for `medicines` and `groceries` categories
- `store_id`: randomly assigned from available stores
- `brand`: randomly chosen per category
- `search_vector`: managed by PostgreSQL trigger (no manual input needed)

### 7.4 Suppliers
- 8 suppliers with named contacts
- Email format: `{name.lower().replace(' ', '.')}@supplier.com`
- Phone: `99` + 8 random digits
- Address: `"{random 1-100}, {name} Street"`

### 7.5 Customers
- 5 B2B customers:
  - Tech Corp (credit_limit: 100000, tier: premium)
  - Green Grocers (credit_limit: 25000, tier: standard)
  - Fashion Hub (credit_limit: 75000, tier: premium)
  - MediCare Plus (credit_limit: 50000, tier: standard)
  - Stationery World (credit_limit: 30000, tier: standard)
- `credit_used`: random between 0 and limit/2
- GST number format: `27AABCU{NNNN}D1Z5`
- Email: `{company.lower().replace(' ', '.')}@client.com`

### 7.6 Orders
- 30 orders over the past 60 days
- Each order has 1 random product, quantity 1–20
- Unit price: selling_price ± random(0–5)
- Subtotal = qty × unit_price
- Discount: random 0%–10% of subtotal
- GST: 18% of subtotal
- Total: subtotal × 1.18 − discount
- Order status: random from all 5 values
- Payment method: random from all 4 values
- Customer: 70% chance of having a customer, 30% chance null (walk-in)
- `created_at` and `updated_at` offset by random hours

### 7.7 Order Items
- 1 item per order (matches the 30 orders)
- Denormalized `product_name` copied from product at time of order
- Cascade-deleted with parent order

### 7.8 Invoices
- Not seeded explicitly in current script
- Should generate for `completed`, `confirmed`, or `processing` orders
- Invoice number format: `INV-{YYYYMMDD}-{NNNN}`
- Matches order subtotal/discount/gst/total

### 7.9 Purchase Orders
- 10 POs created over the past 45 days
- Status: random from all 4 values
- Each PO has 1–5 random products
- Unit price: cost_price × 0.8–0.95 (supplier discount)
- PO number format: `PO-{NNNNN}`

### 7.10 Purchase Order Items
- Cascade-deleted with parent PO
- Denormalized product_name

### 7.11 Inventory Movements
- 1 `SALE` movement per order (quantity = negative)
- Linked to order's store_id
- Reference: `"Order {order_number}"`
- 2 movements per stock transfer: `TRANSFER_OUT` (negative qty at src store) + `TRANSFER_IN` (positive qty at dst store)

### 7.12 Stock Transfers
- 3 transfers between random stores
- Quantity: 5–20
- Status: random from COMPLETED, APPROVED, PENDING
- Must check that source product has sufficient stock
- Creates both TRANSFER_OUT and TRANSFER_IN movements

### 7.13 Notifications
- 6 notifications across all 4 types
- Mix of read/unread (50% chance)

### 7.14 Audit Logs
- Not seeded; generated at runtime by API actions
- Can optionally seed a few historical audit entries

---

## 8. Potential Seeding Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Constraint violation on `products.sku` UNIQUE** | Seed fails on duplicate SKU | Use sequential SKU format `CAT-NNN` ensuring no collisions |
| **Constraint violation on `orders.order_number` UNIQUE** | Seed fails on duplicate | Use `ORD-{random 10000-99999}` but risk of collision in 30 samples (low but nonzero). Better: format with timestamp or counter |
| **Constraint violation on `invoices.invoice_number` UNIQUE** | Seed fails | Must generate unique invoice numbers (e.g., `INV-{timestamp}-{seq}`) |
| **Constraint violation on `purchase_orders.po_number` UNIQUE** | Seed fails | Same mitigation as orders |
| **Constraint violation on `users.email` UNIQUE** | Seed fails on re-run | Check existence before inserting (idempotent user creation) |
| **FK on `order_items.order_id` → `orders.id`** | Items orphaned | Flush orders before inserting items |
| **FK on `inventory_movements.store_id` → `stores.id`** | NULL store_id if no store | Always assign a valid store_id (nullable but should populate) |
| **FK on `stock_transfers.from_store_id`/`to_store_id`** | Invalid store reference | Ensure both stores exist and are not the same |
| **Negative stock_quantity after transfers** | Business logic violation | Check `p.stock_quantity >= qty` before creating transfer-out |
| **SKU uniqueness across re-runs** | Collision when re-seeding | Delete existing products before insert (done in current seed) |
| **Enum value mismatch** | Alembic adds enum in 0008 | Use `MovementType.TRANSFER_IN` / `TRANSFER_OUT` only after migration 0008 |
| **Missing batch/expiry data on medicines/groceries** | Reports show no expiring products | Ensure batch_number, mfg_date, expiry_date are populated for categories that need them |
| **Order orphaned from customer** | `orders.customer_id` is nullable — no issue, but reports aggregate by customer | Mix of customer-linked and walk-in orders (70/30 split) |
| **Password hash mismatch** | Login fails | Use `hash_password()` from `app.core.security` consistently |
| **Search vector not populated** | Full-text search returns no results | Managed by PostgreSQL trigger; no seed action needed |

---

## 9. Forecasting Data Requirements

### Model Architecture
- **Algorithm**: RandomForestRegressor (scikit-learn)
- **Training**: `backend/app/ml/train.py` — generates 2000 synthetic samples
- **Inference**: `backend/app/ml/predict.py` — loads `model.pkl`

### Features Used by ML Model
| Feature | Type | Source |
|---------|------|--------|
| `product_id` | int | Products table |
| `day_of_week` | int (0–6) | Computed from date |
| `month` | int (1–12) | Computed from date |
| `is_holiday` | bool (0/1) | Weekend (day ≥ 5) or Dec 25+ |
| `category_enc` | int (0–4) | Label-encoded from Product.category |

### Prediction Output
| Field | Description |
|-------|-------------|
| `predicted_demand` | Estimated units needed |
| `recommended_order_qty` | predicted_demand − current_stock |
| `confidence_score` | 0–98%, derived from tree prediction variance |
| `seasonality_factor` | 1.0–1.25 (holiday/weekend boost) |

### Seeding Requirements for Forecasting
1. Products must have valid `category` values matching the training categories
2. Orders must exist with `OrderItem.quantity` so `total_sold` can be computed
3. The forecasting endpoint (`GET /api/v1/forecasting/demand/{product_id}`) aggregates sales per product
4. **Heuristic fallback**: If model.pkl is missing, uses `total_sold * 1.1 + seasonality` — this means any seed data with order history will still return a reasonable forecast

### Training Data Considerations
- The ML training script (`train.py`) generates its own synthetic data independently of the seed
- Training uses `product_id` range 1–50, matching our 50 seeded products
- Categories in training match exactly: `electronics`, `groceries`, `clothing`, `medicines`, `stationery`
- If we want the model to reflect real seed data patterns, the training script should be re-run AFTER seeding with real sales history
- For initial deployment, the pre-generated `model.pkl` in the repo suffices

---

## Verification Checklist

- [ ] All 14 tables accounted for
- [ ] All 7 enum types with correct values
- [ ] All 6 enforced FK constraints understood
- [ ] All 20 logical FK dependencies documented
- [ ] All 5 UNIQUE constraints identified (users.email, products.sku, orders.order_number, invoices.invoice_number, purchase_orders.po_number)
- [ ] Seed order respects all FK and logical dependencies
- [ ] Dashboard stats query patterns (total_products, inventory_value, today_sales, pending_orders, low_stock_count) will return meaningful data
- [ ] Customer reports (top, repeat-purchases, CLV) require orders joined to customers
- [ ] Expiry tracking requires batch_number, mfg_date, expiry_date on relevant products
- [ ] Forecasting works with both ML model and heuristic fallback
- [ ] Existing seed script at `backend/seed.py` aligns with this plan
