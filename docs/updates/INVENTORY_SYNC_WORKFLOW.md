# Inventory Synchronization Workflow (Orders → Inventory)

## Goal
Inventory must automatically stay correct by synchronizing stock with order status changes.

## Source of truth (current implementation)
Inventory synchronization is implemented in the backend order status update endpoint:

- `PATCH /api/v1/orders/{order_id}/status`
  - implemented in: `backend/app/api/v1/orders.py` → `update_order_status(...)`

Dashboard statistics reflect inventory changes via product stock fields:

- `GET /api/v1/dashboard/stats`
  - implemented in: `backend/app/api/v1/dashboard.py` → `get_dashboard_stats(...)`
  - reads `Product.stock_quantity` (inventory value) and `Order` aggregates (sales/orders)

## Inventory fields and movements
The reservation lifecycle uses:
- `Product.stock_quantity` (available/physical stock shown on dashboards)
- `Product.reserved_quantity` (reserved stock held for confirmed orders)
- `InventoryMovement` rows in `inventory_movements`

Movement types used by the implementation:
- `reserve_out` (movement type name: `MovementType.RESERVE_OUT`)
- `consume_out` (movement type name: `MovementType.CONSUME_OUT`)
- `reserve_cancelled_in` (movement type name: `MovementType.RESERVE_CANCELLED_IN`)

(These movement types are supported by DB enum extension in `backend/alembic/versions/0010_inventory_reservation_support.py`.)

> Note: The implementation stores `InventoryMovement.quantity` as a negative value for `reserve_out` and `consume_out`, and a positive value for `reserve_cancelled_in`, while the stock/reserved counters are updated using `+=/-= it.quantity` in code.

## Order status workflow & inventory sync rules

Statuses used by the backend enum:
- `pending`
- `confirmed`
- `processing` (treated as Ready in the docs workflow; handled as an eligible previous state for completion/cancellation)
- `completed`
- `cancelled`

### 1) When order is confirmed (`pending` → `confirmed`)
Implemented behavior (in `update_order_status`):
For every item in the order:
1. Validate availability:
   - requires `product.stock_quantity >= item.quantity`
   - otherwise returns HTTP 400 (“Insufficient stock for reservation”)
2. Reserve stock:
   - `product.stock_quantity -= item.quantity`
   - `product.reserved_quantity += item.quantity`
3. Record inventory movement:
   - create `InventoryMovement` with:
     - `movement_type = MovementType.RESERVE_OUT`
     - `quantity = -item.quantity`
     - `reference = f"Order #{order.order_number}"`

Outcome:
- Available stock decreases immediately.
- Reserved stock increases immediately.
- Inventory movement is recorded automatically.

### 2) When order is completed (`confirmed`/`processing` → `completed`)
Implemented behavior:
For every order item:
1. Release reserved stock without changing physical stock further:
   - validates `product.reserved_quantity >= item.quantity`
   - `product.reserved_quantity -= item.quantity`
2. Record inventory movement:
   - create `InventoryMovement` with:
     - `movement_type = MovementType.CONSUME_OUT`
     - `quantity = -item.quantity`
     - `reference = f"Order #{order.order_number}"`

Outcome:
- Reserved quantity decreases.
- `Product.stock_quantity` remains decreased (already reserved at confirmation time).
- Inventory movement is recorded automatically.

### 3) When order is cancelled (`pending` → `cancelled`)
Implemented behavior:
- The implementation treats `cancelled` from `pending` as a no-op:
  - does not change `stock_quantity`
  - does not change `reserved_quantity`
  - does not create reservation/consumption movements

Outcome:
- No stock reservation leakage occurs.
- No inventory movement is created by this transition.

### 4) When order is cancelled (`confirmed`/`processing` → `cancelled`)
Implemented behavior:
For every order item:
1. Release reserved stock and restore availability:
   - validates `product.reserved_quantity >= item.quantity`
   - `product.reserved_quantity -= item.quantity`
   - `product.stock_quantity += item.quantity`
2. Record inventory movement:
   - create `InventoryMovement` with:
     - `movement_type = MovementType.RESERVE_CANCELLED_IN`
     - `quantity = item.quantity` (positive)
     - `reference = f"Order #{order.order_number}"`

Outcome:
- Reserved stock is restored back to available stock.
- Inventory movement is recorded automatically.

## Dashboard statistics updates
The dashboard statistics endpoint does not rely on background jobs or receipts; it reads current DB state at request time:

- `GET /api/v1/dashboard/stats` (in `backend/app/api/v1/dashboard.py`)
  - `total_inventory_value` is derived from `Product.stock_quantity`
  - order-related counters/amounts are derived from `Order`

Therefore, after inventory sync updates the `Product.stock_quantity` field (reserve/cancel/restoration), dashboard inventory values reflect the correct totals on subsequent dashboard calls.

## Notes / Non-goals
- Receipts are not implemented (and not needed for this inventory sync).
- Other transitions not explicitly handled in the code are intentionally ignored.

## What to reference
- Inventory synchronization implementation:
  - `backend/app/api/v1/orders.py` → `update_order_status(...)`
- Inventory movement types / reservation support migration:
  - `backend/alembic/versions/0010_inventory_reservation_support.py`
- Dashboard stats computation:
  - `backend/app/api/v1/dashboard.py` → `get_dashboard_stats(...)`

## Implementation status
- Inventory synchronization logic for reserve/deduct/restore + movement recording is present in code.
- Tests:
  - `backend/tests/test_inventory_sync.py` currently does not align with existing pytest fixtures in `backend/tests/conftest.py` (missing `db_session` / `auth_user_shopkeeper` fixtures).
  - Inventory sync behavior was verified by code inspection of the actual status transition handler and dashboard stats endpoint, rather than passing automated tests.

## Remaining gaps
- Fix and re-run inventory sync tests using the existing fixtures (`client`, auth tokens) and API endpoints so the scenarios are exercised end-to-end.
