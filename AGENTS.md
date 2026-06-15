<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Runtime Status (2026-06-09)
**All 35 API endpoint tests PASS. All 20 frontend routes serve 200.**
- Backend: `localhost:8002` (FastAPI + Uvicorn)
- Frontend: `localhost:3000` (Next.js)
- Database: PostgreSQL 5432, 14 tables, 11,531+ records
- Redis: 6379
- Admin: admin@khatabox.com / Admin@123
- Shopkeeper: {store}@khatabox.com / Shop@123
- Customer: contact.{...}@client.com / customer123

## Known Fixes Applied
1. `orders.py:82,153,187` — `db.refresh(order, ["items"])` to fix MissingGreenlet
2. `orders.py:111` — `payload.customer_id` → `customer.id` for BulkOrderCreate
3. `seed_india.py` — Added `DELETE FROM users WHERE email != 'admin@khatabox.com'` on re-run
4. `purchase_orders.py:111` — `db.refresh(po, ["items"])` for consistency

## Test Report
See `docs/RUNTIME_TEST_REPORT.md` for complete results.

## Next Tasks (if any)
- Frontend integration tests (login flow, page navigation)
- Individual supplier/customer/product CRUD tests
- Stock transfer creation test
- RBAC hardening (customer → dashboard scoping)
