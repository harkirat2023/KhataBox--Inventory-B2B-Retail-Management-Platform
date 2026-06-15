# Product QR Identity System

## Overview

Every product now has a permanent QR identity tied to a **product UUID** (`product_uuid`). The QR encodes **only the UUID** — no mutable fields (name, price, stock, category) are embedded. This ensures the same QR code remains valid for the lifetime of the product, regardless of price changes, stock updates, or product information edits.

## Database Changes

### New Column: `products.product_uuid`

- **Type:** `UUID` (PostgreSQL `uuid` type)
- **Constraint:** `NOT NULL`, `UNIQUE`
- **Generation:** Auto-generated via Python `uuid.uuid4()` on model creation; existing rows backfilled via `gen_random_uuid()` in migration `0009`

### Migration

- **File:** `backend/alembic/versions/0009_product_uuid.py`
- **Revision:** `0009` (depends on `0008`)
- **Operations:**
  1. Add `product_uuid` column (nullable initially)
  2. Backfill existing rows with `gen_random_uuid()`
  3. Set `NOT NULL` constraint
  4. Add unique constraint

## Backend API Endpoints

### Permanent QR Endpoints (new)

All under `/api/v1/qrcodes/`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/permanent/{product_id}` | Returns QR PNG encoding the product UUID |
| `GET` | `/permanent/{product_id}/data` | Returns `{ product_id, product_uuid }` JSON |
| `POST` | `/permanent/{product_id}/regenerate` | Replaces UUID with a new one, returns QR PNG |

### Legacy Endpoints (unchanged, backward compatible)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/product/{product_id}` | Returns QR PNG encoding the integer product ID |
| `GET` | `/batch?ids=1,2,3` | Returns label sheet with QR + product info |

## Frontend Changes

### Product Type (`src/types/product.ts`)

Added `product_uuid: string` field to the `Product` interface.

### QR Management Dialog (`src/components/products/product-qr-dialog.tsx`)

New dialog component accessible from the Inventory page's actions column (QR icon button). Features:
- Displays the permanent QR code image (loaded via authenticated fetch as blob/data URL)
- Shows the product UUID with copy-to-clipboard
- Download QR as PNG
- Regenerate UUID (with confirmation prompt)

### Inventory Page (`src/app/(dashboard)/inventory/page.tsx`)

- Added QR icon button in the actions column (between Pencil and Delete)
- Displays `ProductQrDialog` when clicked

## QR Content

The QR code encodes **only** the product UUID string. Example content:

```
90aecff9-ca8b-4a14-a92a-6ef52ba6b67d
```

This means:
- ✅ Works with price changes
- ✅ Works with stock changes
- ✅ Works with product info changes
- ✅ Works across inventory, billing, ordering, and future workflows
- ❌ Does NOT contain name, price, stock, category, or store name

## Verification

Backend integration test (`backend/_test_qr_system.py`) verifies:
1. `product_uuid` is present in product API responses
2. QR image generation returns valid PNG
3. QR data endpoint returns correct UUID
4. UUID regeneration works and produces a new UUID
5. Legacy endpoints remain functional

## File Changes Summary

| File | Change |
|------|--------|
| `backend/app/models/product.py` | Added `product_uuid` column |
| `backend/app/schemas/product.py` | Added `product_uuid` to `ProductResponse` |
| `backend/alembic/versions/0009_product_uuid.py` | New migration |
| `backend/app/api/v1/qrcodes.py` | Added permanent QR endpoints |
| `src/types/product.ts` | Added `product_uuid` to type |
| `src/components/products/product-qr-dialog.tsx` | New QR management dialog |
| `src/app/(dashboard)/inventory/page.tsx` | Added QR button to actions column |
