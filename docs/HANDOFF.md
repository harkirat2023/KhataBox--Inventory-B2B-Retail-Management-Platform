# KhataBox — Handoff Document

> **Generated:** 2026-06-10 (Updated from comprehensive codebase audit)
> **Purpose:** Complete context for any AI agent to continue development without prior conversation history.

---

## 1. Project Overview

**KhataBox** is a full-stack inventory & B2B retail management platform for small and medium retailers. It replaces spreadsheets with a single intelligent system for inventory tracking, billing, supplier management, customer management, AI demand forecasting, and analytics.

| Aspect | Detail |
|--------|--------|
| **Domain** | Inventory management, B2B commerce, retail operations |
| **Target Users** | Shopkeepers, wholesalers, B2B customers |
| **Key Differentiator** | AI-powered demand forecasting (Random Forest, R²=0.862) |
| **Dev Platform** | Windows 11 (Dev), Production: Railway + Vercel + Neon |
| **Runtime** | Python 3.12 (Docker), Node.js 22+, PostgreSQL 16 |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + React 19 + TypeScript)              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Auth.js  │  │ TanStack     │  │ shadcn/ui + Tailwind 4 │ │
│  │ v5       │  │ Query +      │  │ Sonner, Recharts       │ │
│  │          │  │ Zustand      │  │ Lucide icons           │ │
│  └──────────┘  └──────────────┘  └────────────────────────┘ │
│                    │ proxy.ts (route guard)                  │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTP (JWT Bearer token)
┌────────────────────▼─────────────────────────────────────────┐
│  Backend (FastAPI — Python 3.14)                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ API v1     │  │ Services   │  │ Services (cont.)       │ │
│  │ (20 route  │  │ (auth,     │  │ email.py, cache.py,    │ │
│  │  modules)  │  │  billing,  │  │ backup.py, storage.py, │ │
│  │            │  │  forecast, │  │ socketio_manager.py,   │ │
│  │            │  │  notify)   │  │ task_queue.py          │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
│                    │  ML Service: Random Forest (model.pkl)   │
│      SQLAlchemy 2.0 (async) + Alembic (4 migrations)         │
│      Pydantic v2 for validation                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│  PostgreSQL 16.7 (Docker dev / Neon prod)                    │
│  14 tables: users, products, orders, order_items, invoices, │
│  suppliers, purchase_orders, purchase_order_items, customers, │
│  inventory_movements, notifications, audit_logs, stores      │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow
1. User authenticates via Auth.js → JWT stored in NextAuth session
2. Client-side API calls (`client-api.ts`) attach JWT Bearer header
3. FastAPI validates JWT via `get_current_user` dependency
4. SQLAlchemy async session executes queries against PostgreSQL
5. ML predictions served from `model.pkl` (Random Forest)
6. Responses flow back as JSON → consumed by React components

---

## 3. Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.2.7 | App Router, SSR, route protection via proxy.ts |
| React | 19.2.4 | UI components |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Styling (CSS-first, no tailwind.config.js) |
| shadcn/ui | ^4.11 | Component library (15+ primitives on @base-ui/react) |
| Recharts | ^3.8 | Charts (sales trends, forecasting, reports) |
| Zustand | ^5.0 | Cart state + active store context (localStorage-persisted) |
| Auth.js (NextAuth) | ^5.0.0-beta.31 | Authentication (Credentials provider, JWT strategy) |
| TanStack Query | ^5.101 | API caching infrastructure (provider wired, not yet used pervasively) |
| Sonner | ^2.0 | Toast notifications |
| Lucide React | ^1.17 | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.115.6 | REST API framework |
| Uvicorn | 0.34.0 | ASGI server |
| SQLAlchemy | 2.0.50 | ORM (async, Mapped[] style) |
| asyncpg | 0.31.0 | PostgreSQL async driver |
| Alembic | 1.14.0 | Database migrations (11 migrations, head: 0011) |
| Pydantic | 2.13.4 | Data validation (model_validate() pattern) |
| python-jose | 3.3.0 | JWT tokens |
| passlib + bcrypt | 1.7.4 + 4.0.1 | Password hashing |
| scikit-learn | 1.9.0 | ML model (RandomForestRegressor, model.pkl) |
| pandas | 3.0.3 | Data processing |
| reportlab | 4.5.1 | PDF invoice generation |
| Pillow + qrcode | 12.2 + 8.2 | QR code + batch label generation (3×6 grid) |
| openpyxl | 3.1.5 | Excel export/import |
| redis | 5.2.1 | Caching + task queues (graceful fallback when unavailable) |
| python-socketio | 5.11.0 | Real-time updates (in-memory adapter, mounted at /ws) |
| sentry-sdk | 2.19.0 | Error monitoring (conditional init) |
| resend | 2.30.1 | Email notifications |
| posthog | 3.7.2 | Product analytics |
| boto3 | 1.35.0 | Cloudflare R2/S3 storage |

### Infrastructure
| Component | Dev | Production |
|-----------|-----|------------|
| Database | Docker `postgres:16-alpine` port 5432 | Neon PostgreSQL |
| Cache | — | Upstash Redis |
| File Storage | — | Cloudflare R2 |
| Backend Host | localhost:8001+ | Railway (Dockerfile + railway.json) |
| Frontend Host | localhost:3000 | Vercel (vercel.json configured) |
| Error Tracking | — | Sentry |
| Analytics | — | PostHog |
| Real-time | In-memory | Redis-backed (multi-process) |

---

## 4. Codebase Structure

```
```
KhataBox/
├── AGENTS.md                          # Next.js 16 dev rules (READ FIRST)
├── CLAUDE.md                          # AI agent context
├── package.json                       # Frontend dependencies
├── next.config.ts                     # Next.js config (empty defaults)
├── eslint.config.mjs                  # ESLint config (core-web-vitals + typescript)
├── postcss.config.mjs                 # Tailwind v4 PostCSS
├── components.json                    # shadcn/ui config
├── tsconfig.json                      # TypeScript (bundler, @/* -> src/*)
├── .gitignore
├── .env.example                       # Frontend env template (3 vars)
├── .env.local                         # Frontend dev env
├── vercel.json                        # Vercel deployment config
│
├── src/
│   ├── proxy.ts                       # Next.js 16 proxy/auth route guard
│   ├── providers.tsx                  # Session + QueryClient providers
│   ├── app/
│   │   ├── globals.css                # Tailwind v4 + OKLCH theme
│   │   ├── layout.tsx                 # Root layout (Inter font, Providers)
│   │   ├── page.tsx                   # Landing page
│   │   ├── login/page.tsx             # Credentials login
│   │   ├── register/page.tsx          # Shopkeeper registration
│   │   ├── api/auth/[...nextauth]/route.ts  # NextAuth handler
│   │   └── (dashboard)/
│   │       ├── layout.tsx             # Sidebar + TopNav + BottomNav + Toaster
│   │       ├── dashboard/page.tsx     # Stats, sales chart, top products
│   │       ├── catalog/page.tsx       # B2B catalog + cart
│   │       ├── my-orders/page.tsx     # Customer order history
│   │       ├── inventory/page.tsx     # Product CRUD table
│   │       ├── inventory/movements/page.tsx
│   │       ├── qr-labels/page.tsx     # Batch QR labels
│   │       ├── stores/page.tsx        # Multi-store CRUD
│   │       ├── orders/page.tsx
│   │       ├── transfers/page.tsx     # Stock transfers
│   │       ├── billing/page.tsx
│   │       ├── suppliers/page.tsx
│   │       ├── suppliers/price-analysis/page.tsx
│   │       ├── purchase-orders/page.tsx
│   │       ├── customers/page.tsx
│   │       ├── forecasting/page.tsx   # ML predictions + chart
│   │       ├── reports/page.tsx       # Sales + customer reports
│   │       ├── notifications/page.tsx
│   │       ├── admin/users/page.tsx
│   │       └── settings/page.tsx
│   ├── components/
│   │   ├── ui/                        # 14 shadcn/ui primitives (Button, Card, Dialog, etc.)
│   │   ├── layout/sidebar.tsx         # Desktop sidebar (role-filtered nav)
│   │   ├── layout/top-nav.tsx         # Search, notifications, avatar menu
│   │   ├── layout/bottom-nav.tsx      # Mobile bottom nav + FAB
│   │   ├── auth/role-guard.tsx        # RoleGuard + useRole hook
│   │   └── products/product-form-dialog.tsx
│   ├── lib/
│   │   ├── auth.ts                    # NextAuth v5 config (Credentials, JWT)
│   │   ├── auth-client.ts             # SessionProvider re-export
│   │   ├── auth-guard.ts              # requireAuth() server-side
│   │   ├── client-api.ts              # HTTP client (JWT Bearer)
│   │   ├── api.ts                     # Server-side HTTP client
│   │   ├── store-context.ts           # Zustand active-store (localStorage)
│   │   └── utils.ts                   # cn() utility
│   ├── store/cart.ts                  # Zustand cart (items, discount)
│   ├── types/                         # 7 interface files + NextAuth augmentation
│   └── test/                          # 4 Vitest test files (setup, utils, card, client-api, store-context)
│
├── backend/
│   ├── requirements.txt               # 27 packages
│   ├── .env / .env.example            # Dev + production env templates
│   ├── Dockerfile                     # Python 3.12-slim, CMD uses $PORT
│   ├── .dockerignore                  # Excludes venv, __pycache__, .env, .git
│   ├── railway.json                   # Railway deployment config
│   ├── pytest.ini                     # asyncio_mode=auto
│   ├── seed.py                        # Idempotent seed (2 users, 50 products, 30 orders, etc.)
│   ├── alembic.ini
│   ├── alembic/env.py                 # Async env with import all models
│   ├── alembic/versions/
│   │   ├── 0001_initial_schema.py     # 11 tables + 5 enums
│   │   ├── 0002_fulltext_search.py    # search_vector tsvector + GIN
│   │   ├── 0003_expiry_batch.py       # batch_number, mfg/expiry dates
│   │   ├── 0004_multi_store.py        # stores table + product.store_id
│   │   ├── 0005_product_image_url.py  # product.image_url
│   │   ├── 0006_performance_indexes.py # 5 composite indexes
│   │   ├── 0007_stock_transfers.py    # stock_transfers + inventory_movements.store_id
│   │   └── 0008_transfer_enums.py     # transfer_in/out in movementtype enum
│   ├── app/
│   │   ├── main.py                    # FastAPI + CORS + rate-limiter + perf + Sentry + PostHog + Socket.IO
│   │   ├── config.py                  # 16 env vars (Pydantic BaseSettings)
│   │   ├── core/
│   │   │   ├── database.py            # Async engine, sessionmaker, get_db()
│   │   │   ├── dependencies.py        # get_current_user(), require_role()
│   │   │   └── security.py            # bcrypt, JWT create/decode
│   │   ├── models/                    # 14 SQLAlchemy models (user, product, store, order, receipt, etc.)
│   │   ├── schemas/                   # 9 Pydantic schema files
│   │   ├── api/v1/                    # 19 route modules
│   │   │   ├── __init__.py            # Router aggregator
│   │   │   ├── auth.py                # 6 endpoints (register, login, me, users, role, active)
│   │   │   ├── dashboard.py           # GET /stats (parallel async gather)
│   │   │   ├── catalog.py             # GET /products (public B2B)
│   │   │   ├── products.py            # CRUD + image upload + FTS
│   │   │   ├── orders.py              # CRUD + bulk + my-orders + status
│   │   │   ├── suppliers.py           # CRUD + price-analysis
│   │   │   ├── customers.py           # CRUD
│   │   │   ├── forecasting.py         # ML demand predict
│   │   │   ├── inventory.py           # movements list + by-product
│   │   │   ├── invoices.py            # PDF generate
│   │   │   ├── receipts.py            # Receipt system with QR codes
│   │   │   ├── purchase_orders.py     # CRUD + status
│   │   │   ├── qrcodes.py             # single + batch labels
│   │   │   ├── expiry.py              # upcoming (30/60/90-day)
│   │   │   ├── audit.py               # logs (paginated)
│   │   │   ├── notifications.py       # list + mark-read
│   │   │   ├── reports.py             # top customers, repeat, CLV
│   │   │   ├── stores.py              # CRUD
│   │   │   ├── transfers.py           # CRUD + status
│   │   │   └── data.py                # export/import/backup/R2
│   │   ├── services/
│   │   │   ├── backup.py              # JSON dump/restore + R2 export
│   │   │   ├── cache.py               # Redis get/set/delete (graceful)
│   │   │   ├── email.py               # Resend send_email
│   │   │   ├── notifications.py       # Low-stock check + email alert
│   │   │   ├── rate_limiter.py        # 100 req/min (Redis + in-memory fallback)
│   │   │   ├── socketio_manager.py    # Socket.IO @ /ws
│   │   │   ├── storage.py             # R2 upload/download/delete
│   │   │   └── task_queue.py          # Redis FIFO queue
│   │   ├── ml/
│   │   │   ├── predict.py             # predict_demand() + is_model_ready()
│   │   │   ├── train.py               # Synthetic data → RF training
│   │   │   └── model.pkl              # Trained RandomForest bundle
│   │   └── __init__.py
│   └── tests/
│       ├── conftest.py                # Session fixtures (subprocess uvicorn :18999)
│       └── test_api.py                # 39 async tests, 20 endpoint groups
│
├── docs/
│   ├── PROJECT_STRUCTURE.md           # Complete directory tree (this is the authoritative reference)
│   ├── HANDOFF.md                     # This file
│   ├── PRD.md, DESIGN.md, TECHSTACK.md
│   ├── DEPLOYMENT_CHECKLIST.md        # Production deployment plan
│   ├── ENV_SETUP.md                   # 8-service provisioning guide
│   ├── FINAL_AUDIT_REPORT.md          # Production audit (79/100)
│   ├── RUNTIME_TEST_REPORT.md         # Runtime E2E test results
│   ├── FILE_BY_FILE_EXPLANATION.md    # Codebase walkthrough (43 files)
│   ├── MASTER_INTERVIEW_GUIDE.md      # Interview prep (18 sections)
│   ├── ENGINEERING_JOURNAL.md         # 28 features with engineering decisions
│   ├── CODE_SNIPPETS.md               # Reusable code fragments
│   ├── CODE_WALKTHROUGH.md            # Code walkthrough guide
│   └── ...                            # Additional reference docs
```

**Statistics:** 22 frontend pages, 19 backend routers, 12 models, 9 schemas, 8 services, 8 migrations, 1 ML pipeline, 39 backend tests, 4 frontend tests.

---

## 5. Completed Work

### Phase 1: Admin User Management
- `GET /auth/users` with optional `role` and `search` query params
- `PATCH /auth/users/{id}/role` — update user role (validates against enum)
- `PATCH /auth/users/{id}/toggle-active` — activate/deactivate (prevents self-deactivation)
- Frontend at `/admin/users` — RoleGuard-protected, with search, role filter, inline role assignment

### Phase 2: Multi-Store Inventory
- `Store` model: id, name, address, owner_id
- Migration 0004: stores table + product.store_id (nullable, backward compatible)
- Store CRUD: `GET/POST/PUT/DELETE /stores/`
- `store_id` filter on `GET /products/`, `store_name` in ProductResponse
- Frontend at `/stores` — store management page

### Phase 2: QR Label Batch Printing
- `GET /qrcodes/batch?ids=1,2,3` — returns a PNG label sheet (3 cols × 6 rows)
- Each label: 80×80 QR code + product name, SKU, price, stock, category
- Frontend at `/qr-labels` — product table with checkboxes, search, print button

### Phase 4: B2B Bulk Order Flow
- `GET /catalog/products` — customer-facing product listing (active only, searchable by name/sku/category/brand/price)
- `POST /orders/bulk` — customer places order with credit check
  - Auto-resolves `Customer` record by matching `User.email` to `Customer.email`
  - If `payment_method == "credit"`, checks `credit_used + total <= credit_limit`
  - On success, deducts stock, creates inventory movement, triggers low-stock check, increments `credit_used`
- `GET /orders/my-orders` — customer's order history filtered by `customer_id`
- Seed script now creates User accounts with role "customer" for each B2B customer (password: "customer123")
- Frontend at `/catalog` — product grid with search, category filter, cart sidebar, checkout dialog
- Frontend at `/my-orders` — order history table with detail dialog

### Phase 6: Customer Reports
- `GET /reports/customers/top?limit=N` — top customers by total spend (excludes cancelled)
- `GET /reports/customers/repeat-purchases?limit=N` — customers with order_count > 1
- `GET /reports/customers/clv?min_orders=N` — lifetime value, avg order value, last order date
- Frontend: new "Customers" tab on `/reports` with three cards (top, repeat, CLV)

### Phase 7: Resend Email Integration
- `app/services/email.py` — async `send_email(to, subject, html)` using Resend API
- `app/services/notifications.py` — on low-stock alert, sends email to `User.email` (if `RESEND_API_KEY` set)
- Config: `RESEND_API_KEY` env var

### Phase 7: Socket.IO Real-Time Updates
- `app/services/socketio_manager.py` — AsyncServer mounted at `/ws`
- Supports `connect`, `disconnect`, `subscribe` (to `user_{user_id}` room) events
- Socket.IO app mounted on FastAPI in `main.py`

### Phase 8: Backup & Restore
- `GET /data/backup/export` — full DB dump as JSON (all 13 tables, timestamps serialized)
- `POST /data/backup/import` — restore from JSON payload
- `POST /data/backup/export-r2` — upload backup to Cloudflare R2
- `POST /data/backup/restore-r2?key=...` — restore from R2

### Phase 8: Redis Caching Layer
- `app/services/cache.py` — `get/set/delete/invalidate_pattern` with JSON serialization
- Falls back gracefully if Redis unavailable
- Config: `REDIS_URL` env var

### Phase 8: Redis Task Queue
- `app/services/task_queue.py` — `enqueue/dequeue/queue_length` using Redis lists
- Task format: `{type, payload, created_at}`

### Phase 8: Cloudflare R2 Storage
- `app/services/storage.py` — S3-compatible `upload/download/delete_file/get_public_url`
- Uses boto3 with s3v4 signing
- Config: `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### Phase 9: Sentry Monitoring
- `sentry_sdk.init()` in `main.py` with `traces_sample_rate=0.2`
- Conditional on `SENTRY_DSN` being set

### Phase 9: PostHog Analytics
- `posthog.project_api_key` / `posthog.host` configured in `main.py`
- Config: `POSTHOG_API_KEY`, `POSTHOG_HOST` env vars

### Phase 9: Performance Middleware
- `X-Response-Time` header added on every request (milliseconds)
- Middleware in `main.py`

### Phase 9: Tests
- 39 async test methods across 20 endpoint groups in `backend/tests/test_api.py`
- Tests cover: auth, products, orders, suppliers, customers, dashboard, inventory, purchase orders, forecasting, notifications, expiry, audit, invoice, QR codes, user management, catalog, bulk orders, customer reports, backup export, stores
- 4 frontend Vitest tests: utils, card component, client-api, store-context

### Pre-Launch Blockers Fixed (2026-06-09)
1. **Dockerfile** — `CMD` updated to use `$PORT` env var: `${PORT:-8000}`
2. **`.dockerignore`** — Created, excludes venv, __pycache__, .env, .git, tests, logs
3. **`vercel.json`** — Created at root with nextjs framework, env vars from Vercel secrets
4. **`proxy.ts`** (replaces deprecated `middleware.ts`) — Already existed at `src/proxy.ts` with auth redirect logic
5. **`alembic.ini`** — Updated with env var override documentation
6. **`railway.json`** — Created with Docker builder, health check at /api/v1/health

### Other Improvements
- `catalog.py` router registered as `/api/v1/catalog`
- `reports.py` router registered as `/api/v1/reports`
- `stores.py` router registered as `/api/v1/stores`
- `transfers.py` router registered as `/api/v1/transfers` (stock transfers between stores)
- Customer user accounts created in seed script for B2B login
- Sidebar updated with Catalog + My Orders for customer role users
- Stock transfers with approve/reject/complete workflow adjusting inventory movements
- Rate limiter with in-memory fallback (100 req/min, integrated as middleware)
- Products image upload to R2 with placeholder fallback

---

## 6. Pending Work

### Pre-Launch (must fix before production deployment)
- [ ] Verify `pgvector` extension on Neon PostgreSQL if ML needs vector search
- [ ] Set `SECRET_KEY` to strong random value in production
- [ ] Update `CORS_ORIGINS` to production frontend domain
- [ ] Run `alembic upgrade head` on production database
- [ ] Run `python seed.py` on production (idempotent — DELETES all data first — use only for initial seed)
- [ ] Configure Vercel environment secrets: `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_API_URL`
- [ ] Configure Railway environment variables from `.env.example`

### Infrastructure (requires cloud credentials)
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway
- [ ] Configure Neon PostgreSQL production
- [ ] Configure Upstash Redis production
- [ ] Set up Cloudflare R2 + Resend + Sentry + PostHog env vars

### Code Improvements (post-launch)
- [ ] **JWT refresh interceptor** on frontend — users logged out after 30 min with no recovery (Medium)
- [ ] **Connect forecasting trend chart** to real API data instead of hardcoded mock data (Low-Medium)
- [ ] **Add loading/skeleton states** to all pages (Medium)
- [ ] **Add error boundary pages** (4xx, 5xx) — no `error.tsx` or `not-found.tsx` exist (Medium)
- [ ] **Replace `useState`/`useEffect` data fetching** with TanStack Query hooks — provider is wired but not used pervasively (Low-Medium)
- [ ] **Capture PostHog events** from key endpoints (Low)
- [ ] **Add CSP security headers** (Low)
- [ ] **Add health check verifying DB connectivity** (Low)
- [ ] **Add OpenAPI/Swagger Bearer auth security scheme** (Low)
- [ ] **Move inline schemas** in `purchase_orders.py` and `inventory.py` to `schemas/` (Low)

### Testing
- [ ] **Backend tests on Windows** — 39 tests cannot run locally due to `pytest-asyncio` + `ProactorEventLoop` teardown issues. Needs Linux CI (GitHub Actions).
- [ ] **Frontend component tests** — Only 4 Vitest test files exist; add tests for all pages and components

### Performance
- [ ] Migrate rate limiter from in-memory to Redis for persistence across dynos
- [ ] Configure Redis multi-process adapter for Socket.IO (currently in-memory only)
- [ ] Optimize dashboard query time (<3s target)
- [ ] Optimize search response time (<500ms target)
- [ ] Optimize API response time (<300ms target)

### Future Features
- [ ] Mobile responsive improvements (bottom nav exists but needs refinement)
- [ ] Product image upload UI integration (backend supports R2, frontend not wired)
- [ ] Fast-moving/slow-moving product reports
- [ ] Dead stock analysis
- [ ] Payment reminders
- [ ] Scheduled backup automation

---

## 7. Important Decisions & Conventions

### Naming
- All API paths use kebab-case: `/api/v1/purchase-orders/`
- Database columns use snake_case: `cost_price`, `selling_price`
- Frontend files use kebab-case: `client-api.ts`
- Enum values stored as lowercase strings via `values_callable=lambda x: [e.value for e in x]`

### Backend Patterns
- All endpoints depend on `get_current_user` for auth
- Async SQLAlchemy sessions throughout
- Models use `Mapped[]` style (SQLAlchemy 2.0)
- Pydantic v2 `model_validate()` pattern
- `response_model` typed on every route
- `selectinload()` for eager loading in async contexts
- Routes registered in `app/api/v1/__init__.py` with explicit prefix+tags

### Frontend Patterns
- `"use client"` on all 22 pages (no server components in dashboard)
- `clientApi` from `@/lib/client-api` for all API calls (lazy JWT via getSession())
- Direct `useState` + `useEffect` for data fetching on every page
- TanStack Query provider wired but not used pervasively (infrastructure only)
- Zustand for cart state + active store (localStorage-persisted)
- Auth session via `useSession()` from `next-auth/react`
- Sidebar role-filtered via `useRole()` hook
- Role-based nav items: admin sees everything, shopkeeper sees ops, customer sees catalog + my-orders + settings

### Important Code Details
- **Bulk order customer resolution**: Matches `Customer.email` to `current_user.email` — requires customer user accounts to have matching emails
- **Credit check**: Only applies when `payment_method == "credit"`. Returns 402 with available credit if exceeded
- **Low-stock email**: Sent asynchronously via Resend; silently fails if `RESEND_API_KEY` not configured; deduplicates (no duplicate alert if unread exists)
- **Backup format**: JSON with `{version, created_at, data: {table_name: [rows]}}`
- **Socket.IO**: Mounted at `/ws` path, separate from FastAPI routes; in-memory adapter (needs Redis for multi-process)
- **Cache/TaskQueue/Storage services**: All have `is_available()` check and fall back gracefully when services aren't configured
- **Rate Limiter**: Integrated as FastAPI middleware; skips `/ws`, `/health`, `/docs`, `/redoc`, `/openapi.json`; falls back to in-memory dict (per-process) if Redis unavailable
- **Seed idempotent**: Runs `DELETE FROM` on all transactional tables + reseeds; also creates 5 customer-linked user accounts
- **Stock transfers**: Create source store adjustment + destination store addition via inventory_movements table; approve/reject/complete workflow
- **Full-text search**: `search_vector` TSVECTOR column on products with GIN index; auto-updated via BEFORE INSERT OR UPDATE trigger

### Package Versions (Pinned — DO NOT CHANGE)
| Package | Version | Reason |
|---------|---------|--------|
| bcrypt | 4.0.1 (NOT 5.x) | passlib 1.7.4 incompatible with bcrypt ≥5 |
| scikit-learn | 1.9.0 exact | `model.pkl` trained on 1.9.0 |
| asyncpg | 0.31.0 | Pre-built wheel for Python 3.14 |
| pandas | 3.0.3 | Pre-built wheel for Python 3.14 |

---

## 8. How to Run

```bash
# 1. Start PostgreSQL
docker run -d --name khatabox-pg -e POSTGRES_USER=khatabox -e POSTGRES_PASSWORD=khatabox123 -e POSTGRES_DB=khatabox -p 5432:5432 postgres:16-alpine

# 2. Backend setup
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1       # Windows
pip install --only-binary :all: -r requirements.txt

# 3. Create .env
# DATABASE_URL=postgresql+asyncpg://khatabox:khatabox123@localhost:5432/khatabox
# SECRET_KEY=any-random-string

# 4. Run migrations
alembic upgrade head

# 5. Seed data
python seed.py

# 6. Start backend (use port other than 8000)
uvicorn app.main:app --reload --port 8001

# 7. Frontend setup (new terminal)
cd ..
npm install
# Create .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8001
# AUTH_SECRET=khatabox-dev-secret-change-in-prod
# AUTH_URL=http://localhost:3000

# 8. Start frontend
npm run dev
```

### Credentials (seeded)
- **Admin:** admin@khatabox.com / Admin@123
- **Shopkeeper:** shop@khatabox.com / Shop@123
- **Customer:** tech.corp@client.com / customer123
- **Customer:** green.grocers@client.com / customer123
- **Customer:** fashion.hub@client.com / customer123
- **Customer:** medicare.plus@client.com / customer123
- **Customer:** stationery.world@client.com / customer123

---

## 9. Current Blockers

1. **pytest-asyncio on Windows** — 0/39 tests pass locally due to `ProactorEventLoop` teardown issues (`got Future <Future pending> attached to a different loop`). Full suite requires Linux CI (GitHub Actions).
2. **Phantom process on port 8000** — Unknown process holds port 8000. Dev must use ports 8001+.
3. **All Phase 7-9 services require cloud credentials** — Code written and gracefully degrades, but Redis/R2/Resend/Sentry/PostHog need active accounts and API keys.
4. **ML model on synthetic data** — RandomForest trained on synthetic sales data. Needs real historical sales data for production accuracy.
5. **No JWT refresh on frontend** — Access tokens expire in 30 min. Frontend has no interceptor to refresh using refresh_token. Users will be logged out after 30 min with no recovery.
6. **No error boundaries** — No `error.tsx` or `not-found.tsx` files exist anywhere in the frontend. Unhandled errors will show white screens.
7. **No loading states** — No `loading.tsx` files exist. All pages use `useState`/`useEffect` with no skeleton or spinner until data arrives.

---

## 10. Next Steps for Incoming Agent

### Phase A — Pre-Launch Fixes (code-side, no cloud accounts needed)
1. ~~Create `vercel.json`~~ ✅ Done
2. ~~Create `proxy.ts` (Next.js 16 middleware)~~ ✅ Already existed
3. ~~Fix Docker `CMD` to use `$PORT`~~ ✅ Done
4. ~~Create `.dockerignore`~~ ✅ Done
5. ~~Document `alembic.ini` env override~~ ✅ Done
6. ~~Create `railway.json`~~ ✅ Done

### Phase B — Deploy Infrastructure (needs cloud accounts)
1. **Deploy database** (Neon PostgreSQL) → run `alembic upgrade head` + `python seed.py`
2. **Deploy backend** (Railway) with all env vars from `.env.example`
3. **Deploy frontend** (Vercel) → `vercel.json` configured, set `AUTH_SECRET`/`AUTH_URL`/`NEXT_PUBLIC_API_URL`
4. **Configure Redis** (Upstash) → unlocks cache, multi-process Socket.IO, persistent rate limiter
5. **Configure Cloudflare R2** → product images + backup storage
6. **Configure Resend** → email notifications (low stock alerts)
7. **Configure Sentry + PostHog** → error monitoring + analytics

### Phase C — Code Improvements (post-launch)
1. **Add JWT refresh interceptor** on frontend (highest user-impact)
2. **Add error boundaries** (`error.tsx` + `not-found.tsx` for each route group)
3. **Add loading states** (`loading.tsx` with skeleton components)
4. **Connect forecasting trend chart** to real product trend API
5. **Migrate data fetching** from `useState`/`useEffect` to TanStack Query hooks
6. **Add CSP headers** and security hardening

### Phase D — Feature Additions
1. Fast-moving/slow-moving product reports
2. Dead stock analysis
3. Payment reminders
4. Scheduled backup automation
5. Product image upload UI (backend ready, frontend not wired)
6. Mobile responsive refinements

### Useful code pointers:
- `docs/PROJECT_STRUCTURE.md` — Complete directory tree with all file summaries
- `docs/HANDOFF.md` — This file (authoritative handoff context)
- `backend/app/api/v1/__init__.py` — All 19 route registrations
- `backend/app/config.py` — All 16 env vars
- `src/components/layout/sidebar.tsx` — Navigation (role-filtered)
- `src/lib/client-api.ts` — API call pattern
- `AGENTS.md` — Next.js 16 dev rules (read first!)
- `docs/DEPLOYMENT_CHECKLIST.md` — 10-phase deployment plan with rollback steps
- `docs/FINAL_AUDIT_REPORT.md` — Audit findings (79/100, detailed bug list)

---

## 11. Critical Gotchas

1. **PRD.md still says "Stock Wise AI"** — Replace with "KhataBox" when modifying
2. **TECHSTACK.md mentions Prisma ORM** — Actual backend uses SQLAlchemy, not Prisma
3. **Port 8000 broken** on dev machine — Use 8001+
4. **Next.js 16 has breaking changes** — `middleware.ts` → `proxy.ts`, `@base-ui/react` replaces Radix. Read `node_modules/next/dist/docs/` before frontend code.
5. **shadcn/ui uses @base-ui/react** — Not Radix UI. All 14 primitives use @base-ui/react packages.
6. **Enum values stored as lowercase** — `values_callable=lambda x: [e.value for e in x]` required on SQLAlchemy Column with Enum.
7. **bcrypt 4.0.1 pinned** — Never upgrade to 5.x (passlib 1.7.4 incompatible).
8. **scikit-learn 1.9.0 pinned** — Don't change version (model.pkl compatibility).
9. **Seed script is idempotent** — DELETES + recreates ALL data. Cannot run on production after real data exists without backup.
10. **`selectinload()` required** for async SQLAlchemy relationship loading (lazy loading not supported in async).
11. **Full-text search trigger** auto-populates `search_vector` — fires on BEFORE INSERT OR UPDATE on products.
12. **Low-stock deduplication** — Only creates alert if no unread alert for same product exists.
13. **Bulk order** resolves customer by `Customer.email == current_user.email` — customer user accounts MUST have matching emails to customer records.
14. **Customer seed passwords**: All customer users use "customer123".
15. **Socket.IO uses in-memory adapter** — needs Redis for multi-process production.
16. **All 22 frontend pages use "use client"** — No server components anywhere in the dashboard. Performance optimization opportunity.
17. **No loading.tsx or error.tsx** anywhere — All pages have no loading state and no error boundary.
18. **TanStack Query provider wired but unused** — `QueryClientProvider` wraps the app but no page uses TanStack Query hooks for data fetching. All use raw `useState` + `useEffect` + `clientApi`.
19. **JWT access tokens expire in 30 min** — No refresh logic on frontend. Users will be logged out with no recovery.
20. **Forecasting trend chart uses hardcoded mock data** — The trend line always shows the same static data regardless of selected product.
21. **39 backend tests cannot run on Windows** — ProactorEventLoop + pytest-asyncio incompatibility. Must use Linux (GitHub Actions).
22. **Rate limiter is per-process** — In-memory fallback means rate limit resets on restart. Not distributed across Railway replicas.
23. **Admin user management "All roles" filter** uses `value=""` (empty string) not `value="all"`. Backend ignores empty role param.
