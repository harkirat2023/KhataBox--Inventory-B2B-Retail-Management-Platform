# Order Management Workflow — Shopkeeper Reception & Status Updates

## Goal
As soon as a customer creates an order, the shopkeeper must immediately be able to **see it in the shopkeeper Orders dashboard** and update its status.

## Roles
- **Customer**: places an order after checkout.
- **Shopkeeper**: receives orders, reviews details, and updates order status.

## Order Statuses
Frontend-visible standardized statuses:

1. **Pending**
2. **Confirmed**
3. **Ready**
4. **Completed**
5. **Cancelled**

### Backend ↔ Frontend mapping
Current backend status enum uses:
- `pending`
- `confirmed`
- `processing`
- `completed`
- `cancelled`

Mapping to the standardized workflow:

| Workflow label (Docs) | Backend value |
|---|---|
| Pending | `pending` |
| Confirmed | `confirmed` |
| Ready | `processing` |
| Completed | `completed` |
| Cancelled | `cancelled` |

> Note: The UI displays `processing` as **Ready** (no backend enum change required in this phase).

## Workflow (End-to-End)

### 1) Customer creates an order
1. Customer completes checkout.
2. System converts cart → order and persists:
   - order number
   - shopkeeper id
   - customer id
   - order items (product, quantity, unit price, line total)
   - payment method
   - initial order status = `pending`

### 2) Shopkeeper receives the order (immediate visibility)
Shopkeeper opens **Orders** dashboard.

#### Current delivery mechanism
- The dashboard auto-refreshes by polling the Orders API every ~3 seconds.
- This achieves near-immediate visibility without requiring Socket.IO wiring for order-created events.

#### What the shopkeeper sees for each order
The dashboard shows:
- **customer name** (`customer.company_name`)
- **order items**
  - product name
  - product SKU
  - quantity
  - amount per line item
- **order totals**
  - subtotal / taxes / discounts (as available by existing contract)
  - final amount (`order.total`)
- **payment method**
- **current status**

### 3) Shopkeeper updates status
Shopkeeper updates the order status using the status dropdown:
- Pending → Confirmed → Ready → Completed
- Or Pending/Confirmed/Ready → Cancelled

Status updates use:
- `PATCH /api/v1/orders/{order_id}/status`
- Body: `{ "status": "<pending|confirmed|processing|completed|cancelled>" }`

The UI uses the standardized labels, but sends backend status values.

### 4) Completed / Cancelled outcomes
- **Completed**: final state
- **Cancelled**: final state

## Order API Contract (High-level)
- Shopkeeper retrieves their orders using:
  - `GET /api/v1/orders/`
- Shopkeeper retrieves a single order using:
  - `GET /api/v1/orders/{order_id}`
- Shopkeeper updates status using:
  - `PATCH /api/v1/orders/{order_id}/status`

## Socket.IO note
Socket.IO is mounted at `/ws`, but order-created events are not emitted/handled in this phase.
Therefore, polling is used for immediate dashboard refresh and documented as the current approach.
