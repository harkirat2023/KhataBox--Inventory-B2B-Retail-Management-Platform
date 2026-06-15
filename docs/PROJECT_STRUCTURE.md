# KhataBox — Project Structure

> **Generated:** 2026-06-09
> **Description:** Complete directory tree with file summaries for the full-stack inventory & B2B retail management platform.

---

## Root

```
KhataBox/
├── AGENTS.md                        # Next.js 16 dev rules (read before frontend code)
├── CLAUDE.md                        # AI agent context file
├── README.md                        # Project readme
├── DESIGN.pdf                       # Design document (PDF)
├── PRD.pdf                          # Product Requirements Document (PDF)
├── TECHSTACK.pdf                    # Technology stack overview (PDF)
├── Phases_of_Project.pdf            # Phased project plan (PDF)
├── package.json                     # Node.js deps: Next.js 16, React 19, shadcn/ui, TanStack Query, Zustand, Recharts
├── package-lock.json
├── tsconfig.json                    # TypeScript config (bundler module resolution, @/* alias)
├── next.config.ts                   # Next.js config (empty, defaults)
├── next-env.d.ts                    # Next.js TypeScript declarations
├── eslint.config.mjs                # ESLint flat config (next/core-web-vitals + next/typescript)
├── postcss.config.mjs               # PostCSS with @tailwindcss/postcss (Tailwind v4)
├── components.json                  # shadcn/ui config (base-nova style, @base-ui/react)
├── .gitignore
├── .env.example                     # Frontend env template (NEXT_PUBLIC_API_URL, AUTH_SECRET, AUTH_URL)
├── .env.local                       # Frontend env (dev)
├── vercel.json                      # Vercel deployment config (new)
│
├── node_modules/                    # Frontend dependencies
├── .next/                           # Next.js build output
│
├── src/                             # Frontend source (Next.js App Router)
├── backend/                         # Backend source (FastAPI)
├── docs/                            # Documentation
└── public/                          # Static assets
```

---

## Frontend (`src/`)

```
src/
├── proxy.ts                         # Auth route guard (Next.js 16 proxy.ts)
│                                    # - Redirects unauthenticated → /login
│                                    # - Redirects logged-in → /dashboard from /login or /register
│                                    # - Public paths: /login, /register, /api/auth
│
├── providers.tsx                    # Client providers wrapper
│                                    # - SessionProvider (next-auth/react)
│                                    # - QueryClientProvider (@tanstack/react-query)
│
├── app/
│   ├── globals.css                  # Tailwind v4 CSS-first config, OKLCH theme, shadcn/css variables
│   ├── layout.tsx                   # Root layout (HTML, body, Inter font, <Providers>)
│   ├── page.tsx                     # Landing page "/"
│   ├── login/page.tsx               # Login page (credentials form)
│   ├── register/page.tsx            # Registration page (shopkeeper sign-up)
│   │
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth.js catch-all API handler
│   │
│   └── (dashboard)/
│       ├── layout.tsx               # Dashboard layout (Sidebar + TopNav + BottomNav + Toaster)
│       ├── dashboard/page.tsx       # Stats cards, sales chart, top products, recent orders
│       ├── catalog/page.tsx         # B2B customer catalog (product grid + cart sidebar)
│       ├── inventory/page.tsx       # Product CRUD table (search, filter, edit, delete)
│       ├── inventory/movements/page.tsx  # Stock movement history
│       ├── orders/page.tsx          # Order management (list, status update)
│       ├── my-orders/page.tsx       # Customer order history
│       ├── purchase-orders/page.tsx # Purchase order management
│       ├── transfers/page.tsx       # Stock transfers between stores
│       ├── billing/page.tsx         # Billing page
│       ├── customers/page.tsx       # B2B customer CRUD
│       ├── suppliers/page.tsx       # Supplier CRUD
│       ├── suppliers/price-analysis/page.tsx  # Supplier margin analysis
│       ├── reports/page.tsx         # Sales reports + Customer reports tabs (top, repeat, CLV)
│       ├── forecasting/page.tsx     # AI demand forecast (ML model predictions)
│       ├── notifications/page.tsx   # Alert center (low stock, expiry, etc.)
│       ├── qr-labels/page.tsx       # Batch QR label printing (select products + print)
│       ├── stores/page.tsx          # Multi-store management
│       ├── settings/page.tsx        # Profile, preferences, data export
│       └── admin/users/page.tsx     # Admin user management (role, active toggle)
│
├── components/
│   ├── ui/                          # shadcn/ui primitives (on @base-ui/react)
│   │   ├── button.tsx               # Button (variants: default/outline/ghost/destructive, 8 sizes)
│   │   ├── input.tsx                # Text input
│   │   ├── card.tsx                 # Card container (Card, CardHeader, CardContent, etc.)
│   │   ├── dialog.tsx               # Modal dialog with overlay + animation
│   │   ├── sheet.tsx                # Slide-in panel (side: top/right/bottom/left)
│   │   ├── select.tsx               # Dropdown select with scroll buttons
│   │   ├── dropdown-menu.tsx        # Full dropdown menu with submenus
│   │   ├── tabs.tsx                 # Tabs (horizontal/vertical, default/line variants)
│   │   ├── table.tsx                # Semantic HTML table
│   │   ├── badge.tsx                # Status badge/pill
│   │   ├── avatar.tsx               # User avatar with fallback + group
│   │   ├── separator.tsx            # Horizontal/vertical divider
│   │   ├── scroll-area.tsx          # Custom scroll area
│   │   └── skeleton.tsx             # Loading skeleton placeholder
│   │
│   ├── layout/
│   │   ├── sidebar.tsx              # Desktop sidebar (role-filtered nav items, store selector)
│   │   ├── top-nav.tsx              # Sticky top bar (search, notifications, user menu)
│   │   └── bottom-nav.tsx           # Mobile bottom nav (5 key items + FAB)
│   │
│   ├── auth/
│   │   └── role-guard.tsx           # RoleGuard component + useRole hook
│   │
│   └── products/
│       └── product-form-dialog.tsx  # Create/edit product dialog form
│
├── lib/
│   ├── auth.ts                      # NextAuth v5 config (Credentials, JWT, session callbacks)
│   ├── auth-client.ts               # Client-side SessionProvider re-export
│   ├── auth-guard.ts                # Server-side requireAuth() + rolePermissions
│   ├── client-api.ts                # Client HTTP client (get/post/put/patch/delete + JWT Bearer)
│   ├── api.ts                       # Server-side HTTP client (for server components)
│   ├── store-context.ts             # Zustand store for active store selection (persisted)
│   └── utils.ts                     # cn() utility (clsx + tailwind-merge)
│
├── store/
│   └── cart.ts                      # Zustand cart store (items, discount, add/remove/update/clear)
│
├── types/
│   ├── product.ts                   # Product, ProductFormData interfaces
│   ├── store.ts                     # Store, StoreFormData, StockTransfer interfaces
│   ├── customer.ts                  # Customer, CustomerFormData interfaces
│   ├── supplier.ts                  # Supplier, SupplierFormData interfaces
│   ├── order.ts                     # Order, OrderItem, OrderStatus interfaces
│   ├── price-analysis.ts            # PriceAnalysisItem, SupplierPriceAnalysis interfaces
│   └── next-auth.d.ts              # NextAuth module augmentation (role, access_token)
│
├── test/
│   ├── setup.ts                     # Vitest setup
│   ├── utils.test.ts                # cn() utility tests
│   ├── card.test.tsx                # Card component tests
│   ├── client-api.test.ts           # HTTP client tests
│   └── store-context.test.ts        # Zustand store tests
│
└── hooks/                           # Empty directory (reserved for custom hooks)
```

**Statistics:** 22 pages, 2 layouts, 1 proxy, 1 providers, 19 components, 7 lib files, 1 store, 7 type files, 4 test files.

---

## Backend (`backend/`)

```
backend/
├── requirements.txt                 # 27 Python packages (FastAPI, SQLAlchemy, scikit-learn, etc.)
├── Dockerfile                       # Python 3.12-slim, CMD uses $PORT env var
├── .dockerignore                    # Excludes venv, __pycache__, .env, .git, etc.
├── .env                             # Dev env vars (DB, JWT, CORS; Sentry/Resend empty)
├── .env.example                     # Production env template (all 16 vars documented)
├── pytest.ini                       # pytest asyncio_mode=auto
├── seed.py                          # Idempotent seed script (2 users, 3 stores, 50 products, etc.)
├── alembic.ini                      # Alembic config (sqlalchemy.url localhost default)
├── railway.json                     # Railway deployment config (new)
│
├── alembic/
│   ├── env.py                       # Async Alembic env with env var override
│   └── versions/
│       ├── 0001_initial_schema.py        # 11 tables + 5 enums
│       ├── 0002_fulltext_search.py       # search_vector TSVECTOR + GIN index
│       ├── 0003_expiry_batch_tracking.py # batch_number, mfg_date, expiry_date
│       ├── 0004_multi_store.py           # stores table + product.store_id FK
│       ├── 0005_product_image_url.py     # product.image_url column
│       ├── 0006_performance_indexes.py   # 5 composite indexes
│       ├── 0007_stock_transfers.py       # stock_transfers table + inventory_movements.store_id
│       └── 0008_add_transfer_enum_values.py  # transfer_in/transfer_out to MovementType enum
│
├── app/
│   ├── main.py                      # FastAPI app entry point
│   │                                # - CORS middleware
│   │                                # - Rate limiter middleware (100 req/min)
│   │                                # - Performance middleware (X-Response-Time header)
│   │                                # - Sentry SDK init (conditional)
│   │                                # - PostHog SDK init (conditional)
│   │                                # - Socket.IO mount at /ws
│   │                                # - GET /health endpoint
│   │
│   ├── config.py                    # Pydantic BaseSettings (16 env vars)
│   │                                # DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
│   │                                # REFRESH_TOKEN_EXPIRE_DAYS, REDIS_URL, RESEND_API_KEY,
│   │                                # POSTHOG_API_KEY, POSTHOG_HOST, SENTRY_DSN, CORS_ORIGINS,
│   │                                # R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
│   │                                # R2_BUCKET_NAME, R2_PUBLIC_URL
│   │
│   ├── core/
│   │   ├── database.py              # Async engine, sessionmaker, Base, get_db() dependency
│   │   ├── dependencies.py          # HTTPBearer, get_current_user(), require_role()
│   │   └── security.py              # bcrypt hash/verify, JWT create/decode
│   │
│   ├── models/                      # 12 SQLAlchemy models
│   │   ├── __init__.py              # Re-exports all models
│   │   ├── user.py                  # User (email, password, role, store_name, active)
│   │   ├── product.py               # Product (name, SKU, category, brand, prices, stock, batch, expiry, search_vector)
│   │   ├── store.py                 # Store (name, address, active)
│   │   ├── order.py                 # Order, OrderItem (status, payment method, GST, discount)
│   │   ├── customer.py              # Customer (credit_limit, credit_used, GST, price_tier)
│   │   ├── supplier.py              # Supplier (contact, phone)
│   │   ├── purchase_order.py        # PurchaseOrder, PurchaseOrderItem
│   │   ├── inventory.py             # InventoryMovement, StockTransfer
│   │   ├── invoice.py               # Invoice (linked to orders)
│   │   ├── notification.py          # Notification (type, title, message, read)
│   │   └── audit_log.py            # AuditLog (entity, action, details)
│   │
│   ├── schemas/                     # 9 Pydantic schema files
│   │   ├── __init__.py
│   │   ├── user.py                  # UserCreate, UserLogin, UserResponse, TokenResponse
│   │   ├── product.py               # ProductCreate, ProductUpdate, ProductResponse
│   │   ├── order.py                 # OrderItemCreate, OrderCreate, BulkOrderCreate, OrderResponse
│   │   ├── customer.py              # CustomerCreate, CustomerUpdate, CustomerResponse
│   │   ├── supplier.py              # SupplierCreate, SupplierUpdate, SupplierResponse
│   │   ├── store.py                 # StoreCreate, StoreUpdate, StoreResponse
│   │   ├── notification.py          # NotificationResponse
│   │   ├── stock_transfer.py        # StockTransferCreate, StockTransferApprove, StockTransferResponse
│   │   └── price_analysis.py        # PriceAnalysisItem, SupplierPriceAnalysisResponse
│   │
│   ├── api/v1/
│   │   ├── __init__.py              # Router aggregator (19 sub-routers)
│   │   ├── auth.py                  # POST register/login, GET me/users, PATCH role/toggle-active
│   │   ├── dashboard.py             # GET stats (parallel queries, Redis cache)
│   │   ├── catalog.py               # GET products (customer-facing catalog)
│   │   ├── products.py              # CRUD + image upload + full-text search
│   │   ├── orders.py                # CRUD + bulk order + my-orders + status update
│   │   ├── suppliers.py             # CRUD + price-analysis
│   │   ├── customers.py             # CRUD
│   │   ├── stores.py                # CRUD
│   │   ├── forecasting.py           # GET demand/{product_id} (ML + fallback)
│   │   ├── inventory.py             # GET movements (list + by product)
│   │   ├── invoices.py              # POST generate/{order_id} (PDF)
│   │   ├── purchase_orders.py       # CRUD + status update
│   │   ├── qrcodes.py               # GET product/{id} + batch labels (PNG)
│   │   ├── expiry.py                # GET upcoming (30/60/90 day buckets)
│   │   ├── audit.py                 # GET logs (paginated)
│   │   ├── notifications.py         # GET list + PATCH mark-read
│   │   ├── reports.py               # GET customers/top, repeat-purchases, clv
│   │   ├── transfers.py             # CRUD + status approve/reject/complete
│   │   └── data.py                  # Export XLSX, import CSV/XLSX, backup/restore JSON + R2
│   │
│   ├── services/                    # 8 service modules (all degrade gracefully)
│   │   ├── backup.py                # DB backup/restore (JSON + R2)
│   │   ├── cache.py                 # Redis caching (get/set/delete/invalidate_pattern)
│   │   ├── email.py                 # Resend transactional email
│   │   ├── notifications.py         # Low-stock detection + notification + email alert
│   │   ├── rate_limiter.py          # 100 req/min (Redis + in-memory fallback)
│   │   ├── socketio_manager.py      # Socket.IO server (connect/disconnect/subscribe rooms)
│   │   ├── storage.py               # Cloudflare R2 file upload/download/delete
│   │   └── task_queue.py            # Redis FIFO task queue
│   │
│   ├── ml/
│   │   ├── predict.py               # predict_demand() + is_model_ready()
│   │   ├── train.py                 # Synthetic data → RandomForest model training
│   │   └── model.pkl                # Pre-trained RandomForestRegressor bundle
│   │
│   └── __init__.py
│
└── tests/
    ├── conftest.py                  # Session-scoped fixtures (subprocess uvicorn on :18999)
    └── test_api.py                  # 39 async tests across 20 endpoint groups
```

**Statistics:** 19 API route files, 12 models, 9 schema files, 8 services, 8 migrations, 1 ML pipeline, 39 tests.

---

## Service Architecture

```
┌───────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Frontend    │     │     Backend      │     │   PostgreSQL   │
│  Next.js 16   │────▶│   FastAPI 0.115  │────▶│    16-alpine   │
│  Port 3000    │     │   Port 8001+     │     │   Port 5432    │
│               │     │                  │     │                │
│  Auth.js v5   │     │  19 API routers  │     │  12 tables     │
│  TanStack Q.  │     │  8 services      │     │  5 enums       │
│  Zustand      │     │  ML pipeline     │     │  FTS indexes   │
│  shadcn/ui    │     │  Socket.IO       │     │                │
└───────────────┘     └──────────────────┘     └────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │    External (opt)  │
                    ├────────────────────┤
                    │ Redis (cache/queue)│
                    │ Resend (email)     │
                    │ Cloudflare R2      │
                    │ Sentry (monitor)   │
                    │ PostHog (analytics)│
                    └────────────────────┘
```

---

## Data Flow

```
User Action → NextAuth login → JWT in session
    ↓
client-api.ts (GET/POST/PUT/DELETE) → fetch() with Bearer token
    ↓
FastAPI get_current_user() → decode JWT → load User from DB
    ↓
Service layer → SQLAlchemy async queries → PostgreSQL
    ↓
Pydantic validation → JSON response → React state update
```

---

## Key Design Patterns

| Pattern | Implementation |
|---------|---------------|
| Auth guard | `RoleGuard` component (client) + `proxy.ts` (server) + `require_role()` (API) |
| RBAC | Role-based nav filtering in sidebar, role-based API access via `require_role()` |
| Graceful degradation | All Phase 7-9 services have `is_available()` checks, no external dependency is required |
| Graceful degradation | Rate limiter falls back to in-memory; cache falls back to no-cache; storage falls back to placeholder URLs |
| Data fetching | `useState`/`useEffect` on every page (no TanStack Query usage despite provider being installed) |
| State management | Zustand for cart + active store; React Query for caching infrastructure |
| Async DB | SQLAlchemy 2.0 async with `selectinload()` for relationship loading |
| Concrete table inheritance | All models extend `Base` with `__tablename__` explicitly |
| Performance | Dashboard stats parallelized with `asyncio.gather()`; full-text search on products |
| Resilience | Seed script is idempotent; migrations chain 0001→0008; all enums store lowercase |

---

## Role-Permissions Matrix

| Feature | Admin | Shopkeeper | Customer |
|---------|-------|------------|----------|
| Dashboard | ✅ | ✅ | ❌ (no /dashboard route for customer) |
| Products CRUD | ✅ | ✅ | ❌ |
| Catalog (browse) | ✅ | ✅ | ✅ |
| Orders (create/manage) | ✅ | ✅ | ❌ |
| My Orders | ✅ | ✅ | ✅ (email-matched) |
| Bulk Orders | ✅ | ✅ | ✅ (credit-checked) |
| Suppliers | ✅ | ✅ | ❌ |
| Customers CRUD | ✅ | ✅ | ❌ |
| Purchase Orders | ✅ | ✅ | ❌ |
| Stock Transfers | ✅ | ✅ | ❌ |
| Forecasting | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ❌ |
| Admin: User Mgmt | ✅ | ❌ | ❌ |
| Stores CRUD | ✅ | ✅ | ❌ |
| Data Export/Import | ✅ | ✅ | ❌ |
| QR Labels | ✅ | ✅ | ❌ |
| Settings | ✅ | ✅ | ✅ |
