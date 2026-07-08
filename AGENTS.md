<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Runtime Status (2026-07-08)
**All 43 backend tests PASS (39 API + 4 inventory sync). All 20 frontend routes serve 200.**
- Migrations: All 17 applied (Neon DB), including `seed_products` table
- Seed products: 150+ across 7 store types (Section 12 of `seed_india.py`)
- Backend: `localhost:8002` (FastAPI + Uvicorn)
- Frontend: `localhost:3000` (Next.js)
- Database: PostgreSQL 5432, 14 tables, 11,531+ records
- Redis: 6379
- Admin: admin@khatabox.com / Admin@123
- Shopkeeper: {store}@khatabox.com / Shop@123
- Customer: contact.{...}@client.com / customer123

## Quick Start
Run `scripts\start-khatabox.bat` from the repo root. It handles Docker, migrations, seed data, and both servers.

## Known Fixes Applied
0. **Session 2026-07-08 fixes:**
   - `database.py` & `alembic/env.py` — Strip `sslmode`/`channel_binding` from Neon DB URL via `urlparse` (asyncpg rejects them; SSL auto-enabled)
   - `0017_seed_products_table.py` — Idempotent migration using `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`
   - `seed_india.py:933` — Extended `status_weights` from 5→6 entries to match 6-valued `OrderStatus` enum (migration 0014 added `counter`)
   - `seed_india.py:609` — Added missing tables (`payments`, `b2c_orders`, `b2c_order_items`, `customer_carts`, `customer_cart_items`, `seed_products`) to truncation list + used `SET session_replication_role = 'replica'` to skip FK ordering issues
   - `scripts/start-khatabox.bat` — Fixed `findstr "0"` matching "10","20" etc; writes Python checks to `%TEMP%` files (avoid PowerShell encoding issues); auto-detects local Docker vs remote Neon; **moved `:wait_db` label outside `IF (...)` block** (labels inside parens cause ". was unexpected at this time"); **added `pushd "%BACKEND%"` before Python check script** (otherwise `from app.core.database` fails when CWD is `scripts\`); fixed `%` → `%%d`/`%%s` escaping in Python format strings; **replaced `) else if` with `goto`** (batch requires `else` on same line as `)`)
   - `seed_india.py:Section 12` — Idempotent seeding of `seed_products` table (150+ products across 7 store types)
   - Created `SeedProduct` model, GET/POST endpoints, and `/setup-inventory` frontend page
   - Register page: auto-`signIn` after registration, redirect shopkeepers to `/setup-inventory?store_type=X`
   - Removed rogue root `package-lock.json` (no root `package.json` existed, but it confused Next.js)
   - Rewrote `README.md` — added local dev guide, cloud deployment (Railway+Vercel), dev workflow section, Neon DB notes, known issues
   - `auth.py:send_otp` — Added `debug_otp` in response when Resend API key not configured (dev mode fallback)
   - `register/page.tsx` — Auto-fill OTP input from `debug_otp` response field
1. `orders.py:82,153,187` — `db.refresh(order, ["items"])` to fix MissingGreenlet
2. `orders.py:111` — `payload.customer_id` → `customer.id` for BulkOrderCreate
3. `seed_india.py` — Added `DELETE FROM users WHERE email != 'admin@khatabox.com'` on re-run
4. `purchase_orders.py:111` — `db.refresh(po, ["items"])` for consistency
5. `order_service.py:create_order` & `create_bulk_order` — Set `status=OrderStatus.COMPLETED` on creation, deduct inventory, generate receipt + receipt items, update Khata credits in a single flow. Receipt generation moved **after** the main `db.commit()` to avoid violating FK constraints on uncommitted data.
6. Required manual migration fix: `alembic upgrade head` fails for revision `0011_receipt_system` because `sa.Enum(create_type=False)` still emits `CREATE TYPE` which conflicts with the PL/pgSQL guard. Workaround: run the raw SQL manually (see `docs/RECEIPT_TABLE_MIGRATION.md` or the ad-hoc script `D:\create_receipt_tables.py` which was used and cleaned up). To redo: `CREATE TABLE IF NOT EXISTS receipts (...)` + `CREATE TABLE IF NOT EXISTS receipt_items (...)` then `UPDATE alembic_version SET version_num = '0011_receipt_system'`.
7. `package.json` — Use `--webpack` flag instead of Turbopack (`next dev --webpack`) to avoid path-encoding bug with spaces in project path.
8. `cart/page.tsx` & `customers/scan/page.tsx` — Replaced `/api/v1/customer-cart/` → `/api/v1/cart/` to match backend routes.
9. `client-api.ts` — Added `extractError()` helper to convert FastAPI array validation errors to readable strings.
10. `billing/page.tsx` — Added stock validation (prevents adding more than stock) + `product_name` in order payload.
11. `customer.py:27` — Removed `cascade="all, delete-orphan"` from `carts` relationship and added `lazy="noload"` — `customer_carts` table does not exist in DB, causing 500 on DELETE.
12. `order.py` — Added `apply_gst: bool = True` field to `OrderCreate` and `BulkOrderCreate` schemas.
13. `order_service.py` — Checks `getattr(payload, "apply_gst", True)` before calculating GST (both `create_order` and `create_bulk_order`).
14. `my-orders/[id]/page.tsx` & `receipts/[id]/page.tsx` — Conditionally hide GST line when `order.gst === 0`.
15. `store/billing.ts` — New multi-cart billing store (Zustand + persist). Manages array of carts with states: active, incomplete, cancelled. Supports add/delete/switch cart actions.
16. `billing/page.tsx` — Multi-cart system: `+` button creates new cart (prev goes to ORDERS), `< >` arrows switch carts, ORDERS section shows incomplete carts with delete, ORDER HISTORY section shows deleted carts with cancelled count. QR scan auto-adds product with qty 1 + shows preview with inline +/- adjustments.

## Test Report
See `docs/RUNTIME_TEST_REPORT.md` for complete results.

## Next Tasks (if any)
- Frontend integration tests (login flow, page navigation)
- Individual supplier/customer/product CRUD tests
- Stock transfer creation test
- RBAC hardening (customer → dashboard scoping)
