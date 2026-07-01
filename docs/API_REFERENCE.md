---
title: KhataBox API Reference
description: Complete API endpoint documentation for all 22 backend route modules.
---

# API Reference

Base URL: `/api/v1`

Authentication: JWT Bearer token in `Authorization` header (except public endpoints).

---

## 1. Authentication (`auth.py`)

Endpoints for registration, login, and user management.

### POST `/auth/register`

Create a new user account. Public endpoint (admin registration is blocked).

**Request Body:**
```json
{
  "email": "store@example.com",
  "password": "securepass",
  "name": "Store Name",
  "role": "shopkeeper",
  "store_name": "My Store",
  "phone": "9876543210",
  "store_type": "kirana",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "gst_number": "27ABCDE1234F1Z5"
}
```

**Response (201):** `TokenResponse` (access_token, refresh_token, user)

### POST `/auth/login`

Authenticate with email and password. Public endpoint.

**Request Body:**
```json
{ "email": "admin@khatabox.com", "password": "Admin@123" }
```

**Response (200):** `TokenResponse`

### GET `/auth/me`

Get current authenticated user profile. Requires JWT.

**Response (200):** `UserResponse`

### GET `/auth/users`

List all users. Admin only. Optional query params: `role`, `search`.

**Response (200):** `list[UserResponse]`

### PATCH `/auth/users/{user_id}/role`

Update user role. Admin only. Query param: `new_role`.

**Response (200):** `UserResponse`

### PATCH `/auth/users/{user_id}/toggle-active`

Toggle user active status. Admin only.

**Response (200):** `UserResponse`

---

## 2. Dashboard (`dashboard.py`)

### GET `/dashboard/stats`

Dashboard statistics. Requires admin/shopkeeper. Optional query param: `store_id`.

**Response (200):**
```json
{
  "total_products": 150,
  "total_inventory_value": 450000.50,
  "today_sales_count": 12,
  "today_sales_amount": 18500.00,
  "pending_orders_count": 5,
  "low_stock_count": 3
}
```

Results are cached in Redis for 300 seconds.

---

## 3. Catalog (`catalog.py`)

Customer-facing product catalog. Requires authentication (any role).

### GET `/catalog/products`

List active products with filters. Query params: `search`, `category`, `brand`, `min_price`, `max_price`.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Product Name",
    "sku": "SKU001",
    "category": "electronics",
    "brand": "Brand",
    "selling_price": 1500.00,
    "stock_quantity": 50
  }
]
```

### GET `/catalog/by-uuid/{uuid}`

Get product by UUID.

**Response (200):** Product details (same fields as above).

---

## 4. Products (`products.py`)

Full product CRUD. Requires admin/shopkeeper.

### GET `/products/`

List products with filters. Query params: `search`, `category`, `brand`, `stock_status`, `min_price`, `max_price`, `store_id`, `page`, `page_size`. Supports full-text search via `search` parameter.

**Headers:** X-Total-Count, X-Page, X-Page-Size, X-Total-Pages (when paginated)

**Response (200):** `list[ProductResponse]`

### POST `/products/`

Create a new product. SKU must be unique per owner.

**Response (201):** `ProductResponse`

### GET `/products/by-uuid/{uuid}`

Get product by UUID.

**Response (200):** `ProductResponse`

### GET `/products/{product_id}`

Get product by ID.

**Response (200):** `ProductResponse`

### PUT `/products/{product_id}`

Update product fields.

**Response (200):** `ProductResponse`

### POST `/products/{product_id}/image`

Upload product image. Accepts multipart/form-data file upload.

**Response (200):** `ProductResponse` (with image_url)

### DELETE `/products/{product_id}`

Soft-delete (sets is_active=False).

**Response (204):** No content

---

## 5. Orders (`orders.py`)

Order management with reservation lifecycle. Requires admin/shopkeeper (except my-orders requires customer).

### GET `/orders/`

List orders. Paginated. Query params: `page`, `page_size`.

**Headers:** X-Total-Count, X-Page, X-Page-Size, X-Total-Pages

**Response (200):** `list[OrderResponse]`

### POST `/orders/`

Create a new order. 18% GST auto-calculated.

**Response (201):** `OrderResponse`

### POST `/orders/bulk`

Create a bulk order (B2B customer). Resolves customer by email. Validates credit limit for credit payment.

**Response (201):** `OrderResponse`

### GET `/orders/my-orders`

Get current customer's orders. Requires customer role. Resolved by customer email.

**Response (200):** `list[OrderResponse]`

### GET `/orders/{order_id}`

Get order by ID.

**Response (200):** `OrderResponse`

### PATCH `/orders/{order_id}/status`

Update order status. Manages inventory reservation:
- `confirmed`: Decrements stock_quantity, increments reserved_quantity. Creates `reserve_out` movement.
- `completed`: Decrements reserved_quantity. Creates `consume_out` movement. Generates receipt.
- `cancelled` (from confirmed/processing): Increments stock_quantity, decrements reserved_quantity. Creates `reserve_cancelled_in` movement.

**Response (200):** `OrderResponse`

---

## 6. Suppliers (`suppliers.py`)

Supplier CRUD + price analysis. Requires admin/shopkeeper.

### GET `/suppliers/`

List suppliers. Paginated. Query params: `page`, `page_size`.

**Response (200):** `list[SupplierResponse]`

### POST `/suppliers/`

Create a supplier.

**Response (201):** `SupplierResponse`

### PUT `/suppliers/{supplier_id}`

Update supplier.

**Response (200):** `SupplierResponse`

### DELETE `/suppliers/{supplier_id}`

Delete supplier.

**Response (204):** No content

### GET `/suppliers/price-analysis`

Margin analysis grouped by supplier. Compares last purchase price vs current selling price.

**Response (200):** `list[SupplierPriceAnalysisResponse]`

---

## 7. Customers (`customers.py`)

B2B customer CRUD. Requires admin/shopkeeper.

### GET `/customers/`

List customers. Paginated. Query params: `page`, `page_size`.

**Response (200):** `list[CustomerResponse]`

### POST `/customers/`

Create a customer.

**Response (201):** `CustomerResponse`

### PUT `/customers/{customer_id}`

Update customer.

**Response (200):** `CustomerResponse`

### DELETE `/customers/{customer_id}`

Delete customer.

**Response (204):** No content

---

## 8. Forecasting (`forecasting.py`)

ML demand forecasting. Requires admin/shopkeeper.

### GET `/forecasting/demand/{product_id}`

Get demand forecast for a product. Uses ML model if available; falls back to heuristic.

**Response (200):**
```json
{
  "product_id": 1,
  "product_name": "Product Name",
  "current_stock": 50,
  "total_sold_last_30_days": 120,
  "predicted_demand": 45,
  "recommended_order_qty": 0,
  "confidence_score": 87,
  "seasonality_factor": 1.15
}
```

---

## 9. Inventory (`inventory.py`)

Inventory movements and stock updates. Requires admin/shopkeeper.

### GET `/inventory/movements`

List inventory movements. Query params: `product_id`, `store_id`, `movement_type`, `page`, `page_size`.

**Response (200):** `list[MovementResponse]`

### GET `/inventory/movements/{product_id}`

Get movements for a specific product.

**Response (200):** `list[MovementResponse]`

### POST `/inventory/stock-update`

Update stock quantity. Action can be `add`, `remove`, or `adjust`.

**Request Body:**
```json
{
  "product_id": 1,
  "store_id": 1,
  "action": "add",
  "quantity": 10
}
```

**Response (200):** `StockUpdateResponse`

---

## 10. Invoices (`invoices.py`)

PDF invoice generation. Requires admin/shopkeeper.

### POST `/invoices/generate/{order_id}`

Generate a PDF invoice for an order. Uses ReportLab. Returns downloadable PDF.

**Response (200):** PDF file (StreamingResponse)

---

## 11. Receipts (`receipts.py`)

Receipt retrieval and PDF download. Requires admin/shopkeeper (some endpoints for customer).

### GET `/receipts/order/{order_id}`

Get receipt data for an order.

**Response (200):** Receipt JSON (items, taxes, total, payment method)

### GET `/receipts/history`

List all receipts for current shopkeeper (or all for admin).

**Response (200):** `list[Receipt]`

### GET `/receipts/my`

Get current customer's receipts (requires customer role).

**Response (200):** `list[Receipt]`

### GET `/receipts/{receipt_id}/pdf`

Download receipt as PDF.

**Response (200):** PDF file (StreamingResponse)

---

## 12. Purchase Orders (`purchase_orders.py`)

Purchase order management. Requires admin/shopkeeper.

### GET `/purchase-orders/`

List purchase orders (with items loaded).

**Response (200):** `list[POResponse]`

### POST `/purchase-orders/`

Create a purchase order with items. Auto-calculates total.

**Response (201):** `POResponse`

### PATCH `/purchase-orders/{po_id}/status`

Update PO status (draft/sent/received/cancelled).

**Response (200):** `POResponse`

---

## 13. QR Codes (`qrcodes.py`)

QR code generation. Requires admin/shopkeeper.

### GET `/qrcodes/product/{product_id}`

Legacy QR code (encodes integer product ID). Returns PNG image.

**Response (200):** PNG image

### GET `/qrcodes/batch`

Batch QR label sheet (up to 18 labels per page). Query param: `ids` (comma-separated product IDs).

**Response (200):** PNG image

### GET `/qrcodes/permanent/{product_id}`

Get permanent QR code (encodes product UUID). Returns PNG.

**Response (200):** PNG image

### GET `/qrcodes/permanent/{product_id}/data`

Get permanent QR identity data (product UUID).

**Response (200):** `{ "product_id": 1, "product_uuid": "uuid-string" }`

### POST `/qrcodes/permanent/{product_id}/regenerate`

Regenerate product UUID. Returns new QR image.

**Response (200):** PNG image

---

## 14. Expiry (`expiry.py`)

Expiry tracking. Requires admin/shopkeeper.

### GET `/expiry/upcoming`

Get products expiring within 30, 60, and 90 day buckets.

**Response (200):**
```json
{
  "message": "Found 3 products expiring within 30 days...",
  "alerts": {
    "30_days": [{"product_id": 1, "name": "...", "days_remaining": 15, ...}],
    "60_days": [],
    "90_days": []
  }
}
```

---

## 15. Audit (`audit.py`)

Audit log access. Admin only.

### GET `/audit/logs`

List audit logs. Query params: `entity_type`, `limit` (default 50, max 500), `offset`.

**Response (200):** `list[AuditLogResponse]`

---

## 16. Notifications (`notifications.py`)

User notifications. Requires any authenticated role.

### GET `/notifications/`

List notifications. Optional query param: `type` (low_stock, expiry, payment_reminder, ai_recommendation).

**Response (200):** `list[NotificationResponse]`

### PATCH `/notifications/mark-all-read`

Mark all notifications as read.

**Response (200):** `{ "message": "All notifications marked as read" }`

### PATCH `/notifications/{notification_id}/read`

Mark single notification as read.

**Response (200):** `NotificationResponse`

---

## 17. Reports (`reports.py`)

Customer analytics reports. Requires admin/shopkeeper.

### GET `/reports/customers/top`

Top customers by total spend. Query param: `limit` (default 10, max 100).

**Response (200):** List of customers with total_spent, order_count

### GET `/reports/customers/repeat-purchases`

Customers with more than one order. Query param: `limit`.

**Response (200):** List of repeat customers

### GET `/reports/customers/clv`

Customer lifetime value analysis. Query param: `min_orders` (default 1).

**Response (200):** List of customers with lifetime_value, avg_order_value, last_order_date

---

## 18. Stores (`stores.py`)

Multi-store management. Requires admin/shopkeeper.

### GET `/stores/`

List stores. Paginated. Query params: `page`, `page_size`.

**Response (200):** `list[StoreResponse]`

### POST `/stores/`

Create a store.

**Response (201):** `StoreResponse`

### PUT `/stores/{store_id}`

Update store.

**Response (200):** `StoreResponse`

### DELETE `/stores/{store_id}`

Soft-delete store (sets is_active=False).

**Response (204):** No content

---

## 19. Stock Transfers (`transfers.py`)

Inter-store stock transfers. Requires admin/shopkeeper.

### GET `/transfers/`

List transfers. Query params: `status`, `limit` (default 50, max 500), `offset`.

**Response (200):** `list[StockTransferResponse]`

### POST `/transfers/`

Create a transfer request. Validates source store ownership, product assignment, and sufficient stock. Decrements source stock immediately.

**Response (201):** `StockTransferResponse`

### GET `/transfers/{transfer_id}`

Get transfer details.

**Response (200):** `StockTransferResponse`

### PATCH `/transfers/{transfer_id}/status`

Update transfer status. Valid actions: `approved` (creates transfer_in movement), `rejected` (restores stock), `completed`.

**Response (200):** `StockTransferResponse`

---

## 20. Customer Cart (`customer_cart.py`)

Customer shopping cart. Requires customer role.

### GET `/cart/`

List customer carts. Paginated.

**Response (200):** `list[CustomerCartResponse]`

### GET `/cart/{cart_id}`

Get cart with items.

**Response (200):** `CustomerCartResponse`

### POST `/cart/`

Create a new cart with items.

**Response (201):** `CustomerCartAddResponse`

### POST `/cart/items`

Add items to active cart (or create new cart if none exists).

**Response (200):** `CustomerCartAddResponse`

### PUT `/cart/{cart_id}/items/{item_id}`

Update item quantity. Query param: `quantity`.

**Response (200):** `CustomerCartItemResponse`

### DELETE `/cart/{cart_id}/items/{item_id}`

Remove item from cart.

**Response (204):** No content

### POST `/cart/checkout`

Checkout the active cart. Creates order with credit limit validation.

**Response (200):** Order details

### POST `/cart/{cart_id}/checkout`

Checkout a specific cart.

**Response (200):** Order details

### DELETE `/cart/{cart_id}`

Delete cart.

**Response (204):** No content

---

## 21. Data Management (`data.py`)

Export, import, and backup operations. Admin only (export endpoints).

### GET `/data/export/products`

Export products as XLSX spreadsheet.

**Response (200):** XLSX file

### GET `/data/export/orders`

Export orders as XLSX spreadsheet.

**Response (200):** XLSX file

### GET `/data/backup/export`

Export full database as JSON.

**Response (200):** JSON object with all tables

### POST `/data/backup/import`

Import full database from JSON.

**Request Body:** JSON object with table data

**Response (200):** Import result

### POST `/data/backup/export-r2`

Export backup to Cloudflare R2.

**Response (200):** `{ "key": "backup_20260101.json" }`

### POST `/data/backup/restore-r2`

Restore backup from Cloudflare R2. Query param: `key`.

**Response (200):** Restore result

### POST `/data/import/products`

Import products from CSV or XLSX file. Validates SKU uniqueness.

**Response (200):** `{ "created": 10, "errors": [], "total": 10 }`

---

## 22. Health

### GET `/health`

Service health check. Public.

**Response (200):** `{ "status": "ok", "service": "KhataBox API" }`
