# KhataBox — Project State

> **Date:** 2026-06-09
> **Database:** PostgreSQL 16.7 (Docker) ✅ · **Seed Data:** 50 products, 8 suppliers, 5 customers + customer user accounts, 30 orders, 10 POs, 6 notifications ✅
> **Tests:** pytest framework with 48 test cases across 21 endpoint groups ✅
> **Stack:** Next.js 16.2.7 + React 19.2.4 + TypeScript (frontend) · FastAPI + Python 3.14 (backend) · PostgreSQL 16.7 + SQLAlchemy 2.0.50 (database)
> **Build:** Frontend ✅ (24 routes, zero build warnings) · Backend ✅ (69 endpoints) · ML Model ✅ (R²=0.86)

---

## Completed Features

### Authentication & Authorization
- [x] JWT-based login/register via FastAPI backend
- [x] Auth.js (NextAuth v5) credentials provider on frontend
- [x] Password hashing (bcrypt) + refresh tokens
- [x] RBAC: 3 roles — admin, shopkeeper, customer
- [x] Route guard with proxy.ts (Next.js 16 middleware replacement)
- [x] Client-side RoleGuard component + useRole hook
- [x] Login and register pages
- [x] Admin user management page (`/admin/users`) with role filter, search, inline role assignment, activate/deactivate

### Inventory Management
- [x] Product CRUD (create, read, update, delete)
- [x] Product listing with full-text search (tsvector+GIN index via migration 0002), brand, stock_status, min/max price filters
- [x] Stock status badges (In Stock / Low Stock / Out of Stock)
- [x] Bulk CSV/Excel import for products
- [x] Inventory movement tracking (sale, purchase, adjustment, return)
- [x] Inventory movements history page with date filter
- [x] Expiry batch tracking: batch_number, mfg_date, expiry_date (migration 0003)
- [x] Real expiry alerts: `GET /expiry/upcoming` with 30/60/90-day windows
- [x] Multi-store inventory: Store model + CRUD endpoints + `store_id` on Product (migration 0004), store filter on products, frontend page

### Billing & Orders
- [x] Cart system with Zustand state management
- [x] Billing page (product search + cart + totals + discount)
- [x] Order creation with stock deduction
- [x] Order listing with expandable items
- [x] Order status workflow (pending → confirmed → processing → completed → cancelled)
- [x] Payment methods (Cash, UPI, Credit, Bank Transfer)
- [x] PDF invoice generation (reportlab with GST breakdown)
- [x] Receipt system with QR code generation (migration 0011)

### QR Codes & Labels
- [x] Single QR code generation endpoint per product (PNG output)
- [x] Batch QR label printing: `GET /qrcodes/batch?ids=1,2,3` with product info per label
- [x] QR label printing frontend page (`/qr-labels`) with product selection, search, and print

### Supplier Management
- [x] Supplier CRUD (name, contact, email, phone, address)
- [x] Purchase Orders (create, list, status tracking)
- [x] Purchase order items with product selection

### B2B Customer Management
- [x] Customer CRUD with GST number
- [x] Credit limit tracking (`credit_limit` / `credit_used`)
- [x] Tier-based pricing
- [x] Customer-facing catalog (`/catalog`) — browse products, search, add to cart
- [x] Customer-facing bulk order: credit check, auto-resolve customer from email
- [x] Customer order history (`/my-orders`) with detail dialog

### AI Demand Forecasting
- [x] Random Forest Regressor model (trained on synthetic data)
- [x] ML pipeline with feature engineering
- [x] Forecasting dashboard UI (product selector, hero card, trend chart)
- [x] Confidence scoring + recommended reorder quantity
- [x] Model metrics: R²=0.862, MAE=6.94

### Reports & Analytics
- [x] Dashboard widgets (total inventory value, today's sales, pending orders, low stock)
- [x] Sales reports (daily/weekly/monthly/yearly) with Recharts
- [x] Inventory reports (stock distribution pie chart)
- [x] Product reports (category bar chart)
- [x] Customer reports: top customers (by spend), repeat purchases (count>1), customer lifetime value (CLV + avg order value)
- [x] Dashboard API endpoint

### Notifications
- [x] Notification page with real API data
- [x] Type-specific icons (low_stock, expiry, payment, ai_recommendation)
- [x] Mark as read functionality
- [x] Auto low-stock notification on order creation and product update
- [x] Email notification via Resend (when `RESEND_API_KEY` is configured)

### Data Management
- [x] CSV/Excel import for products
- [x] Excel export for products and orders (openpyxl with styled headers)
- [x] Full database backup/restore: `GET /data/backup/export` (JSON), `POST /data/backup/import`
- [x] Cloudflare R2 backup: `POST /data/backup/export-r2`, `POST /data/backup/restore-r2`

### Category Page
- [x] User management page (`/admin/users`)

### Design System
- [x] KhataBox brand colors (primary #2563EB, secondary #10B981)
- [x] Inter font family
- [x] Custom shadows (card, card-hover)
- [x] Responsive sidebar (260px) with sheet on mobile
- [x] shadcn/ui components (Button, Input, Card, Table, Dialog, etc.)

### Architecture & Infrastructure
- [x] Next.js 16 App Router with 20 frontend routes
- [x] FastAPI with 70+ API endpoints
- [x] SQLAlchemy ORM with 14 database models (users, products, orders, order_items, invoices, suppliers, purchase_orders, purchase_order_items, customers, customer_cart, inventory_movements, notifications, audit_logs, stores, receipts)
- [x] Alembic migration for initial schema + 11 migrations (head: 0011)
- [x] Dockerfile for backend containerization
- [x] Proxy middleware for auth protection
- [x] Audit logging endpoint
- [x] Performance middleware (X-Response-Time header)
- [x] Sentry error monitoring (initialized, needs DSN)
- [x] PostHog analytics (initialized, needs API key)
- [x] Socket.IO real-time server mounted at `/ws`
- [x] Mobile bottom navigation for responsive layout
- [x] Rate limiting (100 req/min per IP, in-memory sliding window)
- [x] Product image upload to Cloudflare R2 (migration 0005)
- [x] Performance indexes (migration 0006) — 5 new indexes on foreign keys
- [x] Redis caching layer (service/cache.py)
- [x] Redis task queue (service/task_queue.py)
- [x] Cloudflare R2/S3-compatible storage (service/storage.py)
- [x] Email service via Resend (service/email.py)

---

## Pending Features

### Infrastructure (requires cloud credentials)
- [ ] **Deploy frontend** to Vercel
- [ ] **Deploy backend** to Railway
- [ ] **Configure Neon PostgreSQL** production instance
- [ ] **Configure Upstash Redis** production instance

### Tuning
- [x] **Mobile responsive improvements** — bottom navigation + responsive padding ✅
- [x] **Image upload** — product images via Cloudflare R2 (migration 0005) ✅
- [x] **Rate limiting** — 100 req/min per IP (in-memory sliding window) ✅
- [x] **Performance optimization** — parallel dashboard queries + Redis caching + 5 new indexes (migration 0006) ✅
- [x] **Recharts SSR warning** — fixed with minWidth/minHeight props ✅

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 — Vercel)                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐│
│  │ Auth.js  │  │ TanStack │  │  shadcn/ui Components  ││
│  │ (NextAuth│  │ Query    │  │  (Button, Card, Table,  ││
│  │  v5)     │  │ Zustand  │  │  Dialog, Select, etc.)  ││
│  └──────────┘  └──────────┘  └────────────────────────┘│
│                    │                                      │
│              proxy.ts (auth guard)                        │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP (JWT Bearer)
┌─────────────────▼───────────────────────────────────────┐
│  Backend (FastAPI — Python 3.14 — Railway/Docker)       │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐│
│  │ API v1   │  │ Services │  │  Services (cont.)      ││
│  │ (auth,   │  │ (auth,   │  │  email, cache, backup, ││
│  │ products,│  │ billing, │  │  socketio, storage,    ││
│  │ orders,  │  │ forecast)│  │  task_queue)            ││
│  │ catalog, │  │          │  │                        ││
│  │ reports, │  │          │  │  ML Service             ││
│  │ stores,  │  │          │  │  (Random Forest)        ││
│  │ etc.)    │  │          │  │                        ││
│  └──────────┘  └──────────┘  └────────────────────────┘│
│                    │                                      │
│      SQLAlchemy (async) + Alembic migrations             │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│  Database (PostgreSQL — Neon)    │  Cache (Redis — Upstash)│
│  ┌───────────────────────────┐    │  ┌──────────────────┐    │
│  │ 14 tables + 11 migrations │   │  │ Sessions, button  │    │
│  │ tsvector+GIN index       │    │  │ Dashboard cache,  │    │
│  │                         │    │  │ Task queues       │    │
│  └───────────────────────────┘    │  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### External Services (Code Ready, Awaiting Credentials)
| Service | Purpose | Status |
|---------|---------|--------|
| Cloudflare R2 | File storage (backups, invoices, images) | Code ready — needs `R2_*` env vars |
| Resend | Email notifications (invoices, low stock alerts) | Code ready — needs `RESEND_API_KEY` |
| Sentry | Error monitoring | Code ready — needs `SENTRY_DSN` |
| PostHog | Product analytics | Code ready — needs `POSTHOG_API_KEY` |
| Redis | Cache + task queues + Socket.IO | Code ready — needs `REDIS_URL` |

---

## Database Schema (13 tables)

| Table | Key Columns | Relationships |
|-------|------------|---------------|
| **users** | id, email, password_hash, name, role (admin/shopkeeper/customer), store_name, phone | Owner of products, orders, etc. |
| **products** | id, name, sku (unique), category, brand, cost_price, selling_price, stock_quantity, reorder_threshold, batch_number, mfg_date, expiry_date, search_vector (tsvector+GIN), owner_id, store_id, is_active | FK to users, FK to stores |
| **orders** | id, order_number (unique), shopkeeper_id, customer_id, status (enum), payment_method, subtotal, discount, gst, total | Has many order_items |
| **order_items** | id, order_id, product_id, product_name, quantity, unit_price, total_price | FK to orders (CASCADE) |
| **invoices** | id, invoice_number (unique), order_id, shopkeeper_id, customer_id, pdf_url, subtotal, discount, gst, total | FK to orders |
| **suppliers** | id, name, contact_person, email, phone, address, owner_id | FK to users |
| **purchase_orders** | id, po_number (unique), supplier_id, shopkeeper_id, status (enum), total | Has many po_items |
| **purchase_order_items** | id, purchase_order_id, product_id, product_name, quantity, unit_price, total_price | FK to purchase_orders (CASCADE) |
| **customers** | id, company_name, contact_person, email, phone, gst_number, credit_limit, credit_used, price_tier, owner_id | FK to users |
| **inventory_movements** | id, product_id, shopkeeper_id, movement_type (enum), quantity, reference | FK to products |
| **notifications** | id, user_id, type (enum), title, message, is_read | FK to users |
| **audit_logs** | id, user_id, action, entity_type, entity_id, details | FK to users |
| **stores** | id, name, address, owner_id, created_at, updated_at | FK to users |

### Enums
- `userrole`: admin, shopkeeper, customer
- `orderstatus`: pending, confirmed, processing, completed, cancelled
- `paymentmethod`: cash, upi, credit, bank_transfer
- `postatus`: draft, sent, received, cancelled
- `movementtype`: sale, purchase, adjustment, return
- `notificationtype`: low_stock, expiry, payment_reminder, ai_recommendation

---

## APIs Implemented (69 routes)

### Authentication (6)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login, returns JWT |
| GET | `/api/v1/auth/me` | Current user profile |
| GET | `/api/v1/auth/users` | List all users (admin) |
| PATCH | `/api/v1/auth/users/{id}/role` | Update user role (admin) |
| PATCH | `/api/v1/auth/users/{id}/toggle-active` | Toggle user active (admin) |

### Dashboard (1)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/dashboard/stats` | Aggregate business metrics |

### Products (6)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/products/` | List products (search, brand, stock_status, price, store filters) |
| POST | `/api/v1/products/` | Create product |
| GET | `/api/v1/products/{id}` | Get product |
| PUT | `/api/v1/products/{id}` | Update product |
| DELETE | `/api/v1/products/{id}` | Soft-delete product |
| POST | `/api/v1/products/{id}/image` | Upload product image to R2 |

### Catalog (2)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/catalog/products` | Public product listing (active only, searchable) |

### Inventory (2)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/inventory/movements` | All movements |
| GET | `/api/v1/inventory/movements/{product_id}` | Movements by product |

### Orders (7)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/orders/` | List orders (shopkeeper) |
| POST | `/api/v1/orders/` | Create order (with stock deduction) |
| POST | `/api/v1/orders/bulk` | Place bulk order (customer, with credit check) |
| GET | `/api/v1/orders/my-orders` | Customer's own order history |
| GET | `/api/v1/orders/{id}` | Get order with items |
| PATCH | `/api/v1/orders/{id}/status` | Update order status |

### Invoices (1)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/invoices/generate/{order_id}` | Generate PDF invoice |

### Suppliers (4)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/suppliers/` | List suppliers |
| POST | `/api/v1/suppliers/` | Create supplier |
| PUT | `/api/v1/suppliers/{id}` | Update supplier |
| DELETE | `/api/v1/suppliers/{id}` | Delete supplier |

### Purchase Orders (3)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/purchase-orders/` | List POs |
| POST | `/api/v1/purchase-orders/` | Create PO with items |
| PATCH | `/api/v1/purchase-orders/{id}/status` | Update PO status |

### Customers (4)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/customers/` | List customers |
| POST | `/api/v1/customers/` | Create customer |
| PUT | `/api/v1/customers/{id}` | Update customer |
| DELETE | `/api/v1/customers/{id}` | Delete customer |

### Reports (3)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/reports/customers/top` | Top customers by spend |
| GET | `/api/v1/reports/customers/repeat-purchases` | Repeat purchase customers |
| GET | `/api/v1/reports/customers/clv` | Customer lifetime value |

### Forecasting (1)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/forecasting/demand/{product_id}` | ML demand prediction |

### QR Codes (2)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/qrcodes/product/{product_id}` | Generate QR PNG |
| GET | `/api/v1/qrcodes/batch` | Batch QR label sheet (comma-separated ids) |

### Stores (4)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/stores/` | List stores |
| POST | `/api/v1/stores/` | Create store |
| PUT | `/api/v1/stores/{id}` | Update store |
| DELETE | `/api/v1/stores/{id}` | Delete store |

### Expiry (1)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/expiry/upcoming` | Upcoming expiry alerts (90/60/30 day windows) |

### Notifications (2)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/notifications/` | List notifications |
| PATCH | `/api/v1/notifications/{id}/read` | Mark notification as read |

### Data Management (7)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/data/export/products` | Export products as Excel |
| GET | `/api/v1/data/export/orders` | Export orders as Excel |
| POST | `/api/v1/data/import/products` | Import products from Excel/CSV |
| GET | `/api/v1/data/backup/export` | Full DB export as JSON |
| POST | `/api/v1/data/backup/import` | Restore from JSON backup |
| POST | `/api/v1/data/backup/export-r2` | Export backup to Cloudflare R2 |
| POST | `/api/v1/data/backup/restore-r2` | Restore backup from R2 |

### Audit (1)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/audit/logs` | Audit log list |

### Other (2)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| WS | `/ws` | Socket.IO real-time |

---

## Frontend Routes (24)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Redirects to dashboard/login |
| `/login` | Login | Credentials sign-in |
| `/register` | Register | Shopkeeper sign-up |
| `/dashboard` | Dashboard | Metric cards + stats |
| `/catalog` | Catalog | Customer-facing product browsing + cart |
| `/my-orders` | My Orders | Customer's order history |
| `/inventory` | Inventory | Product CRUD table + image upload |
| `/inventory/movements` | Movements | Stock movement history |
| `/qr-labels` | QR Labels | Batch QR label printing |
| `/stores` | Stores | Store management (multi-outlet) |
| `/billing` | Billing | QR billing + cart |
| `/orders` | Orders | Order management |
| `/suppliers` | Suppliers | Supplier CRUD |
| `/purchase-orders` | Purchase Orders | PO management |
| `/customers` | Customers | B2B customer CRUD |
| `/forecasting` | Forecasting | AI demand predictions |
| `/reports` | Reports | Sales/inventory/product/customer charts |
| `/notifications` | Notifications | Alert center |
| `/admin/users` | Admin Users | User management (admin only) |
| `/settings` | Settings | Profile + export |
| `/suppliers/price-analysis` | Price Analysis | Supplier margin analysis |
| `/api/auth/[...nextauth]` | API | Auth.js handler |
| `/api/revalidate` | API | Revalidation endpoint |
| `/_not-found` | 404 | Not found page |

---

## ML Model Details

| Metric | Value |
|--------|-------|
| **Algorithm** | Random Forest Regressor |
| **Trees** | 100 |
| **Max Depth** | 10 |
| **Training Samples** | 2,000 (synthetic) |
| **R² Score** | 0.862 |
| **MAE** | 6.94 units |
| **Features** | quantity_sold_7d, quantity_sold_30d, category_encoded, day_of_week, month, is_weekend, is_holiday |
| **File** | `backend/app/ml/model.pkl` |

---

## Environment Variables

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=khatabox-dev-secret-change-in-prod
AUTH_URL=http://localhost:3000
```

### Backend (`.env`)
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/khatabox
SECRET_KEY=change-me-to-a-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=
POSTHOG_API_KEY=
POSTHOG_HOST=https://us.i.posthog.com
SENTRY_DSN=
CORS_ORIGINS=http://localhost:3000
R2_ENDPOINT_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=khatabox
R2_PUBLIC_URL=
```

---

## Deployment Status

| Component | Target | Status |
|-----------|--------|--------|
| Frontend | Vercel | Not deployed |
| Backend | Railway (Docker) | Not deployed |
| Database | Neon PostgreSQL | Not configured |
| Cache | Upstash Redis | Not configured |
| File Storage | Cloudflare R2 | Code ready |
| Dockerfile | ✅ Ready | `backend/Dockerfile` |

To deploy:
1. Set up Neon PostgreSQL and run `alembic upgrade head`
2. Run seed script: `cd backend && python seed.py`
3. Set up Upstash Redis
4. Configure Cloudflare R2, Resend, Sentry, PostHog env vars
5. Deploy backend: `railway up`
6. Deploy frontend: `vercel --prod`

---

## Known Bugs & Issues

1. **Auth token on client**: Client-side `access_token` is stored in the NextAuth JWT session — ensure `AUTH_SECRET` is strong in production.
2. **CORS**: Backend CORS is set to `http://localhost:3000` — must be updated for production domain.
3. **Synthetic ML model**: Trained on generated data. Needs real historical sales data for production accuracy.
4. **Rate limiter is in-memory**: Resets on server restart — upgrade to Redis for multi-process production.
7. **pytest-asyncio on Windows**: Event loop lifecycle issues — tests work on Linux/macOS.
8. **bcrypt version**: `bcrypt==4.0.1` is pinned to avoid `AttributeError: module 'bcrypt' has no attribute '__about__'` with passlib.
9. **scikit-learn 1.9.0**: Pinned for model.pkl compatibility.
10. **Port 8000 broken** on dev machine; use 8001+.
11. **Seed script is idempotent** — DELETES + recreates all data each run.
12. **Socket.IO** uses in-memory adapter — requires Redis for multi-process production.
13. **Bulk order customer resolution**: Matches `Customer.email` to `User.email` — requires customer user accounts to have matching emails.
