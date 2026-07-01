# KhataBox — Interview Guide

Comprehensive guide for presenting and discussing the KhataBox project in technical interviews. Covers architecture, design decisions, challenges, and expected questions.

---

## Table of Contents

- [Elevator Pitch](#elevator-pitch)
- [Architecture Explanation](#architecture-explanation)
- [Tech Stack Justification](#tech-stack-justification)
- [Database Design](#database-design)
- [Authentication Flow](#authentication-flow)
- [API Request Lifecycle](#api-request-lifecycle)
- [ML Explanation](#ml-explanation)
- [Scalability](#scalability)
- [Security](#security)
- [Challenges Faced](#challenges-faced)
- [Tradeoffs](#tradeoffs)
- [Future Improvements](#future-improvements)
- [Expected Interview Questions](#expected-interview-questions)
- [Follow-up Questions](#follow-up-questions)
- [How to Demo](#how-to-demo)
- [5-Minute Presentation Script](#5-minute-presentation-script)
- [10-Minute Presentation Script](#10-minute-presentation-script)

---

## Elevator Pitch

"KhataBox is a B2B retail management platform for Indian small-to-medium businesses. It lets shopkeepers manage inventory, customers, orders, and suppliers from a single dashboard. Customers can browse a product catalog, scan QR codes on products, and place orders. The tech stack is a Next.js frontend with a FastAPI Python backend, PostgreSQL database, and Redis for caching. Machine learning forecasts product demand to help shopkeepers make data-driven restocking decisions. We have 35 passing API tests and 20 frontend routes deployed on Railway and Vercel."

---

## Architecture Explanation

### High-Level Architecture

```
Browser → Next.js (Vercel) → HTTP/JSON → FastAPI (Railway) → SQLAlchemy → PostgreSQL
                                          ↕
                                      Redis (Cache/Queue)
                                          ↕
                                    Socket.IO (Real-time)
```

**Frontend (Next.js 16 App Router):**
- 22 pages across public routes (catalog, login, register) and protected dashboard routes.
- Authentication via NextAuth v5 with credentials provider.
- State management with Zustand (cart, active store).
- API calls via a custom `client-api.ts` helper that attaches JWT Bearer tokens.
- Route protection via `RoleGuard` component (client-side) and `requireAuth()` (server-side).
- Responsive design: sidebar nav on desktop, bottom nav on mobile.
- Charts rendered with Recharts.

**Backend (FastAPI):**
- 19 route handlers organized by domain (products, orders, suppliers, etc.).
- Service layer separates business logic from HTTP handling.
- SQLAlchemy 2.0 async with PostgreSQL for database access.
- Pydantic v2 schemas for request validation and response serialization.
- Rate limiter (100 req/min) with Redis + in-memory fallback.
- Sentry for error tracking, PostHog for analytics.
- Socket.IO server for real-time notifications.

### Auth Flow

1. User submits credentials on `/login`.
2. NextAuth's `authorize` callback calls `POST /api/v1/auth/login` on the backend.
3. Backend verifies password via bcrypt, returns JWT access token + refresh token.
4. NextAuth stores tokens in an encrypted JWT session cookie.
5. Frontend API calls read the token from NextAuth session and attach it as `Authorization: Bearer <token>`.
6. Backend middleware (`get_current_user`) decodes and validates the token on every request.
7. `require_role()` enforces role-based access (admin, shopkeeper, customer).

### Data Flow (Example: Create Order)

1. Shopkeeper fills order form on `/orders` page.
2. `client-api.ts` sends `POST /api/v1/orders/` with Bearer token.
3. FastAPI router receives request, validates body via Pydantic schema.
4. `get_current_user()` dependency extracts user from JWT.
5. Route handler calls service layer (or processes inline) to create order.
6. SQLAlchemy async session inserts Order + OrderItem records, decrements product stock.
7. Pydantic `OrderResponse` validates and serializes the result.
8. JSON response returned to frontend.
9. Frontend updates UI state (order list, stock display).

---

## Tech Stack Justification

| Technology | Why |
|------------|-----|
| **Next.js 16** | Server Components enable SEO for public catalog pages. App Router provides nested layouts and route groups. Built-in API routes for NextAuth. |
| **React 19** | Latest stable React with improved concurrent features and server component support. |
| **Tailwind CSS v4** | CSS-first configuration (no `tailwind.config.js`). Utility-first approach speeds up UI development. OKLCH color space for consistent theming. |
| **Shadcn UI** | Copy-paste component library built on `@base-ui/react`. Full control over styling and behavior, no dependency lock-in. |
| **Zustand** | Minimal boilerplate compared to Redux. Perfect for cart state and active store selection. Persisted store with localStorage. |
| **TanStack Query** | Provides caching, background refetch, and query key factory. Installed as infrastructure for future use. |
| **FastAPI** | Native async support, automatic OpenAPI docs, Pydantic integration for validation. Python ecosystem for ML integration. |
| **SQLAlchemy 2.0 async** | Mature ORM with async support via `asyncpg`. Concrete table inheritance, `selectinload` for eager loading. |
| **Pydantic v2** | Fast, Rust-based validation engine. Used for both API schemas and settings management (`BaseSettings`). |
| **PostgreSQL 16** | ACID compliance, full-text search via `tsvector`/GIN indexes, JSON support, excellent async driver support. |
| **Redis 7** | In-memory caching for dashboard queries, rate limiter backend, simple task queue, Socket.IO message broker. |
| **scikit-learn** | Lightweight ML library sufficient for tabular demand forecasting data. No GPU required. |
| **Docker** | Consistent local development environment for PostgreSQL and Redis. |
| **Railway + Vercel** | Railway provides Docker-based deployment for the backend with health checks. Vercel is optimized for Next.js with zero-config deployment. |

---

## Database Design

### Entity-Relationship Summary

```
users ──has_many── stores (via store_id)
stores ──has_many── products
products ──has_many── order_items
orders ──has_many── order_items
orders ──has_one── invoice
customers ──belongs_to── users (via owner_id)
customers ──has_many── orders
suppliers ──has_many── purchase_orders
purchase_orders ──has_many── purchase_order_items
products ──has_many── inventory_movements
stores ──has_many── inventory_movements
products ──has_many── notifications (via low-stock alerts)
```

### 14 Tables

| Table | Key Columns |
|-------|-------------|
| `users` | id, email, password (hashed), role (admin/shopkeeper/customer), store_id, active |
| `stores` | id, name, address, active |
| `products` | id, name, sku, category, brand, cost_price, selling_price, stock_quantity, store_id, is_active, batch_number, mfg_date, expiry_date, search_vector, image_url |
| `suppliers` | id, name, contact_person, email, phone |
| `customers` | id, name, email, phone, credit_limit, credit_used, gst_number, price_tier, owner_id |
| `orders` | id, customer_id, store_id, total_amount, status, payment_method, discount, gst_amount |
| `order_items` | id, order_id, product_id, product_name, quantity, unit_price |
| `invoices` | id, order_id, invoice_number, total_amount, generated_at |
| `purchase_orders` | id, supplier_id, store_id, status, total_amount, ordered_at |
| `purchase_order_items` | id, purchase_order_id, product_id, quantity, unit_price |
| `inventory_movements` | id, product_id, store_id, quantity_change, movement_type, reference_id |
| `stock_transfers` | id, from_store_id, to_store_id, status, transferred_at, approved_at |
| `notifications` | id, user_id, type, title, message, is_read |
| `audit_logs` | id, user_id, entity, entity_id, action, details, timestamp |

### Why PostgreSQL

- **ACID compliance** ensures inventory deductions and order creation are atomic.
- **Full-text search** with `tsvector` and GIN indexes enables product search without Elasticsearch.
- **JSON support** for flexible audit log details.
- **Async driver** (`asyncpg`) works seamlessly with FastAPI's async endpoints.

### Why SQLAlchemy Async

- Prevents blocking the event loop during database queries.
- Enables concurrent query execution with `asyncio.gather()` (used in dashboard stats).
- Compatible with FastAPI's dependency injection system via `AsyncSession` generator.

---

## Authentication Flow

### Login Flow

```
Frontend (Browser)                     Backend (FastAPI)
      │                                      │
      │  POST /api/v1/auth/login             │
      │  { email, password }                  │
      │─────────────────────────────────────>│
      │                                      │
      │                              verify_password(bcrypt)
      │                              create_access_token({sub: user_id})
      │                              create_refresh_token({sub: user_id})
      │                                      │
      │  { access_token, refresh_token,       │
      │    user: { id, email, role, name } }  │
      │<─────────────────────────────────────│
      │                                      │
```

### Session Management (NextAuth)

```
Browser Request → NextAuth middleware → Read JWT session cookie
                                         ↓
                              Decrypt via AUTH_SECRET
                                         ↓
                              Extract user + access_token
                                         ↓
                           Forward to page component via useSession()
```

- NextAuth stores the JWT access token in an encrypted session cookie.
- On every client-side API call, `client-api.ts` reads `useSession().data.access_token`.
- The token is sent as `Authorization: Bearer <token>`.

### Role-Based Access

| Layer | Mechanism |
|-------|-----------|
| Server-side | `requireAuth(roles)` in `auth-guard.ts` redirects unauthorized users |
| Client-side | `RoleGuard` component with `useRole` hook conditionally renders UI |
| API | `require_role("admin", "shopkeeper")` dependency returns 403 if unauthorized |
| Nav | Sidebar filters navigation items based on user role |

---

## API Request Lifecycle

```
1. Browser Action
   └─ User clicks "Create Order" button

2. Frontend (client-api.ts)
   └─ Constructs POST request with JSON body
   └─ Reads access_token from NextAuth session
   └─ Sets header: Authorization: Bearer <token>

3. FastAPI Middleware Stack
   └─ CORS middleware → validates Origin header
   └─ Rate limiter middleware → checks Redis/ in-memory counter
   └─ Performance middleware → starts timer

4. Route Handler (api/v1/orders.py)
   └─ Dependencies resolved:
       ├─ get_db() → yields AsyncSession
       └─ get_current_user() → decodes JWT, queries User
   └─ Pydantic validates request body (OrderCreate schema)

5. Business Logic (services/ or inline)
   └─ Validate product stock availability
   └─ Create Order record
   └─ Create OrderItem records
   └─ Decrement product stock_quantity
   └─ Calculate totals (discount, GST)

6. Database (SQLAlchemy + PostgreSQL)
   └─ INSERT INTO orders ...
   └─ INSERT INTO order_items ...
   └─ UPDATE products SET stock_quantity = ...
   └─ db.commit()

7. Response
   └─ Pydantic serializes OrderResponse
   └─ Performance middleware adds X-Response-Time header
   └─ JSON response returned to frontend

8. Frontend Update
   └─ React state updates order list
   └─ Toast notification "Order created successfully"
   └─ Inventory count updates in sidebar
```

---

## ML Explanation

### What It Predicts

The ML module predicts **future product demand** (units to be sold) to help shopkeepers decide how much stock to reorder.

### Input Features

| Feature | Description | Example |
|---------|-------------|---------|
| `product_id` | Numeric product identifier | 42 |
| `day_of_week` | Day of week (0=Monday, 6=Sunday) | 5 (Saturday) |
| `month` | Month (1-12) | 12 (December) |
| `is_holiday` | Whether the day is a holiday/weekend | 1 |
| `category` | Product category (label encoded) | "electronics" → 0 |

### Output

| Field | Description |
|-------|-------------|
| `predicted_demand` | Expected units to be sold |
| `recommended_order_qty` | `predicted_demand - current_stock` (clamped to 0) |
| `confidence_score` | Based on standard deviation across trees (0-98) |
| `seasonality_factor` | Multiplier accounting for holiday/weekend/month effects |

### Model Architecture

- **Algorithm**: `RandomForestRegressor` (100 trees, max depth 10).
- **Training data**: 2,000 synthetically generated samples.
- **Features**: product_id, day_of_week, month, is_holiday, category_encoded.
- **Performance**: R2 ~0.85, MAE ~8 units on synthetic test data.

### Retraining Strategy

Currently manual: run `python train.py` to regenerate the model. The pipeline:

1. Generate synthetic training data from known patterns (category base quantities, holiday uplifts, day-of-week effects).
2. Split into train/test (80/20).
3. Train `RandomForestRegressor`.
4. Serialize model + label encoder + feature column names to `model.pkl`.
5. The `predict_demand()` function loads the model on first call and caches it in memory.

For production, retraining should be scheduled (e.g., monthly cron job) once sufficient real transaction data is accumulated.

---

## Scalability

### Current Architecture

- **Stateless backend**: FastAPI is stateless. JWT tokens contain all session data. Horizontal scaling requires only adding Railway replicas.
- **Async everywhere**: SQLAlchemy async + FastAPI async handlers prevent blocking during I/O.
- **Redis caching**: Dashboard stats are cached with TTL. Cache invalidated on data changes.
- **Graceful degradation**: All external services (Redis, R2, Sentry, PostHog, Resend) have `is_available()` checks.

### Horizontal Scaling

- **Backend**: Railway supports `numReplicas` in `railway.json`. Multiple replicas behind Railway's load balancer.
- **Rate limiter**: Currently per-instance for in-memory fallback. Redis-backed mode is shared across replicas.
- **Database**: Neon PostgreSQL supports read replicas. Connection pooling via PgBouncer.

### Caching Strategy

- **Dashboard stats**: Cached in Redis with 5-minute TTL. Invalidate on order/product changes.
- **Product catalog**: Intended for Redis caching (not yet implemented for all endpoints).
- **Session data**: Stored in encrypted NextAuth JWT cookie — no server-side session storage.

### Bottlenecks

- Database queries are the primary bottleneck. All 14 tables live on a single PostgreSQL instance.
- ML inference runs in-process — no dedicated ML serving infrastructure.
- File uploads go directly to R2 but pass through the backend for access control.

---

## Security

| Feature | Implementation |
|---------|---------------|
| **Password hashing** | bcrypt via `passlib` with `CryptContext` |
| **JWT tokens** | `python-jose` with HS256 algorithm; access token 30 min, refresh token 7 days |
| **Role-based access** | `require_role()` FastAPI dependency with 403 on insufficient permissions |
| **Input validation** | Pydantic v2 schemas on every endpoint; Zod schemas on frontend (planned) |
| **SQL injection** | Prevented by SQLAlchemy ORM parameterized queries |
| **CORS** | Configurable via `CORS_ORIGINS` env var (comma-separated) |
| **Rate limiting** | 100 requests per minute per IP (Redis + in-memory fallback) |
| **Audit logging** | All entity changes logged to `audit_logs` table |
| **Secret management** | All secrets in environment variables (`SECRET_KEY`, `DATABASE_URL`, etc.) |
| **HTTPS** | Enforced by Railway and Vercel at the edge |
| **Sentry PII** | `send_default_pii=False` — no personally identifiable information sent to Sentry |
| **Session management** | NextAuth encrypted JWT cookie; no server-side session store |

---

## Challenges Faced

### 1. SQLAlchemy Async with FastAPI

**Problem**: Lazy loading of relationships (`items` on `Order`) in async context caused `MissingGreenlet` errors. When calling `db.refresh(order)`, accessing `order.items` triggered a sync lazy load, which failed in an async session because no greenlet was available.

**Solution**: Changed `db.refresh(order)` to `db.refresh(order, ["items"])` to eagerly load the relationship. Also used `selectinload()` in queries where relationship data was needed.

**Code**: `backend/app/api/v1/orders.py:82,153,187`

### 2. Multi-Tenant Data Isolation

**Problem**: Shopkeepers should only see their own data. Customer data is scoped by `owner_id` (the shopkeeper who owns the customer relationship). Products are tied to `store_id`. Ensuring every query respects these scoping rules required discipline.

**Solution**: Consistent use of `get_current_user()` in dependencies, then filtering queries by `user.store_id` or `customer.owner_id`. Customer dashboard stats are scoped to the customer's owner shopkeeper.

### 3. Inventory Reservation Consistency

**Problem**: When an order is created, product stock must be decremented atomically with order creation. Concurrent orders for the same product could lead to overselling.

**Solution**: Order creation and stock decrement happen in the same database transaction. The `expire_on_commit=False` setting on the SQLAlchemy session prevents premature detachment. Future improvement would add `SELECT ... FOR UPDATE` row-level locking.

### 4. QR Code Generation at Scale

**Problem**: Generating QR codes for batch printing (e.g., 300 products) required rendering individual QR images and composing them into a printable layout.

**Solution**: Used `qrcode` library for individual PNG generation. For batch labels, rendered a 3x6 grid layout on the frontend using a dedicated `/qr-labels` page with CSS grid and `react-to-print` for the print functionality.

### 5. Real-time Notifications

**Problem**: Socket.IO server needed to be co-located with the FastAPI backend but mounted on a separate path (`/ws`). Managing WebSocket connections and broadcasting events required careful lifecycle management.

**Solution**: Mounted the Socket.IO ASGI app at `/ws` in `main.py:48`. The `socketio_manager.py` service handles connection/disconnection events and room subscriptions based on user ID.

### 6. ML Model Retraining

**Problem**: Without real historical data, the ML model had to be trained on synthetic data. The training pipeline needed to be reproducible and the model portable.

**Solution**: Created a `train.py` script that generates synthetic data with injected patterns (weekend uplift, holiday seasonality, category base rates). Serialized the entire model bundle (model, encoder, feature columns) into a single `model.pkl` file. The `predict_demand()` function loads and caches the model lazily.

---

## Tradeoffs

### Monorepo vs Polyrepo

**Chosen**: Monorepo (frontend + backend in one repository).

**Rationale**: Easier to manage during early development. Single PR can include frontend and backend changes. Consistent issue tracking and CI/CD.

**Cost**: Larger repository size. Frontend and backend have different deployment lifecycles. Requires discipline to avoid coupling.

### REST vs GraphQL

**Chosen**: REST.

**Rationale**: Simpler to implement and debug. Automatic OpenAPI docs with FastAPI. Familiar to all team members. No need for the flexibility of GraphQL given the well-defined data shapes.

**Cost**: Over-fetching and under-fetching in some views (e.g., dashboard needs data from 5+ endpoints). Could benefit from GraphQL's batch querying for the dashboard.

### JWT vs Server Sessions

**Chosen**: JWT (stateless).

**Rationale**: No server-side session storage needed. Works well with horizontal scaling. Simple to implement with NextAuth and FastAPI.

**Cost**: Token revocation is complex (no built-in invalidation). Token size grows with claims. Refresh token rotation adds complexity.

### scikit-learn vs PyTorch

**Chosen**: scikit-learn.

**Rationale**: Sufficient for tabular demand forecasting data. No GPU required. Faster training and inference. Smaller model file size.

**Cost**: Cannot capture sequential patterns or complex temporal dependencies. No support for deep learning architectures (LSTM for time series).

### NextAuth vs Custom Auth

**Chosen**: NextAuth (Auth.js).

**Rationale**: Provides session management, JWT encryption, and provider abstraction out of the box. Server-side session validation with `auth()` helper. Community-standard for Next.js apps.

**Cost**: Still in beta (v5). Limited documentation for edge cases. Configuration is opaque (callbacks, token handling).

---

## Future Improvements

- **Mobile apps** (React Native) for shopkeepers and customers.
- **Advanced ML** with time-series models (Prophet, LSTM) for better demand forecasting.
- **Barcode scanning** using device camera (EAN/UPC support).
- **Payment gateway** integration (Razorpay, Stripe) for online payments.
- **Offline mode** with PWA service worker and local-first data sync.
- **Multi-language** support (Hindi, Marathi, Tamil via i18n).
- **ERP integration** (Tally, Zoho, Busy) for accounting data sync.
- **Automated retraining pipeline** for ML models based on real sales data.
- **Webhook system** for third-party integrations.
- **Role-based dashboard customization** (configurable widgets).
- **Performance optimization** with React Server Components and streaming.

---

## Expected Interview Questions

### Q1: Explain the overall architecture of KhataBox.

*KhataBox is a full-stack web application using a monorepo structure. The frontend is built with Next.js 16 using the App Router, deployed on Vercel. The backend is a FastAPI Python application deployed on Railway. The database is PostgreSQL 16, and Redis handles caching and rate limiting. Communication happens over HTTP/JSON REST APIs. The frontend uses NextAuth v5 for authentication, Zustand for state management, and Tailwind CSS with Shadcn UI for styling. The backend uses SQLAlchemy 2.0 async for database access, Pydantic v2 for validation, and follows a layered architecture of routes, services, and models.*

### Q2: Why did you choose FastAPI over Django or Flask?

*FastAPI was chosen for its native async support, which aligns well with the async nature of our database driver. It provides automatic OpenAPI documentation, integrated Pydantic validation, and dependency injection — all of which reduce boilerplate. The Python ecosystem also allows us to integrate our ML model (scikit-learn) directly in the same application without needing a separate ML serving infrastructure.*

### Q3: How does authentication work in your application?

*We use a two-layer auth system. The backend issues JWT access and refresh tokens via bcrypt-verified login. The frontend uses NextAuth v5 with a credentials provider that calls the backend login endpoint. NextAuth stores the tokens in an encrypted JWT session cookie. On every API call, the frontend reads the access token from the session and sends it as a Bearer token. The backend validates the token on every request via the `get_current_user` dependency. Role-based access is enforced at the API level with `require_role()` and at the UI level with `RoleGuard` components.*

### Q4: How is data isolated between different shopkeepers?

*Data isolation is achieved through `store_id` foreign keys. Every product, order, and customer is associated with a store. The logged-in user's `store_id` is used to filter all queries. Customers are additionally scoped by `owner_id` — the shopkeeper who created them. The dashboard for a shopkeeper only shows data related to their store. The API enforces this through the `get_current_user` dependency, and every query includes a `WHERE store_id = ?` clause derived from the authenticated user.*

### Q5: Explain the ML demand forecasting feature.

*The ML module uses a Random Forest Regressor with 100 trees trained on 2,000 synthetic data points. It predicts product demand based on product ID, day of week, month, holiday status, and category. The output includes a predicted demand quantity, a recommended order quantity (demand minus current stock), a confidence score based on prediction variance across trees, and a seasonality factor. The model is trained offline via a Python script and serialized to a pickle file. At inference time, the model is loaded lazily and cached in memory.*

### Q6: How did you handle the async SQLAlchemy issues?

*The main issue was MissingGreenlet errors when lazy-loading relationships in an async context. SQLAlchemy async requires that all relationship loading be explicit. We fixed this by changing `db.refresh(order)` to `db.refresh(order, ["items"])` to eagerly load the `items` relationship. We also use `selectinload()` in queries to eagerly load relationships that we know will be accessed. This pattern was applied consistently across orders, purchase orders, and any endpoint that returned related data.*

### Q7: What happens if Redis is unavailable?

*The application degrades gracefully. The rate limiter falls back to an in-memory dictionary-based implementation. The cache service returns `None` for all cache reads and silently ignores writes. The task queue becomes a no-op. All these services have `is_available()` checks or try/except blocks that catch connection errors. The application runs without any external dependencies — PostgreSQL is the only hard requirement.*

### Q8: How would you scale this application?

*The backend is stateless, so we can horizontally scale by adding more Railway replicas. The `railway.json` supports `numReplicas` configuration. Redis would need to be centralized (using Upstash) so all instances share cache and rate limit state. The database would need connection pooling (PgBouncer) and potentially read replicas. The frontend is already on Vercel's CDN and scales automatically. For the ML model, we could move inference to a dedicated service if latency becomes an issue.*

### Q9: How do you ensure database consistency during concurrent order creation?

*Currently, order creation and stock decrement happen in the same database transaction, so PostgreSQL's MVCC ensures consistency at the transaction level. For high-concurrency scenarios, we would add `SELECT ... FOR UPDATE` row-level locking on the product row to prevent overselling. This would serialize inventory deductions for the same product.*

### Q10: How did you handle the BulkOrderCreate bug?

*The `BulkOrderCreate` Pydantic schema did not have a `customer_id` field, but the code was trying to access `payload.customer_id`. The customer is identified from the authenticated user's email — we look up the Customer record by matching `Customer.email == current_user.email`. The fix was to change `customer_id=payload.customer_id` to `customer_id=customer.id` where `customer` is the already-resolved Customer object.*

### Q11: Why PostgreSQL full-text search instead of Elasticsearch?

*For the scale of this application (hundreds of products per store), PostgreSQL's `tsvector` with GIN indexes provides adequate full-text search performance. It avoids the operational complexity of running and maintaining a separate Elasticsearch cluster. The search supports weighted columns (name, category, brand, SKU) and ranks results by relevance. If the product catalog grows to millions of items, we would consider Elasticsearch.*

### Q12: How does the seed data generation work?

*The `seed_india.py` script creates a realistic Indian retail dataset with 16 stores across multiple cities, 300 products in 13 categories, 30 suppliers, 100 B2B customers with credit limits, 1,542 orders with 3,684 order items, and 11,531+ total records. It is idempotent — on re-run, it cleans old data before inserting new data. Store names, customer names, product names, and addresses are all India-specific.*

### Q13: Explain the deployment workflow.

*We use Docker Compose for local development (PostgreSQL + Redis). The backend is deployed on Railway, which builds from the Dockerfile and uses the railway.json config for health checks and restart policies. The frontend is deployed on Vercel, which auto-detects Next.js. Environment variables are configured per platform. Database migrations are run via Alembic after deployment. All optional services (Redis, R2, Sentry, PostHog, Resend) degrade gracefully if not configured.*

### Q14: How do you handle file uploads?

*Product images are uploaded via the API to the backend, which proxies them to Cloudflare R2 (S3-compatible object storage). The R2 URL is stored in the `product.image_url` column. If R2 is not configured, the upload returns a placeholder URL. The storage service abstracts the upload/download logic with methods that check `is_available()` before attempting operations.*

### Q15: What testing strategy do you use?

*The backend has 39 integration tests using pytest with a live uvicorn subprocess and a real PostgreSQL database. Tests cover all major CRUD operations, authentication, RBAC, order lifecycle, and edge cases. The frontend has 5 unit tests using Vitest for utility functions and component rendering. There are no end-to-end tests yet — this is a known limitation. Tests are run with `python -m pytest tests/ -v` for the backend and `npm test` for the frontend.*

### Q16: Why did you choose a monorepo structure?

*A monorepo simplifies development coordination — a single feature can ship frontend and backend changes in one commit. It reduces the overhead of managing multiple repositories, CI/CD pipelines, and version matching. We use clear directory separation (`src/` for frontend, `backend/` for backend) to maintain independence. The tradeoff is that frontend and backend have different deployment lifecycles, which requires discipline to avoid deploying half-finished features.*

### Q17: How does your rate limiting work?

*The rate limiter middleware allows 100 requests per minute per IP address. It uses a sliding window approach. If Redis is available, it stores counts in Redis with a 60-second TTL keyed by `ratelimit:{client_ip}:{window}`. If Redis is unavailable, it falls back to an in-memory dictionary that resets on server restart. Certain paths are excluded from rate limiting: `/ws`, `/health`, `/docs`, `/redoc`, `/openapi.json`. When the limit is exceeded, the middleware returns a 429 HTTP response.*

### Q18: How would you add a payment gateway?

*We would create a new payment provider module in the services layer, abstracting the gateway (e.g., Razorpay) behind an interface. The checkout flow would create a pending order, redirect to the payment page, and on callback confirm the order. The order schema already supports a `payment_method` field (cash, card, UPI, credit). We would add a `payment_status` field and integrate webhooks for payment confirmation. The frontend would show a payment processing state and handle success/failure redirects.*

### Q19: How do you manage database migrations?

*We use Alembic with async SQLAlchemy. Migrations are auto-generated from model changes and stored in `backend/alembic/versions/`. There are currently 8 migrations covering initial schema, full-text search, expiry tracking, multi-store support, image URLs, performance indexes, stock transfers, and enum values. We run `alembic upgrade head` during deployment. For rollback, we use `alembic downgrade -1` combined with database backup restoration.*

### Q20: What are the main security measures in place?

*Password hashing with bcrypt, JWT tokens with short expiry (30 min access, 7 day refresh), role-based access control at the API level, Pydantic input validation for injection prevention, CORS restricted to the frontend domain, rate limiting (100 req/min), comprehensive audit logging, and Sentry configured without PII collection. All secrets are stored in environment variables, never in the codebase.*

---

## Follow-up Questions

1. **How would you handle token revocation when a user's role changes?** You could maintain a token blacklist in Redis or use short-lived tokens with a token version stored in the database.

2. **How would you implement a PWA for offline support?** Add a service worker with cache-first strategy for product catalog, IndexedDB for local data storage, and a background sync for orders when connectivity returns.

3. **How would you handle multi-region deployment?** Deploy backend replicas in multiple Railway regions, use a CDN for static assets, and configure database read replicas close to each region.

4. **How would you optimize the dashboard for 100,000+ orders?** Implement server-side pagination, use Redis caching more aggressively, add database query optimization (composite indexes, materialized views for aggregations), and consider a time-series database for historical data.

5. **How would you add webhooks for external integrations?** Create a `webhook_events` table, add webhook URL configuration per store, and implement a retry mechanism with exponential backoff using the task queue.

---

## How to Demo

### Setup

Ensure the application is running with seeded data:

```bash
docker compose up -d
cd backend && alembic upgrade head && python seed_india.py
uvicorn app.main:app --reload --port 8002 &
cd frontend && npm run dev
```

### Demo Walkthrough (5-7 minutes)

**Step 1: Login as Admin (30 seconds)**
- Navigate to http://localhost:3000/login
- Login with `admin@khatabox.com` / `Admin@123`
- Point out the sidebar with full navigation menu

**Step 2: Dashboard Overview (30 seconds)**
- Show metric cards: total inventory value (Rs 56 Lakhs), today's sales, pending orders, low stock items
- Point out the sales chart and recent orders table
- Highlight that 5 low-stock alerts are visible

**Step 3: Browse Products (30 seconds)**
- Navigate to Inventory
- Show the product table with 300 products across 13 categories
- Demonstrate search (type "rice" or "LED")
- Edit a product to show the product form dialog

**Step 4: Create an Order (1 minute)**
- Navigate to Orders
- Create a new order with 2-3 items
- Show that inventory decreases after order creation
- Update order status from pending to confirmed

**Step 5: Generate QR Code (30 seconds)**
- Navigate to QR Labels
- Select a product and generate QR code
- Show the PNG image and batch label grid

**Step 6: Demand Forecast (30 seconds)**
- Navigate to Forecasting
- Select a product and show predicted demand, confidence score, and recommended order quantity
- Explain the ML model briefly

**Step 7: Customer Portal (1 minute)**
- Open an incognito window
- Login as a customer (e.g., `contact.tech.solutions.jorhat@client.com` / `customer123`)
- Show the customer catalog with product grid and cart sidebar
- Add items to cart and place an order
- Show "My Orders" with the newly created order

**Step 8: Switch Store (30 seconds)**
- Back in admin view, use the store selector in the sidebar
- Switch to a different store
- Show that inventory and customers change

**Step 9: Reports (30 seconds)**
- Navigate to Reports
- Show top customers by spending, repeat purchase frequency, customer lifetime value

**Step 10: Stock Transfer (30 seconds)**
- Navigate to Transfers
- Create a transfer from one store to another
- Approve the transfer

---

## 5-Minute Presentation Script

**Opening (30 seconds):**
"Hi, I built KhataBox — a B2B retail management platform for Indian small businesses. It helps shopkeepers manage inventory, orders, customers, and suppliers from one dashboard, and lets B2B customers browse products and place orders online."

**Architecture (1 minute):**
"The architecture is a monorepo with a Next.js frontend deployed on Vercel and a FastAPI Python backend on Railway. Data is stored in PostgreSQL 16 with Redis for caching. Communication is over REST APIs with JWT authentication. The backend uses SQLAlchemy async for non-blocking database access, and the frontend uses Zustand for state management with Tailwind CSS for styling."

**Key Features (1.5 minutes):**
"Key features include multi-store inventory management with stock transfers between stores, B2B customer management with credit limits and GST tracking, a complete order lifecycle from creation to delivery, QR code generation for product labeling, and a demand forecasting module using a Random Forest ML model that predicts future sales to help shopkeepers reorder optimally."

**Technical Challenges (1 minute):**
"The main challenge was SQLAlchemy async — lazy loading relationships caused MissingGreenlet errors that required explicit eager loading with `db.refresh(order, ['items'])`. We also handled multi-tenant data isolation by scoping all queries to the authenticated user's store. The ML model is trained on synthetic data since we don't have real historical data yet."

**Results & Demo (1 minute):**
"The project has 35 passing API endpoint tests, 20 frontend routes serving 200 responses, and 14 database tables with over 11,000 seeded records. A full demo takes about 5 minutes — I can show login, dashboard, product management, order creation, QR generation, demand forecasting, and the customer portal in that time."

---

## 10-Minute Presentation Script

**Opening (30 seconds):**
"Hi, I built KhataBox — a full-stack B2B retail management platform designed for Indian small-to-medium businesses. In this presentation, I'll walk through the problem, architecture, key features, technical challenges, and a live demo."

**Problem Statement (30 seconds):**
"Small retailers in India often manage inventory on paper or in spreadsheets. They lose track of stock, miss reorder points, and have no data on customer buying patterns. B2B customers can't browse products or place orders digitally. KhataBox solves this with a unified platform."

**Tech Stack & Why (1.5 minutes):**
"Frontend: Next.js 16 for server-side rendering and SEO, React 19 for the component model, Tailwind CSS v4 for rapid styling, Shadcn UI for accessible components, and Zustand for state management. Backend: FastAPI for native async support and automatic OpenAPI docs, SQLAlchemy 2.0 async with PostgreSQL for production-grade data persistence, and scikit-learn for ML. Infrastructure: Docker for local PG and Redis, Railway for backend hosting, Vercel for frontend. All external services like Redis, Sentry, and PostHog degrade gracefully."

**Architecture Deep Dive (2 minutes):**
"Let me walk through a request lifecycle. When a user creates an order, the frontend sends a POST request with a JWT Bearer token to the FastAPI backend. The request passes through CORS, rate limiter, and performance middleware. The route handler resolves dependencies — the database session and the current user from the JWT. Business logic creates Order and OrderItem records, decrements product stock, and commits the transaction. The response is validated by Pydantic and returned to the frontend, which updates the UI. This request completes in under 50ms on a local setup."

**Key Features (2 minutes):**
"KhataBox has 16 major feature areas. Multi-store management lets a chain owner manage all stores from one account with stock transfers between them. The B2B customer module tracks credit limits, GST numbers, and price tiers. The order lifecycle supports pending, confirmed, processing, shipped, delivered, and cancelled statuses with audit logging. The ML forecasting module uses a Random Forest with 100 trees to predict product demand based on historical patterns, day of week, month, and holiday effects. QR code generation creates per-product labels that customers can scan to view product details. Real-time notifications via Socket.IO alert shopkeepers to low stock and expiring products."

**Technical Challenges (2 minutes):**
"Three major challenges stand out. First, SQLAlchemy async: lazy loading relationships in an async context causes MissingGreenlet errors. We fixed these by explicitly eager-loading relationships with `db.refresh(order, ['items'])` and using `selectinload()` in queries. This was the root cause of 500 errors in order creation that we diagnosed and fixed. Second, multi-tenant data isolation: every query must be scoped to the authenticated user's store. We solved this by consistently filtering by `store_id` derived from the user record. Third, inventory consistency: when two orders for the same product arrive concurrently, we need to prevent overselling. Currently handled by PostgreSQL transactions; future work would add row-level locking."

**ML Module (1 minute):**
"The ML module predicts product demand to help shopkeepers reorder optimally. The model is a Random Forest Regressor with 100 trees and max depth of 10, trained on 2,000 synthetic data points. Features include product ID, day of week, month, holiday status, and category. Output includes predicted demand, recommended order quantity (demand minus current stock), confidence score based on prediction variance, and a seasonality factor. The model is serialized to a pickle file and loaded lazily at inference time. Retraining is currently manual but would be automated with real sales data."

**Demo (1.5 minutes):**
"Let me show a quick demo. I'll login as admin, view the dashboard with Rs 56 Lakhs in inventory value, create a product, generate its QR code, then switch to a customer account to browse the catalog, add items to cart, and place an order. Back in the admin view, I'll show the demand forecast for a product and a stock transfer between stores."

**Conclusion (30 seconds):**
"KhataBox is fully functional with 35 passing API tests, 20 frontend routes, and 11,000+ seeded records. The codebase is production-ready with proper error handling, graceful degradation, and comprehensive documentation. Thank you — I'm happy to answer any questions."
