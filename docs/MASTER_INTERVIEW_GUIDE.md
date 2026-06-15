# KhataBox — Master Interview Guide

> A comprehensive technical deep-dive into the architecture, design decisions, and engineering tradeoffs of a full-stack AI-powered Inventory & B2B Retail Management Platform.
>
> **Use this document to prepare for software engineering interviews** — it covers system design, architecture decisions, backend patterns, frontend architecture, database design, ML pipeline, infrastructure, and security.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Problem](#2-business-problem)
3. [Architecture](#3-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Design](#6-database-design)
7. [Authentication Flow](#7-authentication-flow)
8. [Authorization Flow](#8-authorization-flow)
9. [API Design](#9-api-design)
10. [Forecasting Pipeline](#10-forecasting-pipeline)
11. [Redis Architecture](#11-redis-architecture)
12. [Socket.IO Architecture](#12-socketio-architecture)
13. [Cloudflare R2 Architecture](#13-cloudflare-r2-architecture)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Security Measures](#15-security-measures)
16. [Scaling Strategy](#16-scaling-strategy)
17. [Design Decisions](#17-design-decisions)
18. [Tradeoffs](#18-tradeoffs)

---

## 1. Project Overview

**KhataBox** (formerly Stock Wise AI) is a full-stack inventory management and B2B retail platform for small and medium retailers. It replaces spreadsheets and disconnected tools with a unified system for inventory tracking, QR-based billing, supplier management, B2B customer management, AI demand forecasting, and analytics dashboards.

| Aspect | Detail |
|--------|--------|
| **Domain** | SMB inventory management, B2B commerce |
| **Users** | Shopkeepers, wholesalers, B2B customers |
| **Differentiator** | AI-powered demand forecasting (Random Forest, R²=0.862) |
| **Scale Target** | 1,000+ concurrent users, 100,000+ products |
| **Stack** | Next.js 16 (FE) · FastAPI (BE) · PostgreSQL (DB) · Redis (Cache) · Cloudflare R2 (Storage) |

### Key Features
- **Inventory Management** — Product CRUD, multi-store, batch tracking, expiry alerts, QR labels
- **QR Billing** — Scan-and-bill workflow with GST invoice PDF generation
- **B2B Commerce** — Catalog browsing, bulk ordering, credit limit enforcement
- **AI Forecasting** — Random Forest demand prediction with confidence scoring
- **Reports** — Top customers, repeat purchases, customer lifetime value
- **Real-Time** — Socket.IO for live inventory updates and notifications
- **Data Management** — Import/export (CSV, Excel), full DB backup/restore (local + R2)

---

## 2. Business Problem

### Problem Statement

Independent retailers and wholesalers in India and similar markets rely on:
- **Paper notebooks** — error-prone, no analytics, no inventory visibility
- **Spreadsheets** — manual, no real-time sync, single-user
- **Disconnected software** — separate billing, inventory, and accounting tools

This results in:
- Frequent stockouts (lost sales)
- Overstocking (capital blockage)
- Manual billing errors (customer disputes)
- Poor supplier coordination
- No sales forecasting (reactive ordering)
- Limited business insights (no data-driven decisions)

### Solution Approach

KhataBox consolidates the entire retail workflow into a single platform:
1. **Digitize** — replace paper/spreadsheets with structured digital records
2. **Automate** — low-stock alerts, expiry warnings, QR-based billing
3. **Predict** — AI demand forecasting to optimize inventory levels
4. **Connect** — B2B catalog so customers can self-serve bulk orders

### Target Metrics
- Reduce stockout incidents by 30%
- Improve inventory turnover by 20%
- Reduce manual data entry by 80%
- Enable data-driven reordering decisions

---

## 3. Architecture

### High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + React 19 + TypeScript)                  │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │ Auth.js  │  │ TanStack     │  │ shadcn/ui + Tailwind 4     │ │
│  │ v5       │  │ Query +      │  │ Recharts, Sonner,          │ │
│  │          │  │ Zustand      │  │ Lucide icons               │ │
│  └────┬─────┘  └──────┬───────┘  └─────────────┬──────────────┘ │
│       └───────────────┼────────────────────────┘                │
│                       │ proxy.ts (Next.js middleware)           │
└───────────────────────┼─────────────────────────────────────────┘
                        │ HTTPS (JWT Bearer)
┌───────────────────────▼─────────────────────────────────────────┐
│  Backend (FastAPI — Python 3.14)                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  API Layer (18 route modules, 57 endpoints)               │ │
│  │  auth │ products │ orders │ suppliers │ customers │ stores │ │
│  │  catalog │ dashboard │ forecasting │ reports │ inventory  │ │
│  │  qrcodes │ invoices │ notifications │ expiry │ audit      │ │
│  │  data │ purchase-orders                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Service Layer (7 services, all degrade gracefully)        │ │
│  │  email.py → Resend    │  cache.py → Redis                  │ │
│  │  storage.py → R2      │  task_queue.py → Redis             │ │
│  │  backup.py → DB/R2    │  socketio_manager.py → WS          │ │
│  │  rate_limiter.py → memory                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ML Layer                                                  │ │
│  │  model.pkl — RandomForestRegressor (100 trees, joblib)     │ │
│  │  predict.py — is_model_ready() fallback → formula-based    │ │
│  └────────────────────────────────────────────────────────────┘ │
│      SQLAlchemy 2.0 async + Alembic + Pydantic v2              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│  PostgreSQL 16 (Neon serverless)                                │
│  13 tables: users, products, orders, order_items, suppliers,    │
│  purchase_orders, purchase_order_items, customers, invoices,    │
│  inventory_movements, notifications, audit_logs, stores         │
│  + Full-text search (tsvector + GIN index)                      │
│  + 5 performance indexes (owner_id, shopkeeper_id, etc.)        │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication** — User logs in via Auth.js credentials provider → backend validates → JWT returned → stored in NextAuth session
2. **API Request** — Frontend `clientApi` utility attaches `Authorization: Bearer <token>` header
3. **Backend Handling** — FastAPI route receives request → `get_current_user` dependency decodes JWT, looks up user in DB
4. **Business Logic** — Route handler calls service layer (email, cache, storage) + SQLAlchemy async queries
5. **Caching** — Dashboard queries check Redis first (if available); cache miss → DB query → populate cache
6. **Response** — Pydantic-validated response returned to frontend
7. **Real-Time** — Socket.IO pushes notifications to subscribed clients

### Why This Architecture?

This is a **modified monolithic** architecture — a single backend serving a single frontend. The rationale:

- **MVP pragmatism** — Faster to build, deploy, and debug than microservices
- **No service boundary benefit** — All domains (inventory, orders, customers) are tightly coupled
- **Future-proofing** — Services are already modular (separate route files, service layer); can extract to microservices later
- **Single deployment unit** — One Docker container, one Railway project

---

## 4. Frontend Architecture

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 16 | SSR, file-based routing, Vercel integration |
| Language | TypeScript 5 | Type safety, better DX |
| UI | shadcn/ui + Tailwind CSS 4 | Accessible, customizable, modern aesthetic |
| State | Zustand (UI state) + TanStack Query (server state, planned) | Lightweight, no boilerplate |
| Auth | Auth.js v5 (NextAuth) | JWT session, credentials provider, edge-ready |
| Charts | Recharts 3 | Lightweight, React-native, composable |
| Notifications | Sonner | Minimal toast library |
| Icons | Lucide React | Tree-shakeable, consistent |

### Route Structure (24 routes)

```
/(dashboard)/
├── page.tsx              → Landing (redirect to /dashboard or /login)
├── layout.tsx            → Dashboard shell (sidebar + mobile bottom nav)
├── login/page.tsx        → Credentials sign-in
├── register/page.tsx     → Shopkeeper registration
├── dashboard/page.tsx    → Metric cards + stock distribution chart
├── inventory/
│   ├── page.tsx          → Product CRUD table with search/filters
│   └── movements/page.tsx → Stock movement history
├── billing/page.tsx      → QR billing cart
├── orders/page.tsx       → Order management
├── suppliers/
│   ├── page.tsx          → Supplier CRUD
│   └── price-analysis/page.tsx → Supplier margin analysis
├── customers/page.tsx    → B2B customer CRUD
├── stores/page.tsx       → Multi-store management
├── catalog/page.tsx      → B2B product browsing + cart + checkout
├── my-orders/page.tsx    → Customer order history
├── qr-labels/page.tsx    → Batch QR label printing
├── forecasting/page.tsx  → AI demand predictions
├── reports/page.tsx      → Sales/Inventory/Customer charts
├── notifications/page.tsx → Alert center
├── settings/page.tsx     → Profile + export
├── admin/users/page.tsx  → User management (admin only)
└── purchase-orders/page.tsx → PO management
```

### Component Architecture

```
src/
├── app/                         → Next.js App Router pages
│   └── (dashboard)/            → Route group (shared layout)
├── components/
│   ├── ui/                     → shadcn primitives (button, input, table, select, card, etc.)
│   ├── layout/
│   │   ├── sidebar.tsx         → Desktop sidebar (role-filtered nav)
│   │   ├── bottom-nav.tsx      → Mobile bottom navigation (5 tabs + FAB)
│   │   └── topbar.tsx          → Top header with search/notifications
│   └── auth/
│       └── role-guard.tsx      → RoleGuard component + useRole hook
├── lib/
│   ├── auth.ts                 → Auth.js configuration (credentials provider)
│   ├── client-api.ts           → HTTP client with JWT auto-attach
│   └── store.ts                → Zustand store (cart, sidebar state)
└── styles/
    └── globals.css             → Tailwind imports + theme variables
```

### State Management Strategy

- **Server state** (API data): Currently `useState` + `useEffect`. Planned migration to **TanStack Query** for caching, dedup, background refetch.
- **UI state** (sidebar open, cart, filters): **Zustand** store — lightweight, no provider wrapper needed.
- **Auth state**: **Auth.js session** — persisted in JWT, accessible via `useSession()` hook.
- **Form state**: Local `useState` — forms are simple enough that Formik/React Hook Form would be over-engineering.

### Mobile Responsiveness

- **Desktop (>1024px)**: Full sidebar + topbar layout
- **Mobile (<1024px)**: Bottom navigation bar with 5 tabs (Dashboard, Inventory, Orders, Billing, Reports) + FAB button
- **Layout**: `pb-20 lg:pb-6` padding to account for fixed bottom nav on mobile

### Interview Talking Points

- **Why not Next.js middleware for auth?** `src/middleware.ts` doesn't exist yet — auth is handled client-side via `RoleGuard` and API-side via JWT validation. This is a known gap.
- **Why shadcn over MUI/Chakra?** Full control over styling, no lock-in, smaller bundle (~180KB initial JS).
- **Why not SSR for dashboard?** Dashboard is user-specific and requires auth — static generation with client-side data fetching is simpler and just as fast with Redis caching.

---

## 5. Backend Architecture

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | FastAPI | Async, auto-docs (Swagger/ReDoc), Pydantic validation |
| Language | Python 3.14 | ML ecosystem, async support |
| ORM | SQLAlchemy 2.0 async | Type-safe queries, relationship loading |
| Migrations | Alembic | Declarative, versioned, reversible |
| Validation | Pydantic v2 | Fast, rigorous, used by FastAPI natively |
| Auth | python-jose + passlib | JWT encode/decode, bcrypt hashing |
| ML | scikit-learn 1.9, pandas 3, joblib | Random Forest, data manipulation, model serialization |

### Module Structure

```
backend/
├── app/
│   ├── main.py                 → FastAPI app, middleware, lifespan, Sentry/PostHog init
│   ├── config.py               → Pydantic Settings (17 env vars)
│   ├── core/
│   │   ├── database.py         → Async engine + session factory
│   │   ├── dependencies.py     → get_current_user(), require_role()
│   │   └── security.py         → JWT create/decode, bcrypt hash/verify
│   ├── api/v1/
│   │   ├── __init__.py         → Router aggregation (18 modules)
│   │   ├── auth.py             → Login, register, me, user management
│   │   ├── products.py         → CRUD + image upload
│   │   ├── orders.py           → CRUD + bulk + my-orders
│   │   ├── catalog.py          → Customer-facing product listing
│   │   ├── suppliers.py        → CRUD + price analysis
│   │   ├── customers.py        → CRUD
│   │   ├── stores.py           → CRUD
│   │   ├── dashboard.py        → Parallel aggregate queries + Redis cache
│   │   ├── forecasting.py      → ML demand prediction
│   │   ├── reports.py          → Top customers, repeat purchases, CLV
│   │   ├── inventory.py        → Stock movement history
│   │   ├── invoices.py         → PDF generation (ReportLab)
│   │   ├── qrcodes.py          → Single + batch QR label generation
│   │   ├── purchase_orders.py  → CRUD + status update
│   │   ├── expiry.py           → Upcoming expiry alerts (30/60/90 day)
│   │   ├── notifications.py    → List, mark-read, mark-all-read
│   │   ├── audit.py            → Audit log listing
│   │   └── data.py             → Import/export, backup/restore
│   ├── models/                 → 12 SQLAlchemy models
│   ├── schemas/                → 8 Pydantic schema groups
│   ├── services/               → 7 reusable services
│   └── ml/                     → model.pkl, predict.py, train.py
├── tests/
│   ├── conftest.py             → Fixtures (live server on port 18999)
│   └── test_api.py             → 39 test methods across 21 endpoint groups
├── alembic/                    → 6 migrations
├── requirements.txt            → 27 dependencies
├── Dockerfile                  → Python 3.12-slim, uvicorn
└── seed.py                     → Idempotent seed (deletes + recreates all data)
```

### Middleware Stack

1. **CORSMiddleware** — Allow origins from `CORS_ORIGINS` env var
2. **Rate Limiter** — In-memory sliding window (100 req/min per IP), skips `/ws`, `/health`, `/docs`
3. **X-Response-Time** — Adds `X-Response-Time` header (ms) to every response
4. **Sentry** — Error capturing, 20% trace sample rate
5. **PostHog** — Analytics initialization (no events captured yet)

### Service Layer Design

All 7 services follow the same pattern:
- Import dependencies inside `try/except` or check `is_available()` at top
- Degrade gracefully when not configured (return `False`/`None`/empty)
- No hard failures if Redis/R2/Resend is unavailable

```python
# Example pattern (services/cache.py)
try:
    import redis.asyncio as aioredis
    _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    _available = True
except Exception:
    _redis = None
    _available = False

def is_available() -> bool:
    return _available
```

This means the app works **fully without any external service** except PostgreSQL.

### Interview Talking Points

- **Why FastAPI over Django/Flask?** Async native, auto OpenAPI docs, Pydantic integration, Python ML ecosystem. Django REST Framework would be heavier (monolithic ORM, admin, templates we don't need).
- **Why async SQLAlchemy?** Non-blocking DB I/O on the async event loop. Prevents thread pool exhaustion under load.
- **Why not GraphQL?** The data model is highly relational but accessed in predictable patterns (list + detail + aggregates). REST is simpler, cacheable, and sufficient for this scale. Adding GraphQL would increase complexity without proportional benefit.
- **Service degradation strategy:** Every external service is optional. The app works with just PostgreSQL. This was a deliberate decision to keep the MVP deployable without upfront cloud commitments.

---

## 6. Database Design

### Entity Relationship Summary

```
User (1) ───< Product (N)        User is shopkeeper/owner
User (1) ───< Store (N)
User (1) ───< Customer (N)
User (1) ───< Order (N)          As shopkeeper
User (1) ───< Notification (N)
User (1) ───< AuditLog (N)
User (1) ───< Supplier (N)

Product (N) >── Store (1)        Product belongs to store (optional)
Product (1) ───< OrderItem (N)
Product (1) ───< InventoryMovement (N)
Product (1) ───< PurchaseOrderItem (N)

Order (1) ───< OrderItem (N)
Order (1) ───  Invoice (1)       One-to-one via order_id
Order (N) >── Customer (1)       Optional customer reference

Supplier (1) ───< PurchaseOrder (N)
PurchaseOrder (1) ───< PurchaseOrderItem (N)
```

### Key Tables (13 total)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Auth + profile | email (unique), password_hash, role (admin/shopkeeper/customer), is_active |
| `products` | Core inventory | sku, name, category, brand, cost_price, selling_price, stock_quantity, reorder_threshold, search_vector, image_url, store_id, owner_id |
| `stores` | Multi-outlet | name, address, phone, owner_id |
| `orders` | Sales transactions | order_number (unique), status (5 states), subtotal, discount, gst, total, shopkeeper_id, customer_id |
| `order_items` | Line items | product_id, product_name, quantity, unit_price, total_price |
| `invoices` | PDF billing | order_id, invoice_number, total, gst |
| `suppliers` | Vendor management | company_name, contact_person, email, phone, owner_id |
| `purchase_orders` | Stock procurement | po_number, supplier_id, status (4 states), total, shopkeeper_id |
| `customers` | B2B buyers | company_name, gst_number, credit_limit, credit_used, price_tier, owner_id |
| `inventory_movements` | Audit trail | product_id, movement_type (SALE/PURCHASE/ADJUSTMENT/TRANSFER), quantity, reference, shopkeeper_id |
| `notifications` | Alerts | type (LOW_STOCK/EXPIRY/ORDER), title, message, is_read, user_id, reference_id |
| `audit_logs` | Compliance | user_id, action, entity_type, entity_id, details |
| `purchase_order_items` | PO line items | Same structure as order_items |

### Indexes

| Index | Type | Purpose |
|-------|------|---------|
| `products_search_vector` | GIN | Full-text search on product name + SKU |
| `ix_products_owner_id` | B-tree | All product queries scoped to owner |
| `ix_products_store_id` | B-tree | Store-filtered product lists |
| `ix_orders_shopkeeper_id` | B-tree | Order listing + dashboard aggregates |
| `ix_orders_customer_id` | B-tree | Customer order history |
| `ix_customers_owner_id` | B-tree | Customer lists by shopkeeper |

### Migration History (6 migrations)

| Migration | Purpose |
|-----------|---------|
| 0001 | Initial schema (11 tables + 4 enum types) |
| 0002 | Full-text search (tsvector column + GIN index + trigger) |
| 0003 | Expiry batch tracking (batch_number, mfg_date, expiry_date) |
| 0004 | Multi-store support (stores table, store_id on products) |
| 0005 | Product image upload (image_url column on products) |
| 0006 | Performance indexes (5 B-tree indexes on foreign keys) |

### Interview Talking Points

- **Why not NoSQL?** Highly relational data (orders ↔ items ↔ products ↔ customers). PostgreSQL's ACID compliance is critical for financial transactions (billing, invoices, credit limits).
- **Why tsvector vs LIKE search?** `LIKE '%term%'` does a sequential scan — O(n). GIN-indexed tsvector search is O(log n). At 100k products, the difference is seconds vs milliseconds.
- **Why selectinload for relationships?** Prevents N+1 queries. Without it, loading 100 orders with items would execute 101 queries (1 for orders + 100 for each order's items). `selectinload` reduces this to 2 queries total.
- **Why not foreign keys on all user references?** `shopkeeper_id`, `owner_id` columns are plain Integer, not ForeignKey. This is intentional — an order might reference a shopkeeper who gets deleted. We store the denormalized reference without enforcing FK cascade.

---

## 7. Authentication Flow

### Login Flow

```
Client                          Server
  │                                │
  │  POST /api/v1/auth/login       │
  │  { email, password }           │
  │ ─────────────────────────────> │
  │                                │
  │                                │ 1. Query users WHERE email = ?
  │                                │ 2. verify_password(plain, hashed)
  │                                │ 3. create_access_token({ sub, role })
  │                                │ 4. create_refresh_token({ sub })
  │                                │
  │  200 { access_token,           │
  │        refresh_token,          │
  │        user }                  │
  │ <───────────────────────────── │
  │                                │
  │  Store tokens in               │
  │  NextAuth JWT session          │
```

### Token Design

```python
def create_access_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")

def create_refresh_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")
```

**Token contents:**
- `sub`: user ID (integer)
- `role`: user role string (admin/shopkeeper/customer)
- `exp`: expiration timestamp (UTC)

### Token Validation

```python
def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None
```

### Token Storage (Frontend)

- **Access token** stored in NextAuth JWT session → returned in `session.access_token`
- **Refresh token** stored in NextAuth JWT session but **not used** on frontend for rotation (gap)
- Every API call uses `clientApi` utility that reads token from session and attaches `Authorization: Bearer <token>`

### Registration Flow

```
POST /api/v1/auth/register { email, password, name, role, store_name, phone }
```

1. Check email uniqueness
2. `hash_password(password)` → bcrypt hash
3. Create User record
4. Generate tokens
5. Return TokenResponse

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| Password storage | bcrypt with cost factor 12 |
| Token expiry | 30 min access + 7 day refresh |
| SQL injection | SQLAlchemy parameterized queries |
| Brute force | Rate limiter: 100 req/min per IP |
| Token tampering | HS256 with server-side secret |
| No refresh logic | Known gap — frontend needs token refresh interceptor |
| Deactivated users | `is_active` not checked in `get_current_user` (known gap) |

### Interview Talking Points

- **Why HS256 over RS256?** Simpler, no public/private key management. HS256 is appropriate for a monolithic backend where the same service both issues and validates tokens.
- **Why not OAuth2 social login?** MVP targets shopkeepers who prefer email/password. OAuth (Google, etc.) can be added via Auth.js providers later.
- **Why NextAuth for JWT storage?** NextAuth handles session serialization/deserialization, httpOnly cookie management for server components, and provides a consistent `useSession()` API.

---

## 8. Authorization Flow

### Role Model

```python
class UserRole(str, enum.Enum):
    ADMIN = "admin"          # Full system access
    SHOPKEEPER = "shopkeeper"  # Inventory, billing, reports
    CUSTOMER = "customer"     # Catalog, bulk orders, order history
```

### Enforcement Layers

**Layer 1 — Frontend (UI filtering):**
```tsx
// Sidebar items filtered by role
const navItems = role === "admin"
  ? [...allItems, { href: "/admin/users", label: "Users" }]
  : role === "customer"
  ? catalogItems
  : shopkeeperItems

// Component-level guard
<RoleGuard roles={["admin"]}>
  <AdminPanel />
</RoleGuard>
```

**Layer 2 — Next.js Middleware (route guard):**
- Redirects unauthenticated users to `/login`
- (Note: `middleware.ts` does not yet exist — this is planned)

**Layer 3 — Backend (API enforcement):**

```python
# Authenticated (any role)
async def get_current_user(credentials, db) -> User:
    payload = decode_token(credentials.credentials)
    # ... lookup user by ID, return User or 401

# Role-restricted
def require_role(*roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403)
        return current_user
    return role_checker
```

### Permission Matrix

| Endpoint | Auth | Admin | Shopkeeper | Customer |
|----------|------|-------|------------|----------|
| `POST /auth/register` | ❌ | — | — | — |
| `POST /auth/login` | ❌ | — | — | — |
| `GET /auth/me` | ✅ | ✅ | ✅ | ✅ |
| `GET /auth/users` | `require_role("admin")` | ✅ | ❌ | ❌ |
| `PATCH /auth/users/{id}/role` | `require_role("admin")` | ✅ | ❌ | ❌ |
| `*/products/*` | `get_current_user` | ✅ | ✅ | ❌ |
| `*/orders/*` (except `/bulk`, `/my-orders`) | `get_current_user` | ✅ | ✅ | ❌ |
| `POST /orders/bulk` | `get_current_user` | ✅ | ✅ | ✅ |
| `GET /orders/my-orders` | `get_current_user` | ✅ | ✅ | ✅ |
| `GET /catalog/products` | `get_current_user` | ✅ | ✅ | ✅ |
| `*/dashboard/*` | `get_current_user` | ✅ | ✅ | ❌ |
| `*/admin/*` | ❌ (no backend endpoint) | — | — | — |

### Known Gaps

1. **No `is_active` check** — Deactivated users can use existing JWT tokens until they expire. Fix: check `user.is_active` in `get_current_user`.
2. **No middleware.ts** — Next.js edge middleware for route-level auth is not implemented.
3. **No audit of authorization failures** — 403 errors aren't logged to Sentry or the audit log.

---

## 9. API Design

### Design Principles

1. **Resource-oriented** — RESTful endpoints map to resources: `/products`, `/orders`, `/suppliers`
2. **Consistent naming** — Plural nouns, snake_case for Python (auto-converted by Pydantic), kebab-case in URLs
3. **Standard HTTP methods** — GET (list/retrieve), POST (create), PUT (full update), PATCH (partial update), DELETE (soft-delete)
4. **Pydantic validation** — All request/response models validated at the boundary
5. **Bearer auth** — Every protected endpoint uses `get_current_user` dependency
6. **Status codes** — 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Validation Error, 429 Rate Limited

### Endpoint Categories (69 total)

| Category | Count | Examples |
|----------|-------|---------|
| Auth | 6 | `register`, `login`, `me`, `users`, `users/{id}/role`, `users/{id}/toggle-active` |
| Products | 6 | `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/image` |
| Catalog | 1 | `GET /products` (customer-facing, returns only active products) |
| Orders | 6 | `GET /`, `POST /`, `POST /bulk`, `GET /my-orders`, `GET /{id}`, `PATCH /{id}/status` |
| Suppliers | 4 | CRUD + `GET /price-analysis` |
| Customers | 4 | CRUD |
| Stores | 4 | CRUD |
| Purchase Orders | 3 | `GET /`, `POST /`, `PATCH /{id}/status` |
| Reports | 3 | `top`, `repeat-purchases`, `clv` |
| Dashboard | 1 | `GET /stats` (parallel + cached) |
| Forecasting | 1 | `GET /demand/{product_id}` |
| Inventory | 2 | `GET /movements`, `GET /movements/{product_id}` |
| QR Codes | 2 | `GET /product/{id}`, `GET /batch?ids=1,2,3` |
| Invoices | 1 | `POST /generate/{order_id}` (PDF) |
| Notifications | 3 | `GET /`, `PATCH /mark-all-read`, `PATCH /{id}/read` |
| Expiry | 1 | `GET /upcoming` (30/60/90 day buckets) |
| Audit | 1 | `GET /logs` |
| Data | 7 | Export products/orders, import products, backup/restore × 4 |
| Health | 1 | `GET /health` |
| Docs | 4 | `/docs`, `/redoc`, `/openapi.json`, `/docs/oauth2-redirect` |
| WebSocket | 1 | `/ws` (Socket.IO ASGI mount) |

### Pagination

Most list endpoints accept `limit` and `offset` query parameters:
```python
query = query.offset(offset).limit(limit)
```
Defaults: `limit=50`, `offset=0`. Max limit: 500 for audit logs, 500 for inventory movements.

### Error Response Format

```json
{
  "detail": "Product not found"
}
```
All errors follow FastAPI's standard format with appropriate HTTP status codes.

### Rate Limiting

- **Algorithm:** In-memory sliding window
- **Limit:** 100 requests per 60 seconds per IP
- **Exempt paths:** `/ws`, `/health`, `/docs`, `/redoc`, `/openapi.json`
- **Response on limit:** HTTP 429 with `{"detail": "Rate limit exceeded. Max 100 requests per 60 seconds."}`
- **Limitation:** In-memory, resets on server restart. Should use Redis for multi-process production.

### Interview Talking Points

- **Why REST over GraphQL?** The client fetches data in predictable patterns. REST caching (browser/CDN) is simpler. GraphQL would add complexity (resolvers, N+1 problem, caching) without proportional benefit at this scale.
- **Why not version in URL (v2)?** The `/api/v1` prefix allows future API versions. Backward-incompatible changes would live at `/api/v2`.
- **Why streaming response for PDF/QR?** `StreamingResponse` avoids loading entire file into memory before sending. For PDFs, the buffer is sent as it's generated.
- **Why soft-delete on products?** Historical order data references products. Hard-deleting would orphan order items. `is_active=False` preserves referential integrity.

---

## 10. Forecasting Pipeline

### Overview

The forecasting module uses a **Random Forest Regressor** trained on synthetic sales data to predict product demand. It enables shopkeepers to make data-driven reordering decisions.

### Model Training (`ml/train.py`)

```
Data Generation:
  - 2,000 synthetic samples across 8 product categories
  - Features: sales_7d, sales_30d, category_encoded, day_of_week, month, is_weekend, is_holiday
  - Target: demand_quantity (5-200 units)

Model:
  - RandomForestRegressor (100 trees, max_depth=10, random_state=42)
  - Categorical encoding: LabelEncoder for category
  - No scaling needed (tree-based model)

Serialization:
  - joblib.dump(model_bundle, "model.pkl")
  - Bundle contains: model, cat_encoder, feature_cols

Metrics:
  - R²: 0.862 (explains 86% of variance)
  - MAE: 6.94 units (average prediction error)
```

### Prediction Service (`ml/predict.py`)

```python
def predict_demand(product_data: dict) -> dict:
    if not is_model_ready():
        # Fallback: formula-based prediction
        predicted_demand = round(total_sold * 1.1)
        ...
        return fallback_result

    # ML prediction
    model_bundle = _load_model()
    input_df = pd.DataFrame([features])
    pred = float(model.predict(input_df)[0])
    confidence = calculate_confidence(model, pred)
    return {
        "predicted_demand": pred,
        "recommended_order_qty": max(0, pred - current_stock),
        "confidence_score": confidence,
        "seasonality_factor": 1.0 + seasonality_bump,
    }
```

### API Endpoint

```python
GET /api/v1/forecasting/demand/{product_id}
Authorization: Bearer <token>

Response:
{
  "product_id": 1,
  "product_name": "Parle-G Biscuit",
  "current_stock": 45,
  "total_sold_last_30_days": 320,
  "predicted_demand": 352,
  "recommended_order_qty": 307,
  "confidence_score": 92,
  "seasonality_factor": 1.1
}
```

### ML vs Fallback

| Scenario | Method | When |
|----------|--------|------|
| `model.pkl` exists | Random Forest (100 trees) | Post-training |
| `model.pkl` missing | Formula: `total_sold × 1.1` | Default/untrained |
| No sales history | Returns 0 with confidence 0 | New products |

### Confidence Scoring

```python
# For Random Forest: confidence based on tree prediction variance
individual_preds = [tree.predict(input_df)[0] for tree in model.estimators_]
std = float(pd.Series(individual_preds).std())
confidence = max(0, min(100, round(100 - (std / max(pred, 1)) * 20)))
```

Low variance across trees → high confidence. High variance → low confidence.

### Seasonality Factors

| Months | Factor | Rationale |
|--------|--------|-----------|
| November, December | 1.1 | Holiday season demand spike |
| March, April | 1.1 | Pre-monsoon / fiscal year start |
| All other months | 1.0 | Baseline |

### Frontend

The `/forecasting` page shows:
1. **Hero card** — Selected product's predicted demand, recommended reorder, confidence
2. **Trend chart** — Currently displays hardcoded mock data (gap: should connect to API)

### Interview Talking Points

- **Why Random Forest over deep learning?** RF is interpretable, works well with tabular data, requires minimal hyperparameter tuning, and is fast at inference (~50ms). Deep learning would need more data (we have 2k synthetic samples) and is harder to deploy.
- **Why hybrid (ML + fallback)?** Ensures the feature works even when the model file is missing. The fallback formula (`sales × 1.1`) provides reasonable estimates for an MVP.
- **Why synthetic data?** Real sales data requires production usage. The synthetic model demonstrates the pipeline works — it gets retrained with real data post-launch.
- **What limits prediction accuracy?** Limited features (no price elasticity, weather, competitor data, promotions). R²=0.86 is good for MVP but can improve with more features and real data.

---

## 11. Redis Architecture

### Purpose

Redis serves three distinct functions in KhataBox, all of which degrade gracefully when Redis is unavailable:

### 1. Caching Layer (`services/cache.py`)

```python
# Usage in dashboard.py
cache_key = f"dashboard:{current_user.id}"
if cache_available():
    cached = await cache_get(cache_key)
    if cached:
        return cached

# ... compute results ...

if cache_available():
    await cache_set(cache_key, data, ttl=300)
```

**Cache strategy:**
- **Write-through** — Data written to cache after DB query
- **TTL-based expiry** — `dashboard:{user_id}` expires after 300 seconds
- **JSON serialization** — Complex dicts serialized/deserialized automatically
- **Pattern invalidation** — `invalidate_pattern("user:*")` for bulk deletion

### 2. Task Queue (`services/task_queue.py`)

```python
async def enqueue(queue: str, task_type: str, payload: dict) -> bool:
    task = {
        "type": task_type,
        "payload": payload,
        "created_at": now.isoformat(),
    }
    await _redis.lpush(f"queue:{queue}", json.dumps(task))

async def dequeue(queue: str) -> dict | None:
    data = await _redis.rpop(f"queue:{queue}")
    return json.loads(data) if data else None
```

**Queue design:**
- Redis lists used as FIFO queues (LPUSH + RPOP)
- No BullMQ dependency — keeps the stack simple for MVP
- Graceful degradation: if Redis is down, `enqueue()` returns `False`

### 3. Future Socket.IO Adapter

Redis pub/sub would enable multi-process Socket.IO:
```python
# Planned (not implemented)
import socketio
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS,
    adapter=socketio.AsyncRedisAdapter(settings.REDIS_URL),
)
```

### Cache Key Design

| Key | Value | TTL | Location |
|-----|-------|-----|----------|
| `dashboard:{user_id}` | JSON stats dict | 300s | dashboard.py |

**Planned keys:**
| `product:{id}` | Product JSON | 600s | products.py |
| `products:list:{shopkeeper_id}` | Product list | 60s | products.py |

### Degradation Pattern

```python
try:
    import redis.asyncio as aioredis
    _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    _available = True
except Exception:
    _redis = None
    _available = False

def is_available() -> bool:
    return _available
```

All consumers check `is_available()` before calling Redis methods. When unavailable, they fall back to direct DB queries.

### Interview Talking Points

- **Why Redis lists instead of BullMQ?** BullMQ adds Redis Streams complexity and a Node.js dependency. Simple Redis lists (LPUSH/RPOP) provide FIFO queue semantics with zero additional dependencies. Adequate for an MVP with <1000 tasks/day.
- **Why TTL-based caching instead of event-driven invalidation?** Simpler to implement. TTL of 300s (5 min) is acceptable for dashboard stats. Event-driven invalidation (invalidate on order creation) would add complexity without significant benefit at MVP scale.
- **Why not cache product/search results?** Product data changes frequently (stock updates on every sale). Caching would risk stale data. The DB query is already fast (~50ms with tsvector).

---

## 12. Socket.IO Architecture

### Purpose

Socket.IO provides real-time bidirectional communication between the backend and frontend for live inventory updates and notifications.

### Implementation

```python
# services/socketio_manager.py
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS.split(","),
)
socket_app = socketio.ASGIApp(sio)

# Mounted in main.py
app.mount("/ws", socket_app)

# Events
@sio.event
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def subscribe(sid, user_id: str):
    sio.enter_room(sid, f"user_{user_id}")
```

### Event Flow

```
Client                    Server
  │                         │
  │  connect()              │
  │ ──────────────────────> │  Accept connection
  │                         │
  │  subscribe("user_42")   │
  │ ──────────────────────> │  Enter room "user_42"
  │                         │
  │  [order placed]         │
  │                         │  sio.emit("notification", {...}, room="user_42")
  │ <────────────────────── │  Real-time push
```

### Current Limitations

| Limitation | Impact | Fix |
|-----------|--------|-----|
| In-memory adapter | Messages lost on server restart | Redis adapter |
| No authentication | Any client can connect | JWT validation in `connect` event |
| Single process | Won't work with multiple uvicorn workers | Redis adapter |
| No reconnection backoff | Client retries indefinitely with default | Configure client reconnection options |

### Interview Talking Points

- **Why Socket.IO over raw WebSockets?** Automatic reconnection, fallback transports (long-polling), room management, and a simpler API. Raw WebSockets would require implementing all of this manually.
- **Why ASGI mount instead of middleware?** Socket.IO runs on a separate ASGI app mounted at `/ws`. This keeps the Socket.IO lifecycle separate from FastAPI's request/response cycle.
- **Why not Server-Sent Events (SSE)?** SSE is unidirectional (server → client). Socket.IO is bidirectional, which is needed for `subscribe` events where the client tells the server which user's notifications to send.

---

## 13. Cloudflare R2 Architecture

### Purpose

Cloudflare R2 provides S3-compatible object storage for:
- Product images
- Backup files
- (Future) Invoice PDFs, export files

### Implementation

```python
# services/storage.py
try:
    import boto3
    _client = boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL or None,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID or "",
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY or "",
        config=Config(signature_version="s3v4"),
    )
    _bucket = settings.R2_BUCKET_NAME or "khatabox"
    _available = bool(settings.R2_ACCESS_KEY_ID)
except Exception:
    _client = None
    _available = False
```

### Operations

| Operation | Function | Used By |
|-----------|----------|---------|
| Upload | `upload(key, data, content_type)` | Product image, backup export |
| Download | `download(key) → bytes` | Backup restore |
| Delete | `delete_file(key)` | (Future) image deletion |
| Public URL | `get_public_url(key) → str` | Product image display |

### Image Upload Flow

```
POST /api/v1/products/{id}/image
Content-Type: multipart/form-data
Authorization: Bearer <token>

1. Validate: file.content_type starts with "image/"
2. Generate key: "products/{user_id}/{product_id}_{uuid}.{ext}"
3. If R2 available:
   a. upload(key, bytes, content_type)
   b. Set product.image_url = f"{R2_PUBLIC_URL}/{key}"
4. If R2 unavailable:
   a. Set product.image_url = placeholder path
5. Commit to DB
6. Return updated ProductResponse
```

### Backup Flow (R2)

```
POST /api/v1/data/backup/export-r2
1. export_backup() — queries all 13 tables, returns JSON dict
2. upload("backups/khatabox_backup_{timestamp}.json", json_bytes)
3. Returns: { "key": "backups/khatabox_backup_20260609_120000.json" }

POST /api/v1/data/backup/restore-r2?key=backups/...
1. download(key) → bytes
2. import_backup(json) — inserts rows into all 13 tables
3. Returns: { "imported": 142, "errors": 0, ... }
```

### Why R2 over S3?

| Factor | R2 | S3 |
|--------|----|----|
| Egress fees | $0 | Varies (can be significant) |
| S3 compatibility | ✅ | Native |
| Global edge | 300+ locations | Regional |
| Free tier | 10 GB | 5 GB |

For an MVP with a small budget, R2's zero egress fees make it the clear choice.

---

## 14. Deployment Architecture

### Services

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel (Frontend)                                           │
│  URL: https://khatabox.vercel.app                            │
│  Build: next build → static generation + server functions    │
│  Edge: Global CDN, automatic HTTPS, preview deployments      │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────┐
│  Railway (Backend)                                           │
│  URL: https://khatabox-api.up.railway.app                    │
│  Runtime: Docker (python:3.12-slim)                          │
│  Port: 8000 (must use $PORT env var)                         │
│  Health: /health endpoint                                    │
└─────────────────────────────────────────────────────────────┘
                          │ TCP
┌─────────────────────────▼───────────────────────────────────┐
│  Neon PostgreSQL                                             │
│  URL: postgresql+asyncpg://...@ep-xxx.us-east-2.aws.neon.tech│
│  Tier: Serverless (auto-scale, pay-per-query)                │
└─────────────────────────────────────────────────────────────┘

Optional services (when configured):
  - Upstash Redis: Caching + task queue
  - Cloudflare R2: Image storage + backup
  - Resend: Email notifications
  - Sentry: Error tracking
  - PostHog: Product analytics
```

### Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Known gaps:**
- `CMD` should use `$PORT` env var for Railway compatibility
- No `.dockerignore` (ships `__pycache__`, `.venv`, `.git`)
- No non-root user
- No health check instruction

### Deployment Prerequisites

| Service | Config Type | Status |
|---------|------------|--------|
| Neon PostgreSQL | `DATABASE_URL` env var | ✅ Code ready |
| Railway | Dockerfile + env vars | ⚠️ Needs Docker hardening |
| Vercel | GitHub import + env vars | ❌ No `vercel.json` |
| Upstash Redis | `REDIS_URL` env var (optional) | ✅ Code ready |
| Cloudflare R2 | 5 `R2_*` env vars (optional) | ✅ Code ready |
| Resend | `RESEND_API_KEY` (optional) | ✅ Code ready |
| Sentry | `SENTRY_DSN` (optional) | ✅ Code ready |
| PostHog | `POSTHOG_API_KEY` (optional) | ✅ Code ready |

### Environment Variables

**Backend (17 vars):**
```
DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
REFRESH_TOKEN_EXPIRE_DAYS, REDIS_URL, RESEND_API_KEY, POSTHOG_API_KEY,
POSTHOG_HOST, SENTRY_DSN, CORS_ORIGINS, R2_ENDPOINT_URL,
R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
```

**Frontend (3 vars):**
```
NEXT_PUBLIC_API_URL, AUTH_SECRET, AUTH_URL
```

### CI/CD

Not yet configured. Recommended:
- **GitHub Actions** on push to main:
  1. Run `pytest` (backend)
  2. Run `npm run build` (frontend)
  3. Deploy backend to Railway
  4. Deploy frontend to Vercel

### Interview Talking Points

- **Why Railway over AWS/GCP?** Minimal configuration, Docker-native, great DX for MVPs. AWS would require ECS/AppRunner configuration, IAM roles, VPC setup — overkill for a 2-person team.
- **Why Vercel over Cloudflare Pages?** Native Next.js integration, automatic image optimization, serverless functions for API routes, preview deployments for every branch. Cloudflare Pages supports Next.js but with limitations (no ISR).
- **Why Neon over AWS RDS?** Serverless PostgreSQL with automatic scaling to zero. Pay-per-query pricing means the dev database costs ~$0 when idle. Branching enables instant DB cloning for development.

---

## 15. Security Measures

### Implemented

| Measure | Implementation | Coverage |
|---------|---------------|----------|
| **JWT Authentication** | HS256, 30-min expiry | All API routes |
| **Password Hashing** | bcrypt via passlib (cost 12) | Registration + login |
| **Role-Based Access** | `require_role()` decorator | Admin endpoints |
| **CORS** | Configurable origins via env var | All origins |
| **Rate Limiting** | In-memory sliding window, 100/min per IP | All API routes except health/docs/ws |
| **SQL Injection Protection** | SQLAlchemy parameterized queries | All DB operations |
| **XSS Protection** | React auto-escaping, no dangerouslySetInnerHTML | All frontend rendering |
| **No Secrets in Code** | All config via env vars | All environments |
| **Input Validation** | Pydantic schemas at every endpoint | All request bodies |
| **Password Strength** | Min length via Pydantic (implicit) | Registration |

### Gaps

| Gap | Risk | Mitigation Plan |
|-----|------|----------------|
| No HTTPS in dev | MitM attack on localhost | HTTPS enforced on Vercel/Railway at deploy time |
| No `middleware.ts` | Unauthenticated access to `/admin/users` page | Add Next.js middleware to check session |
| `is_active` not checked | Deactivated users can use existing tokens | Add check in `get_current_user` |
| No CSP headers | XSS via injected scripts | Add `Content-Security-Policy` in `vercel.json` |
| No refresh token rotation | Stolen refresh token = permanent access | Implement refresh token rotation |
| No audit of auth failures | Can't detect brute force attempts | Log failed logins to Sentry |
| In-memory rate limiter | Resets on restart, doesn't work across processes | Migrate to Redis-based rate limiter |

### Security Headers (Planned)

```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "Content-Security-Policy", "value": "default-src 'self'" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=()" }
    ]}
  ]
}
```

### Interview Talking Points

- **Why in-memory rate limiter instead of Redis?** Eliminates Redis as a hard dependency. 100 req/min sliding window is implemented with a `defaultdict(list)` + periodic cleanup. For single-process dev/light production, this is adequate. Redis-based rate limiting is a drop-in replacement when needed.
- **Why no CSRF protection?** The API uses JWT Bearer tokens in Authorization headers, not cookies for auth. CSRF only applies to cookie-based auth. If we add cookie-based sessions in the future, we'd need CSRF tokens.
- **Why not HTTPS in dev?** Self-signed certificates add friction with no real security benefit for local development. Railway/Vercel handle TLS termination automatically.

---

## 16. Scaling Strategy

### Current Capacity

| Resource | Current | Bottleneck |
|----------|---------|------------|
| Concurrent users | ~200 async connections | Single uvicorn worker |
| Products | 100,000+ | Indexed queries, no full table scans |
| Orders/day | ~1,000 | Single DB, adequate |
| Storage | 10 GB R2 free tier | Image uploads |

### Scaling Path

#### Phase 1: Vertical Scaling (0-1,000 users)
- **Database:** Upgrade Neon CPU (0.25 → 1 vCPU)
- **Backend:** Increase uvicorn workers (1 → 4)
- **Cache:** Enable Redis (already coded, just set `REDIS_URL`)
- **Rate limiter:** Switch to Redis (fixes multi-process rate limiting)
- **Result:** Handles 1,000+ concurrent users

#### Phase 2: Horizontal Scaling (1,000-10,000 users)
- **API:** Add more Railway instances behind a load balancer
- **Socket.IO:** Add Redis adapter for cross-instance pub/sub
- **Database:** Neon auto-scales read replicas
- **Static assets:** Vercel Edge CDN already handles this
- **Task queue:** Consider BullMQ for reliable background jobs
- **Result:** Handles 10,000+ concurrent users

#### Phase 3: Microservices (10,000+ users)
- Split backend into services:
  - **Auth Service** — Authentication + user management
  - **Inventory Service** — Products, stock, movements
  - **Order Service** — Orders, invoices, billing
  - **Forecasting Service** — ML predictions (GPU if needed)
  - **Notification Service** — Email, push, Socket.IO
- **Message queue:** RabbitMQ/Kafka for inter-service communication
- **Search:** Replace PostgreSQL FTS with Elasticsearch

### Database Scaling

| Technique | Current | Planned |
|-----------|---------|---------|
| Indexing | 6 indexes on key columns | Monitor slow query log |
| Connection pooling | SQLAlchemy pool (default) | PgBouncer for connection pooling |
| Read replicas | Not used | Neon auto-scaling |
| Sharding | Not needed | At 10M+ products |
| Caching | Dashboard only (Redis) | Products, search results |

### Frontend Scaling

| Technique | Current | Planned |
|-----------|---------|---------|
| CDN | Vercel Edge Network | Vercel Edge Network |
| Image optimization | Next.js `<Image>` | Cloudflare Images |
| Bundle size | ~180KB JS | Code splitting + lazy loading |
| API caching | None | TanStack Query |
| SSR vs SSG | SSG for most pages | ISR for dynamic pages |

### Interview Talking Points

- **Why not start with microservices?** Premature optimization. Monolith is faster to build, deploy, debug, and reason about. The code is already modular (separate route files, service layer) — extracting to microservices later requires only moving files.
- **What breaks at 10k users?** Single uvicorn worker can handle ~200 async connections. At 10k users, you need multiple workers + load balancer. Socket.IO in-memory adapter won't work across workers (needs Redis). Rate limiter in-memory won't work across workers (needs Redis).
- **How would you handle 100k products?** Already accounted for. tsvector + GIN index for search (~50ms at 100k). Performance indexes on all filtered columns. Pagination on all list endpoints. No full table scans.

---

## 17. Design Decisions

### Why FastAPI + Python instead of Node.js?

Python was chosen because the platform already includes ML forecasting. FastAPI keeps AI and backend in the same ecosystem, avoiding a polyglot architecture. Node.js + Express would work but would require a separate Python microservice for the ML component, adding network latency and operational complexity.

### Why SQLAlchemy async instead of sync?

All database operations use `AsyncSession` to avoid blocking the event loop. Sync DB calls in async handlers would block the event loop thread, reducing throughput. SQLAlchemy 2.0's async support is mature and provides the same API as sync.

### Why Pydantic for validation instead of dataclasses?

Pydantic v2 is the foundation of FastAPI's request/response pipeline. It provides:
- Automatic JSON schema generation (→ OpenAPI docs)
- Strict type coercion (string → int, etc.)
- Complex validation (email, regex, custom validators)
- `model_dump()` / `model_validate()` for ORM integration

Dataclasses would require manual validation code and wouldn't integrate with FastAPI's auto-docs.

### Why 5 performance indexes in one migration (0006)?

The initial schema (0001) only had primary keys and unique constraints. After profiling real query patterns, 5 foreign-key columns (`owner_id`, `store_id`, `shopkeeper_id`, `customer_id`, `owner_id` on customers) were identified as common filter conditions. Adding B-tree indexes on these columns converts sequential scans to index scans.

### Why 3 customer roles (admin/shopkeeper/customer)?

- **Admin** — Full system access, user management, can view all data
- **Shopkeeper** — Inventory management, billing, reports, cannot manage users
- **Customer** — Product catalog, bulk orders, order history, cannot manage anything

Three roles provide clear separation while keeping the model simple. Adding more roles (manager, accountant, etc.) would follow the same pattern.

### Why soft-delete for products instead of hard-delete?

Hard-deleting a product would:
1. Orphan order items that reference the product ID
2. Break invoice history (product name, price, etc.)
3. Lose inventory movement history

Soft-delete (`is_active = False`) preserves data integrity while hiding the product from active queries.

### Why background tasks inline instead of Celery/BullMQ?

For MVP scale (<1000 orders/day), inline background tasks (`await check_low_stock()`) are sufficient. They execute in the same request-response cycle. Celery/BullMQ would add:
- Redis/RabbitMQ dependency
- Worker process management
- Serialization/deserialization overhead
- Monitoring infrastructure

The tradeoff is that a slow notification blocks the order response. At scale, background tasks would be offloaded to the Redis task queue.

### Why static report charts instead of live API data?

Several report charts (sales summary, inventory distribution, products by category) currently display static data. This was a deliberate MVP tradeoff — building live aggregation endpoints for every chart would have added ~10 endpoints. The static data demonstrates the UI layout and visualization components, ready to connect to live data.

### Why no TanStack Query yet?

All data fetching uses `useState` + `useEffect` with `clientApi` (a fetch wrapper). TanStack Query was planned (it's in the TECHSTACK) but wasn't integrated because:
1. The MVP has few enough API calls that manual caching isn't painful
2. Adding TanStack Query in production migration ensures the caching strategy matches real usage patterns
3. Zustand handles UI state (cart, sidebar) — TanStack Query handles server state (API data)

---

## 18. Tradeoffs

### Tradeoff 1: Monolith vs Microservices

**Chosen:** Monolithic backend (single FastAPI app)

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| Build speed | ✅ Fast | ❌ Slow (coordination) |
| Debugging | ✅ Single process | ❌ Distributed tracing |
| Deployment | ✅ One Docker image | ❌ Multiple services |
| Scaling | ❌ Must scale everything | ✅ Scale per service |
| Team isolation | ❌ One codebase | ✅ Team per service |

**Verdict:** Monolith is correct for MVP. The modular structure (separate route files, service layer) makes extraction to microservices straightforward when needed.

### Tradeoff 2: PostgreSQL FTS vs Elasticsearch

**Chosen:** PostgreSQL full-text search (tsvector + GIN)

| Factor | PostgreSQL FTS | Elasticsearch |
|--------|----------------|---------------|
| Setup | ✅ Built-in | ❌ Separate cluster |
| Operations | ✅ Zero ops | ❌ Cluster management |
| Latency | ~50ms | ~10ms |
| Features | Basic (stemming, ranking) | Advanced (fuzzy, autocomplete) |
| Cost | $0 (included) | $0 (self-hosted) or $$$

**Verdict:** PostgreSQL FTS is sufficient for 100k products. Elasticsearch would add operational complexity without proportional benefit. If search becomes a bottleneck, migration is straightforward (dual-write to ES).

### Tradeoff 3: In-Memory vs Redis Rate Limiting

**Chosen:** In-memory sliding window

| Factor | In-Memory | Redis |
|--------|-----------|-------|
| Setup | ✅ Zero config | ❌ Requires Redis |
| Persistence | ❌ Resets on restart | ✅ Persistent |
| Multi-process | ❌ Per-process counters | ✅ Global counters |
| Performance | ✅ ~0.01ms per check | ~1ms per check |

**Verdict:** In-memory is fine for single-process development and light production. Redis-based rate limiting is a priority post-MVP when multi-process deployment is used.

### Tradeoff 4: AsyncSQLAlchemy with selectinload vs Lazy Loading

**Chosen:** `selectinload()` for all relationship queries

**Why:** Prevents N+1 queries. Loading 100 orders with items would be 101 queries with lazy loading vs 2 with selectinload.

**Cost:** Slightly more memory (loads all related data at once). For typical order sizes (<20 items per order), this is negligible.

### Tradeoff 5: Thick Client vs Thin Client

**Chosen:** Thick client (Zustand for UI state, client-side data fetching)

**Why:** The dashboard is highly interactive (real-time updates, role-based rendering, complex forms). Server-rendering every interaction would add latency and complexity.

**Cost:** Larger initial JS bundle (~180KB). SEO impact (most pages are behind auth, so SEO doesn't matter).

### Tradeoff 6: ReportLab vs PDFKit vs wkhtmltopdf

**Chosen:** ReportLab (Python PDF library)

| Factor | ReportLab | PDFKit | wkhtmltopdf |
|--------|-----------|--------|-------------|
| Dependency | ✅ Pure Python | ❌ Node.js | ❌ System binary |
| HTML/CSS support | ❌ No | ✅ Yes | ✅ Yes |
| Control | ✅ Pixel-perfect | ❌ Template-dependent | ❌ Template-dependent |
| Performance | ✅ ~150ms | ~200ms | ~500ms |

**Verdict:** ReportLab gives pixel-perfect control over invoice layout without cross-language dependencies. The tradeoff is that templates are code, not HTML — requires developer effort to change.

### Tradeoff 7: Synthetic ML Model vs No Model

**Chosen:** Synthetic model trained on generated data

**Why:** Demonstrates the full ML pipeline (training → serialization → inference → API → frontend) without requiring real sales data. The model (R²=0.862) provides reasonable estimates.

**Cost:** Predictions are based on synthetic patterns, not real user behavior. The model must be retrained on real data post-launch. The architecture supports this — just retrain and replace `model.pkl`.

### Tradeoff 8: Session DB Check vs JWT-Only Auth

**Chosen:** JWT decode + DB lookup in `get_current_user`

**Why:** Every authenticated request looks up the user from the database. This ensures:
1. Deactivated accounts are caught (when implemented)
2. Role changes take effect immediately
3. Token cannot be used after user deletion

**Cost:** One DB query per API call (~2-5ms). This is an acceptable overhead for the MVP. JWT-only auth (decode without DB lookup) would be faster but risk stale role/permission data.

---

## Appendix A: Interview Cheat Sheet

### Key Numbers

| Metric | Value |
|--------|-------|
| Frontend routes | 24 |
| Backend endpoints | 69 (57 v1 + 12 non-v1) |
| Database tables | 13 |
| Alembic migrations | 6 |
| Test methods | 39 |
| ML model R² | 0.862 |
| ML model MAE | 6.94 units |
| Python dependencies | 27 |
| NPM dependencies | 17 |
| Rate limit | 100 req/min per IP |
| Cache TTL (dashboard) | 300s |
| JWT access token TTL | 30 min |
| JWT refresh token TTL | 7 days |

### Key Files to Reference

| File | Purpose |
|------|---------|
| `backend/app/main.py:34-64` | App initialization, middleware stack |
| `backend/app/core/security.py:19-37` | JWT creation + validation |
| `backend/app/core/dependencies.py:13-35` | Auth + RBAC dependencies |
| `backend/app/services/cache.py:1-50` | Redis caching with graceful degradation |
| `backend/app/services/storage.py:1-62` | R2 storage with graceful degradation |
| `backend/app/api/v1/dashboard.py:18-66` | Parallel queries + caching |
| `backend/app/ml/predict.py:26-77` | ML prediction with formula fallback |
| `backend/app/services/notifications.py:10-54` | Low-stock notification + email |
| `src/lib/auth.ts:1-56` | Auth.js credentials provider |
| `backend/tests/test_api.py` | 39 test methods |

### Common Interview Questions

**Q: How would you scale this to 100k users?**
**A:** (1) Switch rate limiter to Redis, (2) Add Redis Socket.IO adapter, (3) Increase uvicorn workers + add load balancer, (4) Add read replicas on Neon, (5) Cache product/search results in Redis, (6) Eventually split into microservices.

**Q: What's the biggest bottleneck in the current architecture?**
**A:** The single uvicorn worker can handle ~200 concurrent async connections. With 4 workers + Redis for rate limiting + Socket.IO adapter, the system can handle ~800 concurrent users. Beyond that, horizontal scaling with a load balancer is needed.

**Q: Why did you choose FastAPI over Django REST Framework?**
**A:** (1) Native async support, (2) Auto OpenAPI docs, (3) Pydantic integration, (4) Python ML ecosystem compatibility. Django REST Framework is synchronous by default and adds unnecessary abstraction (admin, templates, migrations tied to Django ORM).

**Q: How does the forecasting pipeline work end-to-end?**
**A:** Train → Serialize → Serve. `train.py` generates synthetic data → trains RandomForestRegressor → serializes with joblib. `predict.py` loads model → transforms input features → predicts demand → calculates confidence from tree variance. Falls back to `total_sold × 1.1` formula if model file is missing.

**Q: What would you improve if you had 2 more weeks?**
**A:** (1) Connect forecasting chart to real API data, (2) Add TanStack Query for frontend caching, (3) Create `vercel.json` + `middleware.ts` for deployment readiness, (4) Add frontend JWT refresh logic, (5) Add loading skeletons to all pages, (6) Write 10 more edge-case tests.

---

*End of KhataBox Master Interview Guide*
