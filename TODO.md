# TODO - Shopkeeper Order Reception + Order Management Docs

## Code changes
- [x] Update backend order API response contract:
  - [x] Include `customer_name` in `GET /api/v1/orders/` and `GET /api/v1/orders/{order_id}`
  - [x] Include `product_sku` per order item
  - [x] Include `total` (amount) per order item (and ensure UI can show amount)
  - [x] Ensure response fields match frontend `src/types/order.ts` + `OrdersPage` UI usage
- [x] Add automatic order refresh on shopkeeper Orders dashboard (polling every ~3s)
  - [x] Prefer Socket.IO if already wired for order-created events; if not wired, document reason and use polling
- [x] Standardize order status names:
  - [x] Document mapping: Task “Ready” == backend `processing`
  - [x] Ensure API accepts/returns consistent status values

## Docs
- [x] Generate `docs/updates/ORDER_MANAGEMENT_WORKFLOW.md`
- [x] Generate `docs/updates/ORDER_API_CONTRACT.md`

## Testing (manual via commands / existing test suite)
- [ ] Test customer order creation end-to-end (create -> shopkeeper sees)
- [ ] Test shopkeeper order visibility + refresh behavior
- [ ] Test status transitions (pending/confirmed/processing/completed/cancelled)
- [ ] Run backend test suite (pytest) if available

## Remaining gaps
- [ ] Review any mismatches between backend contract and frontend types/UI after implementation
