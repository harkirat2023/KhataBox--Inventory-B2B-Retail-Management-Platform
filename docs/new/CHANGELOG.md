# Changelog

All notable changes to the KhataBox project are documented in this file.

---

## [1.0.0] — 2026-06-09

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
  - Vercel deployment config (`vercel.json`).
  - 8 Alembic database migrations covering all schema changes.

- **Frontend Pages (20+)**
  - Public: Home, Login, Register, Catalog, Cart, Scan, Customer portal, My Orders, Receipts.
  - Dashboard: Dashboard home, Orders, Order History, Billing, Customers, Inventory, Inventory Movements, Inventory Scan, Suppliers, Supplier Price Analysis, Purchase Orders, Transfers, QR Labels, Forecasting, Reports, Notifications, Stores, Admin Users, Settings.

- **Testing**
  - 35 integration tests across 20 API endpoint groups (pytest, async).
  - 4 frontend unit tests (Vitest).

- **Demo Data**
  - Idempotent seed script (`seed_india.py`) generating 11,531+ records.
  - 15 shopkeepers, 100 customers, 300 products across 16 stores.

### Changed

- Seed script made idempotent — cleans orphaned users on re-run.
- Login page rendered as a route group page rather than a modal.

### Fixed

- **MissingGreenlet error** in order creation: `db.refresh(order)` changed to `db.refresh(order, ["items"])` to eagerly load relationships in async context.
- **MissingGreenlet error** in order status update: same fix applied at `orders.py:187`.
- **MissingGreenlet error** in purchase orders: `db.refresh(po)` changed to `db.refresh(po, ["items"])`.
- **BulkOrderCreate AttributeError**: changed `payload.customer_id` to `customer.id` — the schema did not have a `customer_id` field; customer is resolved via authenticated user email.
- **Orphaned customer users** from previous seed runs: added `DELETE FROM users WHERE email != 'admin@khatabox.com'` to seed cleanup.

### Security

- JWT access tokens expire in 30 minutes; refresh tokens in 7 days.
- bcrypt password hashing via `passlib`.
- CORS origins configurable via environment variable.
- Rate limiting: 100 req/min sliding window.
- Sentry PII disabled (`send_default_pii=False`).
- All external services (Resend, Sentry, PostHog, R2, Redis) have graceful degradation — no hard dependency.

### Notes

- Package version in `package.json` is `0.1.0` — this changelog entry treats the initial release as v1.0.0.
