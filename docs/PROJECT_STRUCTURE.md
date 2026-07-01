---
title: KhataBox Project Structure
description: Complete directory tree with descriptions for the full-stack B2B retail management platform.
---

# Project Structure

## Root

```
KhataBox/
├── AGENTS.md                        # AI agent context (Next.js 16 dev rules)
├── README.md                        # Project readme
├── LocalRun.md                      # Local development instructions
├── start-dev.bat                    # Windows launcher (docker, backend, frontend)
├── package.json                     # Node.js deps (Next.js 16, React 19, shadcn/ui, Zustand, Recharts)
├── package-lock.json
├── tsconfig.json                    # TypeScript config (@/* path alias)
├── next.config.ts                   # Next.js config
├── next-env.d.ts                    # Next.js TypeScript declarations
├── eslint.config.mjs                # ESLint flat config
├── postcss.config.mjs               # PostCSS with @tailwindcss/postcss
├── components.json                  # Shadcn/ui config
├── vitest.config.ts                 # Vitest test runner config
├── vercel.json                      # Vercel deployment config
├── docker-compose.yml               # PostgreSQL 16 + Redis 7
├── .gitignore
├── .env.local                       # Frontend dev env vars
│
├── node_modules/                    # Frontend dependencies
├── .next/                           # Next.js build output
│
├── src/                             # Frontend source (Next.js App Router)
├── backend/                         # Backend source (FastAPI)
├── docs/                            # Documentation
├── config/                          # .env.example files
├── assets/                          # Screenshots (empty)
├── logs/                            # Runtime logs
├── scripts/                         # Shell scripts
├── public/                          # Static assets (empty)
└── .git/
```

---

## Frontend (`src/`)

```
src/
├── providers.tsx                    # Client providers wrapper
│                                    # - SessionProvider (next-auth/react)
│                                    # - QueryClientProvider (@tanstack/react-query)
│
├── app/
│   ├── globals.css                  # Tailwind v4 CSS-first config, OKLCH theme, shadcn vars
│   ├── layout.tsx                   # Root layout (HTML, body, Inter font, Providers)
│   ├── page.tsx                     # Landing page "/"
│   │
│   ├── login/page.tsx               # Login page
│   │                                # - Role selection tabs (admin/shopkeeper/customer)
│   │                                # - Credentials form -> signIn("credentials")
│   │
│   ├── register/page.tsx            # Registration page
│   │                                # - Shopkeeper registration (store name, type, address, GST)
│   │                                # - Customer registration (name, email, phone)
│   │                                # - Indian state dropdown, store type selector
│   │
│   ├── catalog/page.tsx             # Public product catalog (browse + filter)
│   ├── cart/page.tsx                # Customer shopping cart
│   ├── customer/page.tsx            # Customer landing page
│   ├── my-orders/page.tsx           # Customer order history
│   │   └── [id]/page.tsx            # Individual order detail
│   ├── receipts/                    # Receipt pages
│   │   └── [id]/page.tsx            # Receipt view by ID
│   ├── scan/page.tsx                # QR code scanner page
│   │
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth.js catch-all API route handler
│   │
│   └── (dashboard)/                 # Route group (admin/shopkeeper only)
│       ├── layout.tsx               # Dashboard layout (Sidebar + TopNav + BottomNav + Toaster)
│       │                            # - Calls requireAuth(["admin", "shopkeeper"])
│       ├── dashboard/page.tsx       # Stats cards (products, inventory value, sales, pending, low stock)
│       │                            # - Recharts sales chart, top products table, recent orders
│       ├── catalog/page.tsx         # B2B customer catalog (product grid + cart sidebar)
│       ├── inventory/page.tsx       # Product CRUD table (search, filter by category/brand/price/stock)
│       ├── inventory/movements/page.tsx  # Stock movement history (filter by product/store/type)
│       ├── inventory/scan/page.tsx       # QR scan stock update interface
│       ├── orders/page.tsx          # Order management (list, status update dropdown)
│       ├── my-orders/page.tsx       # Shopkeeper's own order history view
│       ├── purchase-orders/page.tsx # Purchase order management (create, list, status)
│       ├── transfers/page.tsx       # Stock transfers between stores (create, approve, reject)
│       ├── billing/page.tsx         # Billing/invoice page
│       ├── customers/page.tsx       # B2B customer CRUD table
│       ├── suppliers/page.tsx       # Supplier CRUD table
│       ├── suppliers/price-analysis/page.tsx  # Supplier margin analysis (per-supplier breakdown)
│       ├── reports/page.tsx         # Reports (top customers, repeat purchases, CLV tabs)
│       ├── forecasting/page.tsx     # ML demand forecast (product selector + chart)
│       ├── notifications/page.tsx   # Alert center (low stock, expiry, payment reminders)
│       ├── qr-labels/page.tsx       # Batch QR label printing (select products + generate sheet)
│       ├── stores/page.tsx          # Multi-store management (CRUD)
│       ├── settings/page.tsx        # Profile, preferences, data export options
│       └── admin/users/page.tsx     # Admin user management (role, active toggle)
│
├── components/
│   ├── ui/                          # Shadcn/ui primitives (on @base-ui/react)
│   │   ├── button.tsx               # Button (default/outline/ghost/destructive, 8 sizes)
│   │   ├── input.tsx                # Text input
│   │   ├── card.tsx                 # Card container (Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription)
│   │   ├── dialog.tsx               # Modal dialog (overlay, content, header, footer, close, title, description)
│   │   ├── sheet.tsx                # Slide-in panel (side: top/right/bottom/left)
│   │   ├── select.tsx               # Dropdown select with scroll buttons
│   │   ├── dropdown-menu.tsx        # Full dropdown menu (trigger, content, item, checkbox, separator, label)
│   │   ├── tabs.tsx                 # Tabs with horizontal/vertical, default/line variants
│   │   ├── table.tsx                # Semantic HTML table (Table, Header, Body, Row, Head, Cell, Caption)
│   │   ├── badge.tsx                # Status badge/pill (default/secondary/destructive/outline variants)
│   │   ├── avatar.tsx               # User avatar (with fallback initials + AvatarGroup)
│   │   ├── separator.tsx            # Horizontal/vertical divider
│   │   ├── scroll-area.tsx          # Custom scroll area wrapper
│   │   └── skeleton.tsx             # Loading skeleton placeholder
│   │
│   ├── layout/
│   │   ├── sidebar.tsx              # Desktop sidebar navigation
│   │   │                            # - Role-filtered nav items (admin sees admin panel link)
│   │   │                            # - Store selector dropdown
│   │   │                            # - Logout button
│   │   ├── top-nav.tsx              # Sticky top bar
│   │   │                            # - Search input, notification bell with count
│   │   │                            # - User dropdown menu (profile, settings, logout)
│   │   └── bottom-nav.tsx           # Mobile bottom navigation
│   │                                # - 5 key items + floating action button (FAB)
│   │
│   ├── auth/
│   │   └── role-guard.tsx           # RoleGuard component + useRole hook
│   │                                # - useRole: reads session, returns user role
│   │                                # - RoleGuard: conditionally renders children based on allowed roles
│   │
│   ├── customers/
│   │   └── customer-cart.tsx        # Customer cart sidebar component (for catalog page)
│   │
│   └── products/
│       ├── product-form-dialog.tsx   # Create/edit product dialog form
│       └── product-qr-dialog.tsx     # Product QR code dialog (display + download)
│
├── lib/
│   ├── auth.ts                      # NextAuth v5 config
│   │                                # - Credentials provider
│   │                                # - authorize: POST to /api/v1/auth/login
│   │                                # - jwt callback: stores id, role, tokens
│   │                                # - session callback: exposes user + access_token
│   ├── auth-client.ts               # Client-side SessionProvider re-export
│   ├── auth-guard.ts                # Server-side requireAuth() + rolePermissions
│   │                                # - requireAuth: auth() then redirect if no session
│   ├── client-api.ts                # Client HTTP client (get/post/put/patch/del + JWT Bearer)
│   │                                # - Reads access_token from useSession()
│   ├── api.ts                       # Server-side HTTP client (for Server Components)
│   │                                # - Uses auth() to get token
│   │                                # - Methods: apiGet, apiPost, apiPut, apiDelete
│   ├── store-context.ts             # Zustand store for active store selection (persisted)
│   └── utils.ts                     # cn() utility (clsx + tailwind-merge)
│
├── store/
│   ├── cart.ts                      # Zustand cart store
│   │                                # - items[], discount, addItem, removeItem, updateQuantity, clearCart
│   └── customer-cart.ts             # Zustand customer cart store (customer-facing cart)
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

**Statistics:** ~27 pages, 2 layouts, 1 providers, ~19 components, 7 lib files, 2 stores, 7 type files, 5 test files.

---

## Backend (`backend/`)

```
backend/
├── requirements.txt                 # 27 Python packages (FastAPI, SQLAlchemy, scikit-learn, etc.)
├── Dockerfile                       # Python 3.12-slim, CMD uvicorn on $PORT
├── .dockerignore
├── .env                             # Dev env vars
├── .env.example                     # Production env template
├── pytest.ini                       # pytest asyncio_mode=auto
├── railway.json                     # Railway deployment config
├── alembic.ini                      # Alembic config
│
├── seed_india.py                    # Idempotent seed script (1116 lines)
│                                    # - Creates admin, 5 shopkeepers, 10+ customers
│                                    # - 7 stores with Indian business types
│                                    # - 100+ products across categories
│                                    # - 20+ suppliers
│                                    # - 200+ orders with items
│                                    # - Purchase orders, inventory movements, notifications
│                                    # - Clears existing data on re-run (except admin)
│
├── alembic/
│   ├── env.py                       # Async Alembic env with env var override
│   └── versions/
│       ├── 0001_initial_schema.py        # 11 base tables + 5 enums
│       ├── 0002_fulltext_search.py       # search_vector TSVECTOR + GIN index on products
│       ├── 0003_expiry_batch_tracking.py # batch_number, mfg_date, expiry_date on products
│       ├── 0004_multi_store.py           # stores table + product.store_id FK
│       ├── 0005_product_image_url.py     # product.image_url column
│       ├── 0006_performance_indexes.py   # 5 composite indexes
│       ├── 0007_stock_transfers.py       # stock_transfers table + inventory_movements.store_id
│       ├── 0008_add_transfer_enum_values.py  # transfer_in/transfer_out MovementType enum values
│       ├── 0009_product_uuid.py          # product_uuid UUID column for permanent QR identity
│       ├── 0010_inventory_reservation_support.py  # reserved_quantity on products + reserve/consume movement types
│       ├── 0011_receipt_system.py        # receipts + receipt_items tables
│       └── 0012_store_business_fields.py # store_type, city, state, pin_code, GST, revenue, description
│
├── app/
│   ├── main.py                      # FastAPI app entry point
│   │                                # - CORS middleware (from CORS_ORIGINS env)
│   │                                # - Rate limiter middleware (100 req/min)
│   │                                # - Performance middleware (X-Response-Time header)
│   │                                # - Sentry SDK init (conditional)
│   │                                # - PostHog SDK init (conditional)
│   │                                # - Socket.IO mount at /ws
│   │                                # - GET /health endpoint
│   │                                # - Lifespan: dispose engine + close Redis on shutdown
│   │
│   ├── config.py                    # Pydantic BaseSettings (16 env vars)
│   │                                # DATABASE_URL, SECRET_KEY, ALGORITHM,
│   │                                # ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS,
│   │                                # REDIS_URL, RESEND_API_KEY, POSTHOG_API_KEY, POSTHOG_HOST,
│   │                                # SENTRY_DSN, CORS_ORIGINS,
│   │                                # R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
│   │                                # R2_BUCKET_NAME, R2_PUBLIC_URL
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── database.py              # Async engine (create_async_engine), async_sessionmaker,
│   │   │                            # DeclarativeBase, get_db() dependency
│   │   ├── dependencies.py          # HTTPBearer security, get_current_user() (decode JWT + load user),
│   │   │                            # require_role(*roles) (403 if role mismatch)
│   │   └── security.py              # hash_password() (bcrypt), verify_password(),
│   │                                # create_access_token(), create_refresh_token(), decode_token()
│   │
│   ├── models/                      # 18 SQLAlchemy model tables (16 model files)
│   │   ├── __init__.py              # Re-exports all models
│   │   ├── user.py                  # User (id, email, password_hash, name, role enum, store_name, phone, is_active, timestamps)
│   │   ├── store.py                 # Store (id, name, store_type, address, city, state, pin_code, gst_number, monthly_revenue, business_description, owner_id, is_active)
│   │   ├── product.py               # Product (id, product_uuid, name, SKU, category, brand, description, cost_price, selling_price, stock_quantity, reserved_quantity, reorder_threshold, batch_number, mfg_date, expiry_date, owner_id, store_id, image_url, is_active, search_vector TSVECTOR)
│   │   ├── order.py                 # Order (status enum, payment_method enum, items relationship) + OrderItem
│   │   ├── invoice.py               # Invoice (linked to orders, PDF URL)
│   │   ├── customer.py              # Customer (credit_limit, credit_used, GST, price_tier, carts relationship)
│   │   ├── supplier.py              # Supplier (name, contact, email, phone, address, owner_id)
│   │   ├── customer_cart.py         # CustomerCart (status enum, items relationship) + CustomerCartItem
│   │   ├── purchase_order.py        # PurchaseOrder (status enum, items relationship) + PurchaseOrderItem
│   │   ├── inventory.py             # InventoryMovement (movement_type enum, store FK) + StockTransfer (status enum)
│   │   ├── receipt.py               # Receipt (linked to orders, store_id) + ReceiptItem
│   │   ├── notification.py          # Notification (type enum, title, message, is_read, reference_id)
│   │   └── audit_log.py             # AuditLog (user_id, action, entity_type, entity_id, details)
│   │
│   ├── schemas/                     # 11 Pydantic schema files
│   │   ├── __init__.py
│   │   ├── user.py                  # UserCreate, UserLogin, UserResponse, TokenResponse
│   │   ├── product.py               # ProductCreate, ProductUpdate, ProductResponse
│   │   ├── order.py                 # OrderItemCreate, OrderCreate, BulkOrderCreate, OrderResponse, OrderStatusUpdate
│   │   ├── customer.py              # CustomerCreate, CustomerUpdate, CustomerResponse
│   │   ├── customer_cart.py         # CustomerCartItemCreate, CustomerCartItemResponse, CustomerCartCreate, CustomerCartResponse, CustomerCartAddResponse, CustomerCartCheckout
│   │   ├── supplier.py              # SupplierCreate, SupplierUpdate, SupplierResponse
│   │   ├── store.py                 # StoreCreate, StoreUpdate, StoreResponse
│   │   ├── notification.py          # NotificationResponse
│   │   ├── stock_transfer.py        # StockTransferCreate, StockTransferApprove, StockTransferResponse
│   │   └── price_analysis.py        # PriceAnalysisItem, SupplierPriceAnalysisResponse
│   │
│   ├── api/v1/
│   │   ├── __init__.py              # Router aggregator (22 sub-routers)
│   │   ├── auth.py                  # POST /register, POST /login, GET /me, GET /users, PATCH /users/{id}/role, PATCH /users/{id}/toggle-active
│   │   ├── dashboard.py             # GET /stats (parallel queries, Redis cache, optional store_id filter)
│   │   ├── catalog.py               # GET /products (customer-facing catalog), GET /by-uuid/{uuid}
│   │   ├── products.py              # GET /, POST /, GET /{id}, PUT /{id}, DELETE /{id}, POST /{id}/image, GET /by-uuid/{uuid}
│   │   ├── orders.py                # GET /, POST /, POST /bulk, GET /my-orders, GET /{id}, PATCH /{id}/status
│   │   ├── suppliers.py             # GET /, POST /, PUT /{id}, DELETE /{id}, GET /price-analysis
│   │   ├── customers.py             # GET /, POST /, PUT /{id}, DELETE /{id}
│   │   ├── forecasting.py           # GET /demand/{product_id} (ML + heuristic fallback)
│   │   ├── inventory.py             # GET /movements, GET /movements/{product_id}, POST /stock-update
│   │   ├── invoices.py              # POST /generate/{order_id} (PDF via ReportLab)
│   │   ├── receipts.py              # GET /order/{order_id}, GET /history, GET /my, GET /{id}/pdf
│   │   ├── purchase_orders.py       # GET /, POST /, PATCH /{id}/status
│   │   ├── qrcodes.py               # GET /product/{id}, GET /batch, GET /permanent/{id}, GET /permanent/{id}/data, POST /permanent/{id}/regenerate
│   │   ├── expiry.py                # GET /upcoming (30/60/90 day buckets)
│   │   ├── audit.py                 # GET /logs (paginated, entity_type filter, admin only)
│   │   ├── notifications.py         # GET /, PATCH /mark-all-read, PATCH /{id}/read
│   │   ├── reports.py               # GET /customers/top, GET /customers/repeat-purchases, GET /customers/clv
│   │   ├── stores.py                # GET /, POST /, PUT /{id}, DELETE /{id}
│   │   ├── transfers.py             # GET /, POST /, GET /{id}, PATCH /{id}/status
│   │   ├── customer_cart.py         # GET /, GET /{id}, POST /, POST /items, PUT /{id}/items/{item_id}, DELETE /{id}/items/{item_id}, POST /checkout, POST /{id}/checkout, DELETE /{id}
│   │   └── data.py                  # GET /export/products, GET /export/orders, POST /import/products, GET /backup/export, POST /backup/import, POST /backup/export-r2, POST /backup/restore-r2
│   │
│   ├── services/                    # 10 service modules
│   │   ├── order_service.py         # list_orders, create_order, create_bulk_order, get_my_orders, get_order, update_order_status (with reservation logic + receipt generation)
│   │   ├── cart_service.py          # list_carts, create_cart, get_cart, add_item, update_item_quantity, delete_item, checkout, delete_cart
│   │   ├── inventory_service.py     # list_movements, get_product_movements, update_stock (with Socket.IO emit)
│   │   ├── cache.py                 # Redis get/set/delete/invalidate_pattern, is_available()
│   │   ├── backup.py                # export_backup (JSON), import_backup, export_to_storage (R2), restore_from_storage (R2)
│   │   ├── notifications.py         # check_low_stock (creates DB notification + email alert)
│   │   ├── email.py                 # send_email via Resend API
│   │   ├── storage.py               # R2 upload/download/delete, is_available()
│   │   ├── rate_limiter.py          # 100 req/min (Redis + in-memory fallback)
│   │   ├── socketio_manager.py      # Socket.IO server, connection handlers, room subscribe, emit functions
│   │   ├── task_queue.py            # Redis FIFO task queue (enqueue/dequeue/len)
│   │   └── logger.py                # Logging configuration
│   │
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── predict.py               # predict_demand(), is_model_ready() (loads joblib model)
│   │   ├── train.py                 # Generate synthetic data -> RandomForestRegressor -> save model.pkl
│   │   └── model.pkl                # Pre-trained RandomForestRegressor bundle
│   │
│   └── __init__.py
│
└── tests/
    ├── conftest.py                  # Session-scoped fixtures (subprocess uvicorn on :18999)
    ├── test_api.py                  # 39 async tests across 20 endpoint groups
    └── test_inventory_sync.py       # Inventory reservation sync tests
```

**Statistics:** 22 API route files, 16 model files (18 tables), 11 schema files, 12 service files, 12 migrations, 1 ML pipeline, 3 test files.

---

## Service Architecture Diagram

```
┌───────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Frontend    │     │     Backend      │     │   PostgreSQL   │
│  Next.js 16   │────▶│   FastAPI 0.115  │────▶│    16-alpine   │
│  Port 3000    │     │   Port 8002      │     │   Port 5432    │
│               │     │                  │     │                │
│  NextAuth v5  │     │  22 API routers  │     │  18 tables     │
│  TanStack Q.  │     │  10 services     │     │  5+ enums      │
│  Zustand      │     │  ML pipeline     │     │  FTS + GIN idx │
│  shadcn/ui    │     │  Socket.IO /ws   │     │                │
└───────────────┘     └──────────────────┘     └────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │    External (opt)  │
                    ├────────────────────┤
                    │ Redis 7 (cache/q)  │
                    │ Resend (email)     │
                    │ Cloudflare R2      │
                    │ Sentry (monitor)   │
                    │ PostHog (analytics)│
                    └────────────────────┘
```

## Data Flow

```
User Action -> NextAuth login -> JWT in session
    |
    v
client-api.ts (GET/POST/PUT/PATCH/DELETE) -> fetch() with Bearer token
    |
    v
FastAPI get_current_user() -> decode JWT -> load User from DB
    |
    v
require_role() -> check user.role in allowed roles
    |
    v
Service layer -> SQLAlchemy async queries -> PostgreSQL
    |
    v
Pydantic validation -> JSON response -> React state update
```

## Key Design Patterns

| Pattern | Implementation |
|---------|---------------|
| Auth guard | `RoleGuard` component (client) + `requireAuth()` (server) + `require_role()` (API) |
| RBAC | Role-based nav filtering in sidebar, role-based API access via `require_role()` |
| Graceful degradation | All external services have `is_available()` checks; no external dependency is required |
| Data fetching | `useState`/`useEffect` on every page (TanStack Query provider installed but not actively used) |
| State management | Zustand for cart + active store; React Query for caching infrastructure |
| Async DB | SQLAlchemy 2.0 async with `selectinload()` for relationship loading |
| Performance | Dashboard stats parallelized with `asyncio.gather()`; full-text search on products |
| Resilience | Seed script is idempotent; migrations chain 0001->0012; all enums store lowercase |
| Reservation | Order confirm reserves stock, completion consumes, cancellation releases |
