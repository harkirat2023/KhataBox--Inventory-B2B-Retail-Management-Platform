# Inventory QR Scanning Workflow

## Overview

Shopkeepers can now update inventory by scanning product QR codes. The workflow supports camera scanning (mobile/desktop), manual UUID entry, and three stock operations: Add, Remove, and Adjust.

## Workflow

1. Shopkeeper opens **Inventory Scan** (`/inventory/scan`)
2. Scans a product QR code (or enters UUID manually)
3. System looks up product by UUID and displays:
   - Product name
   - SKU
   - Current stock quantity
   - Category
   - Store
4. Shopkeeper selects an action:
   - **Add Stock** — increases stock quantity
   - **Remove Stock** — decreases stock quantity (validated against current stock)
   - **Stock Adjustment** — sets stock to exact quantity
5. On submit:
   - Stock quantity is updated immediately
   - Inventory movement record is created
   - Low stock notification is triggered if applicable
   - Preview shows the resulting stock before submission

## Backend API Changes

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/products/by-uuid/{uuid}` | Look up a product by its UUID (validates UUID format, returns 404 for invalid/missing) |
| `POST` | `/api/v1/inventory/stock-update` | Update stock and create inventory movement |

### `POST /api/v1/inventory/stock-update`

**Request:**
```json
{
  "product_id": 1,
  "store_id": null,
  "action": "add | remove | adjust",
  "quantity": 10
}
```

**Response:**
```json
{
  "product_id": 1,
  "product_name": "LED Bulb 12W",
  "sku": "ELE-0001",
  "previous_stock": 50,
  "new_stock": 60,
  "movement_id": 3943,
  "movement_type": "purchase"
}
```

**Validation:**
- `action` must be `"add"`, `"remove"`, or `"adjust"`
- `quantity` must be non-negative
- `remove` action fails with `400` if quantity exceeds current stock
- Product must exist, be active, and belong to the current user

**Movement types created:**
| Action | Movement Type |
|--------|---------------|
| `add` | `purchase` |
| `remove` | `sale` |
| `adjust` | `adjustment` |

### Changes to Existing Files

| File | Change |
|------|--------|
| `backend/app/api/v1/products.py` | Added `get_product_by_uuid` endpoint |
| `backend/app/api/v1/inventory.py` | Added `StockUpdateRequest`, `StockUpdateResponse` schemas and `stock_update` endpoint |

## Frontend Changes

### New Page: `/inventory/scan`

**File:** `src/app/(dashboard)/inventory/scan/page.tsx`

**Features:**
- **Camera scanning** via `html5-qrcode` library (uses `facingMode: "environment"` for rear camera)
- **Manual UUID entry** with search button
- **Product info card** showing name, SKU, stock, category, store
- **Three action buttons** with visual state (selected action highlighted)
- **Quantity input** with validation:
  - Remove: cannot exceed current stock (red error shown)
  - Add: shows resulting stock preview
  - Adjust: shows delta from current stock
- **Loading/error states** for all async operations

### New Sidebar Link

Added "Inventory Scan" (`/inventory/scan`) to the sidebar, visible to `admin` and `shopkeeper` roles, between "QR Labels" and "Orders".

### New Dependency

- `html5-qrcode` — QR code scanning via browser camera/webcam API

## Database / Migration

No database or migration changes required. This feature uses the existing `product_uuid` column added in migration `0009` and the existing `inventory_movements` table.

## Verification

Integration tests verified:
1. Product lookup by UUID returns correct product
2. Add stock updates quantity and creates purchase movement
3. Remove stock updates quantity and creates sale movement
4. Insufficient stock correctly rejected (400)
5. Adjust stock sets exact quantity and creates adjustment movement
6. Movement records contain correct type and quantity
7. Invalid action rejected (422)
8. Invalid UUID rejected (404)
9. Unknown (but valid-format) UUID rejected (404)

## File Changes Summary

| File | Change |
|------|--------|
| `backend/app/api/v1/products.py` | Added `/by-uuid/{uuid}` lookup endpoint |
| `backend/app/api/v1/inventory.py` | Added `stock-update` endpoint with validation |
| `src/app/(dashboard)/inventory/scan/page.tsx` | New Inventory Scan page |
| `src/components/layout/sidebar.tsx` | Added "Inventory Scan" nav link |
| `package.json` | Added `html5-qrcode` dependency |
