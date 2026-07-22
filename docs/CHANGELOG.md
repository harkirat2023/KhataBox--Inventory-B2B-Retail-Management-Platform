# Changelog

All notable changes to the KhataBox project are documented in this file.

---

## [1.1.0] -- 2026-07-13

### Added

- **OTP-based Authentication**
  - Email-based OTP login via Resend API with auto-fill development fallback (`debug_otp`).
  - Registration page auto-signs in after registration and redirects shopkeepers to `/setup-inventory`.

- **Multi-Cart Billing (Zustand Store)**
  - New Zustand + persist store (`store/billing.ts`) managing an array of carts with states: active, incomplete, cancelled.
  - `+` button creates new cart; `< >` arrows switch carts.
  - ORDER HISTORY section shows deleted carts with cancelled count.
  - QR scan auto-adds product with qty 1 + inline +/- adjustments.
  - Stock validation prevents adding more than stock.

- **Seed Products Table**
  - New `seed_products` table (migration 0017) with 178 products across 6 store types.
  - Standalone `seed_seed_products.py` seeder using batched INSERT (Neon-compatible, no superuser perms).
  - `/setup-inventory` frontend page for shopkeeper onboarding.

- **Receipt System**
  - Receipts and receipt_items tables with automatic generation on order completion.
  - Receipt items created from order items in `order_service.py`.

- **B2C Order Support**
  - B2C orders and customer carts tables.
  - Payments table.

- **UI Standardisation (Session 2026-07-11)**
  - All 21 two-button dialog footers standardised: Confirm = `bg-green-600`, Cancel = `bg-red-600`.
  - `ORDER_STATUS_CONFIG` and local status configs use solid `bg-{color}-600` badges.
  - Inventory stock status badges: out-of-stock = `bg-red-600`, low-stock = `bg-amber-600`, in-stock = `bg-green-600`.
  - `TableHead` uses `font-bold` (was `font-semibold`), `CardTitle` uses `font-semibold` (was `font-medium`).
  - Sidebar text standardised with consistent weight and dark-mode overrides.
  - Dashboard "Our Suggestions" card (6th quick action item, emerald theme, Lightbulb icon).

### Changed

- **Startup script:** `start-dev.bat` replaced by `scripts/start-khatabox.bat` with improved reliability (fixed `findstr` matching, temp file encoding, label positioning, CWD handling).
- **Database URL handling:** `sslmode`/`channel_binding` stripped from Neon DB URL via `urlparse` (asyncpg rejects these; SSL auto-enabled).
- **Migration 0017:** Idempotent (`CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`).
- **Seed script idempotency:** Extended truncation list to include `payments`, `b2c_orders`, `b2c_order_items`, `customer_carts`, `customer_cart_items`, `seed_products`; uses `SET session_replication_role = 'replica'` to skip FK ordering.
- **Order status weights:** Extended from 5 to 6 entries to match 6-valued `OrderStatus` enum (migration 0014 added `counter`).
- **`client-api.ts`:** Added `extractError()` helper; `getApiUrl()` upgrades `http://` to `https://` when `window.location.protocol === "https:"` (fixes Mixed Content on Vercel).
- **Frontend dev server:** Uses `--webpack` flag instead of Turbopack due to path-encoding bug with spaces.
- **Cart routes:** `/api/v1/customer-cart/` -> `/api/v1/cart/` to match backend routes.
- **Dashboard stats:** Added `placeholderData` to keep "Setup Inventory" banner pinned after seed setup.
- **`customer.py` model:** Removed `cascade="all, delete-orphan"` from `carts` relationship + `lazy="noload"` (customer_carts table does not exist, caused 500 on DELETE).
- **Order schemas:** Added `apply_gst: bool = True` field; `order_service.py` checks before calculating GST.
- **Billing page:** Stock validation, `product_name` in order payload, conditionally hides GST line when `order.gst === 0`.

### Fixed

- **`database.py` & `alembic/env.py`:** Strip `sslmode`/`channel_binding` from Neon DB URL via `urlparse`.
- **`seed_india.py:933`:** Extended `status_weights` from 5 to 6 entries.
- **`seed_india.py:609`:** Added missing tables to truncation list.
- **`scripts/start-khatabox.bat`:** Fixed `findstr "0"` matching "10","20" etc; temp file encoding; label positioning; CWD handling; `%` -> `%%d`/`%%s` escaping; replaced `) else if` with `goto`.
- **`orders.py:82,153,187`:** `db.refresh(order, ["items"])` to fix MissingGreenlet.
- **`orders.py:111`:** `payload.customer_id` -> `customer.id` for BulkOrderCreate.
- **`purchase_orders.py:111`:** `db.refresh(po, ["items"])` for consistency.
- **`order_service.py`:** Receipt generation moved after main `db.commit()` to avoid FK constraint violations.
- **Removed rogue root `package-lock.json`** (no root `package.json` existed, but it confused Next.js).

## [1.0.0] -- 2026-06-09

### Added

- **Authentication & Authorization**
  - JWT-based authentication (access + refresh tokens) with bcrypt password hashing.
  - NextAuth v5 credentials provider integration on the frontend.
  - Role-based access control (admin, shopkeeper, customer) with server-side `require_role()` and client-side `RoleGuard`.
  - Registration endpoint for shopkeeper sign-up.

- **Multi-Store Management**
  - Store CRUD with active/inactive toggle.
  - Product-to-store assignment via `product.store_id` foreign key.
  - Active store selector persisted via Zustand.

- **Product Management**
  - Full CRUD for products with soft-delete (`is_active` flag).
  - Product image upload with Cloudflare R2 storage support.
  - Full-text search using PostgreSQL `tsvector` with GIN index.
  - Expiry and batch tracking (`batch_number`, `mfg_date`, `expiry_date`).

- **Inventory Management**
  - Inventory movement history with movement types (sale, purchase, adjustment, transfer_in, transfer_out).
  - Stock transfer system between stores with approval workflow (pending, approved, rejected, completed).
  - Inventory reservation on order creation with stock decrement.

- **B2B Customer Management**
  - Customer CRUD with credit limit tracking (`credit_limit`, `credit_used`).
  - GST number and price tier support.
  - Customer lifetime value reports and repeat purchase analysis.

- **Order Lifecycle**
  - Order CRUD with multiple statuses (pending, confirmed, processing, shipped, delivered, cancelled).
  - Bulk order creation for customer portal.
  - Order status updates with audit logging.
  - Order matching by customer email for customer portal.

- **Supplier Management**
  - Supplier CRUD with contact details.
  - Supplier price analysis with margin calculation and cost comparison.

- **Purchase Orders**
  - Purchase order CRUD with line items.
  - Status workflow (draft, sent, confirmed, received, cancelled).

- **QR Code Generation**
  - Per-product QR code generation returning PNG images.
  - Batch QR label printing with 3x6 grid layout.

- **ML Demand Forecasting**
  - Random Forest Regressor model trained on synthetic historical data.
  - Prediction endpoint returning demand, recommended order quantity, confidence score, and seasonality factor.
  - Graceful fallback when model is not trained.

- **Dashboard**
  - Stats endpoint with parallel queries (`asyncio.gather`).
  - Redis caching with pattern-based invalidation.
  - Metrics: total inventory value, today's sales, pending orders, low stock products.

- **Reports**
  - Top customers by spending.
  - Repeat purchase frequency.
  - Customer lifetime value (CLV) calculation.
  - Sales performance.

- **Notifications**
  - Low-stock detection and threshold-based alerts.
  - Expiry notifications (30/60/90 day buckets).
  - Mark-all-read functionality.

- **Real-time**
  - Socket.IO server mounted at `/ws` for real-time notifications.

- **Data Import/Export**
  - JSON backup and restore for all 14 database tables.
  - Cloudflare R2 backup upload and download.
  - CSV/XLSX import for bulk product uploads.
  - XLSX export for data portability.

- **Audit Logging**
  - Automatic audit trail for entity changes (create, update, delete).
  - Paginated audit log retrieval.

- **Rate Limiting**
  - 100 requests per minute sliding window.
  - Redis-backed with in-memory fallback.

- **Monitoring**
  - Sentry SDK integration for error tracking (optional).
  - PostHog integration for product analytics (optional).
  - Performance middleware adding `X-Response-Time` headers.

- **Infrastructure**
  - Docker Compose for local PostgreSQL 16 and Redis 7.
  - Railway deployment config (`railway.json`) with Dockerfile.
  - 17 Alembic database migrations covering all schema changes.

- **Frontend Pages (20+)**
  - Public: Home, Login, Register, Catalog, Cart, Scan, Customer portal, My Orders, Receipts.
  - Dashboard: Dashboard home, Orders, Order History, Billing, Customers, Inventory, Inventory Movements, Inventory Scan, Suppliers, Supplier Price Analysis, Purchase Orders, Transfers, QR Labels, Forecasting, Reports, Notifications, Stores, Admin Users, Settings, Setup Inventory.

- **Testing**
  - 39+ integration tests across 20 API endpoint groups (pytest, async).
  - 5 frontend unit tests (Vitest).

- **Demo Data**
  - Idempotent seed script (`seed_india.py`) generating 11,531+ records across 14 tables.
  - 178 seed products across 6 store types (via `seed_seed_products.py`).

### Changed

- Seed script made idempotent -- cleans orphaned users on re-run.
- Login page rendered as a route group page rather than a modal.

### Fixed

- **MissingGreenlet error** in order creation: `db.refresh(order)` changed to `db.refresh(order, ["items"])` to eagerly load relationships in async context.
- **MissingGreenlet error** in order status update: same fix applied at `orders.py:187`.
- **MissingGreenlet error** in purchase orders: `db.refresh(po)` changed to `db.refresh(po, ["items"])`.
- **BulkOrderCreate AttributeError**: changed `payload.customer_id` to `customer.id` -- the schema did not have a `customer_id` field; customer is resolved via authenticated user email.
- **Orphaned customer users** from previous seed runs: added `DELETE FROM users WHERE email != 'admin@khatabox.com'` to seed cleanup.

### Security

- JWT access tokens expire in 30 minutes; refresh tokens in 7 days.
- bcrypt password hashing via `passlib`.
- CORS origins configurable via environment variable.
- Rate limiting: 100 req/min sliding window.
- Sentry PII disabled (`send_default_pii=False`).
- All external services (Resend, Sentry, PostHog, R2, Redis) have graceful degradation -- no hard dependency.

### Notes

- Package version in `package.json` is `0.1.0` -- this changelog entry treats the initial release as v1.0.0.
