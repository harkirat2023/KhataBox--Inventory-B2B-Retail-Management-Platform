# TODO - Single-Store Cart Refactor (Customer Side)

- [ ] Update `frontend/src/store/customer-cart.ts`
  - Add `selectedStoreId`, `hasStoreConflict`, `pendingStoreId`
  - Ensure every cart item carries `storeId`
  - Refactor actions:
    - `addItem` rejects cross-store adds (sets conflict + pendingStoreId, preserves existing cart)
    - `cancelStoreConflict` clears flags only
    - `confirmStoreConflictOk` is the ONLY code path that mutates `selectedStoreId`
- [ ] Update `frontend/src/app/cart/page.tsx`
  - Drive the conflict modal from `useCustomerCartStore` flags (not `useCustomerStore`)
  - Implement Cancel/OK behavior per requirements:
    - Cancel: only clear conflict flags
    - OK: switch cart’s `selectedStoreId`, remove other-store items, remove out-of-stock items, recalc totals, clear pending flags, refresh
- [ ] Update `frontend/src/app/scan/page.tsx`
  - Use cart store’s centralized `addItem`/conflict handling
  - Remove any direct calls to `setConflict/resolveConflict` from `useCustomerStore`
- [ ] Update `frontend/src/app/catalog/page.tsx`
  - Replace direct `addItem` + POST behavior with centralized cart-store add flow (no auto store switching)
  - Ensure cart-store rejects cross-store before any server cart POST that would overwrite server cart state
- [ ] Remove/centralize any remaining selected-store mutation logic
  - Search for usage of `setSelectedStore`, `hasStoreConflict`, `pendingStoreId`, `selectedStoreId` and cart item storeId fields
- [ ] Verify end-to-end scenario:
  1) Add items from Store XYZ ✅
  2) Attempt add from Store ABC → conflict recorded, cart unchanged ✅
  3) Open My Cart → modal shows ✅
  4) Cancel → cart unchanged ✅
  5) Open My Cart → OK → cart switches, removes other-store + out-of-stock items, refresh ✅
