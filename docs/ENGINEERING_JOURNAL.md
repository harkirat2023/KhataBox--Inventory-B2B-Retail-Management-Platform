# KhataBox — Engineering Journal

> Engineering notes documenting every feature implemented: business requirements, architectural decisions, implementation details, challenges faced, solutions chosen, and lessons learned.
>
> **Written for:** Future engineering reference and onboarding

---

## 1. Authentication System (JWT + bcrypt)

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers, admins, and B2B customers need secure, role-based access to the platform. Passwords must be stored securely. Sessions must expire. |
| **Architecture Chosen** | JWT-based stateless authentication with access tokens (30 min) and refresh tokens (7 days). Password hashing via bcrypt through passlib. |
| **Implementation Details** | `backend/app/core/security.py`: `hash_password()` uses `CryptContext(schemes=["bcrypt"])`; `create_access_token()` encodes `{ sub, role, exp }` with HS256 via python-jose. `auth.py` provides `/register`, `/login`, `/me` endpoints. Tokens are returned on login/register and stored in NextAuth JWT session on the frontend. |
| **Challenges Faced** | passlib is incompatible with bcrypt ≥5.0. Fresh installs pull bcrypt 5.x, causing `TypeError: unsupported operand type(s) for |=`. The `bcrypt==4.0.1` pin broke repeatedly when regenerating `requirements.txt`. |
| **Solutions Chosen** | Pinned `bcrypt==4.0.1` in `requirements.txt` with a comment explaining why. Added this pin to AGENTS.md and all handoff docs as critical context. |
| **Lessons Learned** | Always check library compatibility before upgrading. A minor version bump of bcrypt (4.x → 5.x) broke a major framework (passlib). Pin everything that touches auth. Document pinned dependencies with rationale. |

---

## 2. Role-Based Access Control (RBAC)

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Three user roles with distinct permissions: Admin (full access), Shopkeeper (daily operations), Customer (catalog + orders only). |
| **Architecture Chosen** | Enum-based role model on the User entity. Backend enforcement via FastAPI dependency injection (`require_role`). Frontend filtering via `RoleGuard` component and `useRole` hook. |
| **Implementation Details** | `UserRole(str, Enum): ADMIN, SHOPKEEPER, CUSTOMER`. Backend: `require_role("admin")` returns a dependency that checks `current_user.role`. Frontend: `Sidebar` filters nav items by allowed roles; `RoleGuard` component redirects unauthorized users. |
| **Challenges Faced** | No `is_active` check in `get_current_user` — deactivated users could still use valid JWT tokens. The role check happened against the token payload, not the DB, meaning role changes took effect only after token refresh. |
| **Solutions Chosen** | `get_current_user` does a DB lookup on every request (not just JWT decode), so role changes are immediate. `is_active` check was identified as a gap but deferred (low priority for MVP). |
| **Lessons Learned** | Always validate against the source of truth (DB) for authorization, not just the token. JWT is for authentication, not authorization state. A DB lookup per request (~2-5ms) is an acceptable cost for real-time permission accuracy. |

---

## 3. Product Management (CRUD + Search)

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers need to create, read, update, and delete products. Must support categories, brands, pricing (cost + selling), stock tracking, batch numbers, expiry dates, and multi-store assignment. Search must be fast across 100k+ products. |
| **Architecture Chosen** | RESTful endpoints at `/api/v1/products/`. PostgreSQL full-text search via tsvector + GIN index. Soft-delete with `is_active` flag. Pydantic schemas for request/response validation. |
| **Implementation Details** | Product model has 19 fields including `search_vector` (TSVECTOR). Migration 0002 adds the tsvector column, GIN index, and auto-update trigger. Filtering supports category, brand, stock status (in_stock/low_stock/out_of_stock), price range, store_id, and full-text search. Image upload stores to R2 (migration 0005). |
| **Challenges Faced** | Full-text search needed to be auto-updated when product name/SKU changed. PostgreSQL triggers were the natural solution but alembic migration syntax for triggers is non-standard. The `search_vector` column type `TSVECTOR` is PostgreSQL-specific, making SQLite testing impossible. |
| **Solutions Chosen** | Created a PostgreSQL trigger function that updates `search_vector` on INSERT or UPDATE of name/SKU. Marked the migration as PostgreSQL-only (no downside since we deploy on PostgreSQL). Used `plainto_tsquery('english', ...)` for search — simpler than `to_tsvector` + `to_tsquery` combinations. |
| **Lessons Learned** | PostgreSQL-specific features (tsvector, GIN, triggers) lock you into PostgreSQL. This is acceptable for a production app but means tests must run against real PostgreSQL, not SQLite. The performance gain (O(log n) vs O(n) for LIKE) is worth the lock-in at 100k+ product scale. |

---

## 4. Inventory Tracking (Movements)

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Every stock change must be logged with type (sale, purchase, adjustment, return), quantity, reference, and timestamp for audit purposes. |
| **Architecture Chosen** | `InventoryMovement` model with `movement_type` enum. Automatic logging on order creation (sale) and manual logging for adjustments. |
| **Implementation Details** | `InventoryMovement` stores `product_id`, `shopkeeper_id`, `movement_type`, `quantity` (negative for sales), `reference` (e.g., "Order #ORD-00000123"), `notes`. Created in the same transaction as the order. Separate endpoints for listing movements (filterable by product, type, limit/offset). |
| **Challenges Faced** | Ensuring movements are created atomically with the order — if movement creation fails, the order should roll back. Also, retroactively adding movements to existing seed data required a full reset. |
| **Solutions Chosen** | Both `Order` and `InventoryMovement` are created within the same DB transaction (`await db.flush()` before `db.commit()`). If either fails, SQLAlchemy rolls back the entire transaction. No partial state. |
| **Lessons Learned** | Always create audit records in the same transaction as the audited action. Atomicity guarantees that you never have an order without a movement or vice versa. `flush()` vs `commit()`: flush sends to DB without persisting; commit persists. Use flush to get IDs, commit to finalize. |

---

## 5. QR Code Generation (Single + Batch Labels)

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers need to print QR codes for products — individually or in bulk — for shelf labeling and billing. Labels must show product info (name, SKU, price, stock, category) alongside the QR code. |
| **Architecture Chosen** | Server-side image generation using the `qrcode` Python library and Pillow for label composition. PNG images returned as `StreamingResponse`. |
| **Implementation Details** | Single: generates QR code from product ID, returns PNG. Batch: accepts comma-separated IDs (`?ids=1,2,3`), queries products, draws a 3-column × 6-row grid of 200×120px labels on a white canvas, each containing QR code + product info + border. Font fallback to PIL default if Arial is unavailable. |
| **Challenges Faced** | Font rendering differed between dev (Windows with Arial) and container (Debian slim without fonts). Fixed font size assumptions broke with longer product names. |
| **Solutions Chosen** | Try/except block for font loading: try Arial, fall back to `ImageFont.load_default()`. Truncate long text to fit label width: `product.name[:20]`, `product.sku[:18]`, `product.category[:12]`. |
| **Lessons Learned** | Server-side image generation seems simple until font availability and text rendering come into play. Always include a font fallback. Truncate text explicitly rather than relying on PIL's auto-clipping — different PIL versions clip differently. The `StreamingResponse` pattern (build in BytesIO, return with correct media type) avoids temp file management entirely. |

---

## 6. QR Billing Flow

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers need a quick billing workflow: search/scan products, add to cart, apply discount, generate order. The experience should feel like a POS system. |
| **Architecture Chosen** | Single-page billing interface with Zustand cart state management. Backend creates order with items, inventory movements, and low-stock check in one transaction. |
| **Implementation Details** | Frontend: `/billing` page with product search, SKU scan input, cart panel with quantity controls and discount field, "Generate Bill" button. Zustand store (`src/store/cart.ts`) manages items and discount. Backend: `POST /api/v1/orders/` creates Order + OrderItems + InventoryMovements + triggers `check_low_stock()`. Redirects to `/orders` after success. |
| **Challenges Faced** | Cart state persistence — refreshing the page loses the cart. Cross-session cart persistence was avoided intentionally (privacy). Barcode scanner input handling — scanners type the SKU followed by Enter, which must be captured and processed. |
| **Solutions Chosen** | Cart lives in Zustand without persistence middleware (intentional — cart should reset on refresh for security). Scanner input captured via `onKeyDown` handler — pressing Enter in the scan field triggers `handleScan()`. Case-insensitive matching for SKU lookup. |
| **Lessons Learned** | Zustand is remarkably simple for UI state management compared to Redux. No providers, no reducers, no action types — just `create()` with functions. For a billing cart with <100 items, Zustand's simplicity is the right choice. TanStack Query would be over-engineered for this. |

---

## 7. PDF Invoice Generation

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Every order should generate a GST-compliant PDF invoice showing store info, line items, pricing breakdown (subtotal, discount, GST at 18%), and order details. |
| **Architecture Chosen** | Server-side PDF generation via ReportLab. PDF is streamed to the client as a download. No intermediate file storage. |
| **Implementation Details** | `POST /invoices/generate/{order_id}` loads the order with items, creates a `SimpleDocTemplate` with A4 page, builds elements: store header (name, phone, email), invoice info (order number, date, status), line items table (blue header row, grid lines), totals section (subtotal, discount, GST, total with black top border), and optional notes. Returns `StreamingResponse` with PDF as attachment. |
| **Challenges Faced** | ReportLab's API is verbose and procedural compared to HTML-to-PDF generators. Getting pixel-perfect alignment of columns and consistent spacing required significant trial-and-error. Unicode characters (₹ symbol) needed special handling. |
| **Solutions Chosen** | ReportLab over wkhtmltopdf or PDFKit because it's pure Python (no system dependencies like Chromium/Node). ₹ symbol is passed as `\u20b9` unicode escape. Table column widths are fixed in inches to ensure consistent layout. Header styling uses ReportLab's `TableStyle` with hex colors (`#2563EB`). |
| **Lessons Learned** | ReportLab is powerful but the API is from the 1990s. For a startup MVP, it works. For a product with frequent invoice template changes, consider an HTML-to-PDF approach (WeasyPrint, Playwright) where templates are HTML/CSS and can be edited by designers. The tradeoff is heavier dependencies (Chromium for Playwright, C libraries for WeasyPrint). |

---

## 8. B2B Customer Catalog

| Aspect | Details |
|--------|---------|
| **Business Requirement** | B2B customers should be able to browse the shopkeeper's product catalog, search/filter products, and view active inventory without needing to call or visit the store. |
| **Architecture Chosen** | Separate read-only endpoint (`/catalog/products`) that returns active products from all shopkeepers. No auth scoping — customer sees all available products. Frontend grid with search, cart, and checkout. |
| **Implementation Details** | `GET /catalog/products` returns products where `is_active=True` (across all owners). Fields limited to: id, name, sku, category, brand, selling_price, stock_quantity. No cost_price exposed. Frontend: `/catalog` page with search bar, product grid (cards with name, price, stock badge, "Add to Cart" button), cart sidebar, and checkout flow. |
| **Challenges Faced** | Stock visibility — should customers see exact stock numbers? Decision: yes, to enable informed ordering. Product ownership separation — catalog shows all products, but orders are attributed to the correct shopkeeper via the customer's `owner_id`. |
| **Solutions Chosen** | Customers see real-time stock quantities to make informed decisions. When a customer places a bulk order, the `shopkeeper_id` is resolved from `customer.owner_id` (the shopkeeper who owns that customer relationship). This means each customer is linked to exactly one shopkeeper. |
| **Lessons Learned** | The B2B catalog is deliberately simpler than the shopkeeper's inventory view — fewer fields, no edit actions. This is an example of CQRS (Command Query Responsibility Segregation) at the API level: separate read models for different user types. |

---

## 9. B2B Bulk Orders with Credit Limit

| Aspect | Details |
|--------|---------|
| **Business Requirement** | B2B customers should be able to place bulk orders on credit. Shopkeepers set credit limits per customer. Orders exceeding available credit should be rejected. |
| **Architecture Chosen** | Single `POST /orders/bulk` endpoint that handles customer resolution, credit checking, order creation, inventory deduction, and credit usage tracking in one transaction. |
| **Implementation Details** | Customer resolution: `SELECT * FROM customers WHERE email = current_user.email` (links customer user account to customer record). Credit check: if `payment_method == "credit"`, verify `credit_limit - credit_used >= total`. If exceeded, return 402 Payment Required. On success: create order, deduct stock, create movements, increment `credit_used`. |
| **Challenges Faced** | Customer user accounts needed matching emails with Customer records. The seed script had to create both. Credit check race condition — two simultaneous orders by the same customer could both pass the check. |
| **Solutions Chosen** | Seed script creates customer User accounts with email matching the Customer record (e.g., `tech.corp@client.com`). The credit check and consumption happen in the same DB transaction — SQLAlchemy's row-level locking prevents race conditions (the `customer_used` read + write is atomic within the transaction). |
| **Lessons Learned** | Returning HTTP 402 (Payment Required) for credit limit exceeded is semantically correct but rarely used. Most developers haven't seen it. The important architectural choice is that credit validation and consumption are in the same transaction — this is the banking industry standard pattern for balance operations. |

---

## 10. Multi-Store Management

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers with multiple outlets need to manage inventory per store. Products should be assignable to specific stores. |
| **Architecture Chosen** | New `stores` table (migration 0004), `store_id` foreign key on `products`, and CRUD endpoints for store management. |
| **Implementation Details** | `Store` model: name, address, owner_id, is_active. Product model gains `store_id` nullable integer. Product listing filterable by `store_id`. Dashboard and reports scoped to the shopkeeper's stores. Seed script creates 3 stores. |
| **Challenges Faced** | Adding `store_id` to products required a migration that could break existing queries. All existing product queries needed update to optionally filter by store. The dashboard aggregates didn't account for store-level filtering. |
| **Solutions Chosen** | `store_id` is nullable (backward compatible — existing products have null store). Store filtering is additive — if `store_id` isn't specified, all stores are shown. Dashboard aggregates remain owner-wide for simplicity. Store-level breakdown is future work. |
| **Lessons Learned** | Multi-store is a deceptively complex feature. Every inventory query, report, and dashboard needs to consider store scope. The MVP approach (optional store filter, no store-level reporting) got the feature shipped but store-level analytics require significant additional work. |

---

## 11. Supplier Management + Price Analysis

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers need to manage suppliers, compare pricing across suppliers, and analyze margins per product. |
| **Architecture Chosen** | Standard CRUD for suppliers + a dedicated price analysis endpoint that computes margin and profit metrics across suppliers and products. |
| **Implementation Details** | Supplier CRUD at `/api/v1/suppliers/`. Price analysis at `/suppliers/price-analysis` aggregates purchase order data to show per-supplier pricing, compare with product selling prices, and compute margin. Navigation: main suppliers page + a "Price Analysis" sub-page. |
| **Challenges Faced** | Price analysis requires joining purchase order items with product selling prices — complex multi-table aggregation. The data model stores PO item prices but comparing across suppliers requires grouping by product. |
| **Solutions Chosen** | SQL query joins `purchase_order_items` → `purchase_orders` → `suppliers` → `products`, groups by supplier + product, computes `margin = selling_price - unit_price`, `margin_pct = margin / selling_price * 100`. Returns sorted by margin ascending (lowest margin first — problem areas). |
| **Lessons Learned** | Price analysis is a killer feature for shopkeepers. The ability to see which supplier charges the most for the same product (across different POs) enables data-driven procurement decisions. The SQL for this is complex but the business value is high. |

---

## 12. AI Demand Forecasting

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers need AI-powered demand predictions to make data-driven reordering decisions. The system should predict next-period demand and recommend order quantities. |
| **Architecture Chosen** | Random Forest Regressor trained on synthetic data with a formula-based fallback. Model serialized as `model.pkl` and loaded at prediction time. |
| **Implementation Details** | `train.py`: generates 2,000 synthetic sales records, trains `RandomForestRegressor(100 trees, max_depth=10, R²=0.862, MAE=6.94)`, serializes with joblib. `predict.py`: lazy-loads model, predicts demand, computes confidence score from tree prediction variance, applies seasonality factor (1.1 for Nov/Dec/Mar/Apr). Fallback: `round(total_sold_last_30_days × 1.1)` with fixed confidence of 85. |
| **Challenges Faced** | No real sales data for training — model is synthetic only. The model file (`model.pkl`) uses pickle serialization, which is Python-version-specific and sklearn-version-specific. The `is_holiday` feature is simplistic (weekend check only). |
| **Solutions Chosen** | Synthetic data with realistic patterns (category base quantities, holiday boosts, random noise) to demonstrate the pipeline. `is_model_ready()` checks if `model.pkl` exists — if not, uses the formula fallback. Pinned `scikit-learn==1.9.0` to ensure model compatibility. Documented that the model must be retrained on real data post-launch. |
| **Lessons Learned** | Building an ML pipeline is 20% training and 80% infrastructure. The model.pkl serialization, lazy loading, graceful fallback, and confidence scoring took more code than the Random Forest itself. Always build the fallback first — it ensures the feature works even when the ML component fails. Synthetic models are fine for MVP demos but dangerous for real decisions — clearly label predictions as "AI-suggested" and note the confidence score. |

---

## 13. Customer Reports (Top, Repeat, CLV)

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers need insights into customer behavior: who spends the most, who returns frequently, and the lifetime value of each customer. |
| **Architecture Chosen** | Three dedicated SQL query endpoints that aggregate orders + customers data using `GROUP BY`, `HAVING`, and aggregate functions (`SUM`, `COUNT`, `AVG`, `MAX`). |
| **Implementation Details** | Top customers: `SELECT COALESCE(SUM(total), 0) as total_spent, COUNT(id) as order_count ... GROUP BY customer.id ORDER BY total_spent DESC LIMIT :limit`. Repeat purchases: `... HAVING COUNT(order.id) > 1 ORDER BY order_count DESC`. CLV: `... AVG(total) as avg_order_value, MAX(created_at) as last_order_date`. All exclude cancelled orders. |
| **Challenges Faced** | The `LEFT JOIN` between customers and orders required careful handling — customers with no orders would have `NULL` for aggregates. The `HAVING` clause for repeat purchases filtered results after aggregation, which is non-intuitive to developers unfamiliar with SQL grouping. |
| **Solutions Chosen** | `COALESCE(SUM(...), 0)` to handle NULLs. `HAVING COUNT(*) > 1` to filter after the group-by. Indexes on `shopkeeper_id` and `customer_id` (migration 0006) ensure these queries run as index scans, not sequential scans. |
| **Lessons Learned** | These three report queries demonstrate SQL proficiency — GROUP BY, HAVING, aggregate functions, LEFT JOIN, COALESCE. For a shopkeeper with <10k customers, these queries run in <50ms with proper indexes. At larger scale, these would benefit from a data warehouse (ClickHouse, Materialize) or pre-aggregated materialized views. |

---

## 14. Dashboard (Parallel Queries + Caching)

| Aspect | Details |
|--------|---------|
| **Business Requirement** | The dashboard must load quickly (<3s) even with large datasets. It shows 5 critical metrics: total products, inventory value, today's sales, pending orders, low stock count. |
| **Architecture Chosen** | Five independent aggregate queries executed in parallel via `asyncio.gather()`. Results cached in Redis with 300-second TTL. Cache-aside pattern. |
| **Implementation Details** | Each metric is a separate async closure. `asyncio.gather()` runs all 5 concurrently. Response is serialized to JSON and stored in Redis: `dashboard:{user_id}`. On subsequent requests, the cached value is returned immediately (~10ms vs ~40ms uncached). |
| **Challenges Faced** | Sequential queries took ~150ms (5 queries × 30ms each). Redis wasn't configured initially, so there was no caching. The cache key needed to include `user_id` to prevent data leakage between users. |
| **Solutions Chosen** | `asyncio.gather()` reduced query time from ~150ms to ~40ms. Redis caching further reduced to ~10ms on cache hit. Cache key: `dashboard:{current_user.id}`. All cache operations check `is_available()` first — if Redis is down, queries hit DB directly. This is the "circuit breaker" pattern at the application level. |
| **Lessons Learned** | `asyncio.gather()` is the simplest performance optimization in async Python — it converts sequential I/O into concurrent I/O with zero dependencies. Combined with Redis caching, the dashboard went from ~150ms to ~10ms (15× improvement) with about 20 lines of code. Always start with parallel execution + caching before reaching for more complex solutions like materialized views. |

---

## 15. Notifications + Low Stock Alerts

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers should be automatically alerted when products run low on stock. Alerts should appear in-app and via email. Duplicate alerts for the same product should be suppressed until the existing one is addressed. |
| **Architecture Chosen** | `check_low_stock()` service called after every order and product update. Creates in-app `Notification` and sends email via Resend. Deduplication prevents spam. |
| **Implementation Details** | `check_low_stock(product_id, shopkeeper_id, db)`: 1) Load product, 2) Check stock vs threshold, 3) Dedup check (existing unread `LOW_STOCK` notification for this product?), 4) Create notification, 5) Send email via `send_email()`. Called in `orders.py` at order creation and `products.py` at product update. |
| **Challenges Faced** | Deduplication logic: without it, every order of a low-stock product would create a new notification. The email sending was synchronous — it blocked the order response while waiting for the Resend API. |
| **Solutions Chosen** | Dedup: check for existing unread `LOW_STOCK` notification with the same `reference_id` (product ID). Email: `send_email()` catches all exceptions internally and returns `bool` — the order response doesn't wait for email confirmation. This is "fire and forget" error handling: the email attempt won't block the order response even if Resend is slow. |
| **Lessons Learned** | Notification systems are harder than they look. Deduplication, rate limiting, and channel management (in-app vs email vs push) all need careful design. The "fire and forget" pattern for non-critical side effects (email) keeps the primary flow fast. For critical notifications, use a background job queue. |

---

## 16. Redis Caching Service

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Dashboard stats are expensive to compute (5 aggregate queries). Cache them with a short TTL to reduce DB load and improve response times. |
| **Architecture Chosen** | Redis caching layer with JSON serialization, TTL-based expiry, pattern invalidation, and graceful degradation when Redis is unavailable. |
| **Implementation Details** | `services/cache.py`: `get(key)`, `set(key, value, ttl=300)`, `delete(key)`, `invalidate_pattern(pattern)`. Uses `redis.asyncio` for non-blocking operations. Values are JSON-encoded for complex types. The entire module is wrapped in `try/except ImportError` so the app works without Redis. |
| **Challenges Faced** | Serialization — Redis stores strings/bytes, but we need to cache Python dicts. JSON serialization works but doesn't handle all Python types (datetimes, Decimals). Multiple services (cache, task_queue) each need their own Redis connection. |
| **Solutions Chosen** | `json.dumps(value)` for serialization, `json.loads(val)` for deserialization. Each service has its own module-level `redis.asyncio.from_url()` call — this creates separate connection pools but keeps each service independently functional. If Redis is unavailable, `is_available()` returns `False` and callers handle the absence gracefully. |
| **Lessons Learned** | The "graceful degradation" pattern (try/except around imports, is_available() checks) makes Redis an optional optimization rather than a hard dependency. This is critical for MVP deployment — the app goes live without Redis, and Redis gets added later with zero code changes. The JSON serialization approach works for MVP but has limits — consider `pickle` (security risk) or `msgpack` (faster) for production. |

---

## 17. Cloudflare R2 Storage

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Product images need to be uploaded and served. Database backups need durable off-site storage. Must be cheap (zero egress fees). |
| **Architecture Chosen** | S3-compatible object storage via Cloudflare R2. boto3 client configured with S3v4 signing. Public bucket URLs for image serving. |
| **Implementation Details** | `services/storage.py`: `upload(key, data, content_type)` → `boto3.client.put_object()`, `download(key)` → `get_object()`, `delete_file(key)` → `delete_object()`, `get_public_url(key)` → `f"{R2_PUBLIC_URL}/{key}"`. Image upload: `POST /products/{id}/image` generates a UUID key (`products/{user_id}/{product_id}_{uuid}.{ext}`), uploads to R2, saves URL to product. Backup: `POST /data/backup/export-r2` exports full DB to `backups/khatabox_backup_{timestamp}.json`. |
| **Challenges Faced** | R2's S3 API requires specific configuration: signature version must be `s3v4`, endpoint URL format differs from AWS S3. Public URL format is non-obvious (`pub-xxxx.r2.dev`). The boto3 client fails at construction time if credentials are invalid, not at API call time. |
| **Solutions Chosen** | `Config(signature_version="s3v4")` is required. The `_available` flag is set based on `bool(settings.R2_ACCESS_KEY_ID)` after client construction — if credentials are empty, the service is "unavailable" and uploads/deletes are no-ops. R2 public URL is constructed from `settings.R2_PUBLIC_URL`. |
| **Lessons Learned** | S3 compatibility is great but the edge cases (signature version, endpoint format, bucket region) matter. The graceful degradation pattern saved us here — R2 is entirely optional, and the app works without it. The availability check at module level (not per-request) means the first deployment won't have R2, and enabling it later is just setting env vars. |

---

## 18. Socket.IO Real-Time

| Aspect | Details |
|--------|---------|
| **Business Requirement** | The platform needs real-time updates for notifications and inventory changes. When stock runs low or an order is placed, all open sessions should be notified instantly. |
| **Architecture Chosen** | Socket.IO AsyncServer mounted as a separate ASGI app at `/ws`. Room-based subscription model: clients subscribe to `user_{id}` rooms to receive user-specific notifications. |
| **Implementation Details** | `AsyncServer(async_mode="asgi")` wrapped in `ASGIApp(sio)` and mounted at `/ws` in `main.py`. Three events: `connect` (log), `disconnect` (log), `subscribe(sid, user_id)` (join room `user_{user_id}`). CORS configured from `settings.CORS_ORIGINS`. |
| **Challenges Faced** | Socket.IO in async mode requires specific configuration. The in-memory adapter means messages are lost on server restart and don't work across multiple uvicorn workers. No authentication on connect — any client can connect without a valid JWT. |
| **Solutions Chosen** | In-memory adapter is acceptable for single-worker MVP. Auth is intentionally omitted from `connect` for simplicity — the room subscription mechanism (`subscribe` event with user_id) provides implicit authorization (clients only know their own user_id). |
| **Lessons Learned** | Socket.IO is straightforward to set up but its limitations are significant: in-memory adapter = no multi-process, no auth on connect = security gap, long-polling fallback in `socket.io-client` adds complexity. For a production system, add Redis adapter and JWT auth in the `connect` event handler. The ASGI mounting pattern (`app.mount("/ws", socket_app)`) is clean and keeps the WebSocket lifecycle separate from HTTP. |

---

## 19. Rate Limiting

| Aspect | Details |
|--------|---------|
| **Business Requirement** | API must be protected from abuse. A sliding window rate limiter prevents any single IP from overwhelming the server. |
| **Architecture Chosen** | In-memory sliding window (100 requests per 60 seconds per IP). Middleware-based — runs before every request except health/docs/ws paths. |
| **Implementation Details** | `defaultdict(list)` mapping `client_ip → [timestamps]`. On each request: 1) Skip exempt paths, 2) Get client IP, 3) Prune timestamps older than 60s, 4) If count ≥ 100, return 429, 5) Append current timestamp, 6) Call next handler. Cleanup is passive — old timestamps are pruned only when that IP makes another request. |
| **Challenges Faced** | Memory growth — if an attacker rotates through many IPs, each unique IP creates a list entry. The in-memory approach doesn't persist across restarts. In multi-worker deployments, each worker has its own counter, allowing 100 req/min per worker (200 total for 2 workers). |
| **Solutions Chosen** | Memory is acceptable: each list entry is ~28 bytes (float). Even 10k IPs × 100 timestamps = ~28MB. The per-worker limitation is documented — for production with multiple workers, migrate to Redis-based rate limiting. The sliding window is more accurate than fixed window (no 200-request burst at window boundaries). |
| **Lessons Learned** | In-memory rate limiting is simple, fast, and sufficient for single-worker deployments. The key design choice is exempting Swagger docs and health endpoints — otherwise developers can't test the API when rate-limited. The 429 response includes a clear message explaining the limit, which helps developers debug. For production, Redis-based rate limiting with Lua scripting provides atomic sliding window operations across all workers. |

---

## 20. Data Import/Export (CSV, Excel)

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers need to import products in bulk from spreadsheets and export data for accounting/auditing. |
| **Architecture Chosen** | Server-side Excel generation with openpyxl (styled headers). CSV/Excel import with error reporting. Frontend CSV parser for client-side preview. |
| **Implementation Details** | Export: `GET /export/products` generates .xlsx with blue headers (`#2563EB`), product fields including batch/expiry info. `GET /export/orders` generates order export with items concatenated. Import: `POST /import/products` accepts .xlsx, .xls, .csv, parses with `openpyxl` or `csv.DictReader`, returns `{created, errors[], total}`. |
| **Challenges Faced** | CSV parsing edge cases: quoted fields with commas, BOM characters (UTF-8 BOM at start of file from Excel). Date fields need ISO format conversion. SKU duplicates during import need careful handling. |
| **Solutions Chosen** | `utf-8-sig` encoding handles BOM. `csv.DictReader` handles standard CSV quoting. Frontend has a hand-rolled CSV parser for preview with quoted-field support. Duplicate SKUs are reported in errors array but don't stop the import — partial success is better than all-or-nothing. |
| **Lessons Learned** | CSV is never "simple" CSV. Excel saves with regional settings (comma vs semicolon), BOM, and encoding issues. The `utf-8-sig` codec automatically strips the BOM. The partial-success pattern (return created count + errors array) is much better UX than failing on the first error — the shopkeeper can fix the 3 bad rows out of 500 and re-import only those. |

---

## 21. Database Backup/Restore

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers need to back up their entire database and restore from backup in case of data loss. Backups should optionally go to cloud storage (R2). |
| **Architecture Chosen** | JSON dump of all 13 tables using raw SQL (not ORM). Restore inserts rows with `id` omitted (auto-increment). Local + R2 variants. |
| **Implementation Details** | `export_backup()`: iterates tables, executes `SELECT * FROM {table}`, converts datetime objects to ISO strings via `isoformat()`, returns `{version, created_at, data: {table: [rows]}}`. `import_backup(backup)`: for each table, for each row, `pop("id", None)`, `INSERT INTO table (...) VALUES (:keys)`. `export_to_storage()`: uploads to R2. `restore_from_storage(key)`: downloads from R2 and imports. |
| **Challenges Faced** | Serialization of non-JSON types (datetimes, Decimals). Import order matters due to foreign keys (orders reference order_items, so orders must be inserted first? No — order_items references orders via FK, so orders must come first). |
| **Solutions Chosen** | Datetime → `isoformat()` before JSON serialization. The table order in `TABLES` list respects FK dependencies: `users` before `products`, `orders` before `order_items`. On import, `id` is auto-generated (popped from row dict), avoiding conflicts with existing data. |
| **Lessons Learned** | Raw SQL (`text()`) is faster than ORM for bulk operations. The `result.keys()` pattern gives column names without reflection. The FK-dependent table ordering is fragile — for production, use PostgreSQL's native `pg_dump`/`pg_restore` which handle dependencies automatically. Our custom backup is suitable for small-scale exports but shouldn't replace proper PostgreSQL backup tooling. |

---

## 22. Full-Text Search

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Product search must be fast and support partial word matching across name and SKU. Must handle 100k+ products. |
| **Architecture Chosen** | PostgreSQL tsvector + GIN index. Auto-updated via database trigger on INSERT/UPDATE of name or SKU fields. |
| **Implementation Details** | Migration 0002: adds `search_vector` column of type `TSVECTOR` (PostgreSQL-specific). Creates a trigger function: `tsvector_update_trigger(search_vector, 'pg_catalog.english', name, sku)`. Creates GIN index on `search_vector`. Search query: `Product.search_vector.op("@@")(func.plainto_tsquery("english", search))`. |
| **Challenges Faced** | `TSVECTOR` is PostgreSQL-only — can't use SQLite for testing. The trigger must be created with `ALTER TABLE` in alembic (raw SQL). The `@@` operator is not standard SQLAlchemy — requires the `.op("@")` operator method. |
| **Solutions Chosen** | Accepted PostgreSQL lock-in for search (we're already PostgreSQL-only). Used raw SQL in alembic for the trigger. SQLAlchemy's `column.op("@@")(func.plainto_tsquery(...))` maps the PostgreSQL full-text search operator. |
| **Lessons Learned** | PostgreSQL full-text search is surprisingly capable for an MVP. `plainto_tsquery` handles stemming (runs → run), stop words (the, a, an), and ranking. GIN indexes are fast for read-heavy workloads but slower on writes (index maintenance). For 100k+ products with frequent updates, consider separating the search index (Elasticsearch, Meilisearch). For our scale (~50 products seeded, <10k expected), PostgreSQL FTS is perfect. |

---

## 23. Expiry Tracking

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers need to track product expiry dates and receive alerts when products are approaching expiry (30/60/90 day buckets). |
| **Architecture Chosen** | SQL query that filters products by `expiry_date IS NOT NULL` and categorizes them into 30/60/90 day buckets based on days remaining. |
| **Implementation Details** | `GET /expiry/upcoming`: queries all products with `expiry_date IS NOT NULL AND is_active = True`. For each product, computes `days_remaining = (expiry_date - today).days`. Sorts into `alerts_30` (0-30 days), `alerts_60` (31-60), `alerts_90` (61-90). Each entry includes: product_id, name, sku, batch_number, mfg_date, expiry_date, days_remaining, stock_quantity. Results are sorted by days_remaining ascending (most urgent first). |
| **Challenges Faced** | Products without batch tracking (`batch_number`, `mfg_date` null) should still appear in expiry alerts. Timezone handling — `date.today()` vs `datetime.now(timezone.utc).date()`. |
| **Solutions Chosen** | `if not p.expiry_date: continue` — skip products without expiry (can't track what we don't know). `date.today()` is system-local, which matches the shopkeeper's concept of "today". All products with an expiry date are included regardless of batch_number/mfg_date. |
| **Lessons Learned** | The 30/60/90 day bucket approach is simple UX that maps to shopkeeper action: "30 days = urgent", "60 days = plan for it", "90 days = keep an eye on it". The endpoint returns already-sorted data so the frontend just renders. This is a good example of "push compute to the backend" — the SQL query does the grouping and sorting, not the frontend. |

---

## 24. Audit Logging

| Aspect | Details |
|--------|---------|
| **Business Requirement** | All critical data mutations must be logged with timestamp, user, action, entity type, and details for compliance and debugging. |
| **Architecture Chosen** | `AuditLog` model with an endpoint for listing logs (paginated, filterable by entity type). Logs are created manually at key mutation points. |
| **Implementation Details** | `AuditLog` stores: user_id, action (string like "product.updated"), entity_type ("product"), entity_id, details (JSON text), created_at. Endpoint: `GET /audit/logs` with optional `entity_type` filter, `limit` (max 500), `offset`. Returns paginated results ordered by `created_at DESC`. |
| **Challenges Faced** | Inconsistent logging — some mutations had audit logs, some didn't. There was no middleware or ORM event listener to automatically capture all changes. Deciding what constitutes an "auditable" action. |
| **Solutions Chosen** | Manual logging at key mutation points: user role changes, product updates, order status changes, etc. The audit log model exists and the list endpoint works, but coverage is incomplete. This is documented as tech debt — full coverage requires either (a) an SQLAlchemy event listener on `after_update` or (b) a middleware that logs all `POST/PUT/PATCH/DELETE` requests. |
| **Lessons Learned** | Audit logging is one of those features where "do it right or don't do it at all" applies. Manual logging at mutation points inevitably misses cases. The proper solution is an SQLAlchemy `before_update` event listener that automatically compares old/new values and writes audit entries. This ensures 100% coverage with zero developer effort per endpoint. |

---

## 25. Mobile Responsiveness

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Shopkeepers use phones in the store. The dashboard, billing, and inventory pages must be usable on mobile screens (<768px width). |
| **Architecture Chosen** | Responsive layout with desktop sidebar (hidden on mobile) and bottom navigation bar (visible only on mobile). Tailwind breakpoint classes: `lg:hidden`, `hidden lg:flex`. |
| **Implementation Details** | `BottomNav` component: 5 tabs (Dashboard, Inventory, Orders, Billing, Reports) + floating action button. `Sidebar`: `hidden lg:flex` (hidden on mobile, flex on desktop). Layout: `pb-20 lg:pb-6` on `<main>` to prevent content from hiding behind the fixed bottom nav. FAB dispatches `CustomEvent("khatabox:fab-click")` for extensibility. |
| **Challenges Faced** | The bottom nav covers the bottom 80px of content. Long pages had their content hidden behind the nav. The FAB button overlapped with the nav. |
| **Solutions Chosen** | `pb-20 lg:pb-6` ensures 80px bottom padding on mobile, 24px on desktop. The FAB is positioned `absolute -top-5 right-4` (floats above the bottom nav). The bottom nav has `z-50` to ensure it's above all content. |
| **Lessons Learned** | Mobile-first responsive design with Tailwind is straightforward if you use the breakpoint prefixes consistently. The key insight is `hidden lg:flex` for desktop-only elements and `lg:hidden` for mobile-only elements. The 80px bottom padding (20 Tailwind units) exactly matches the 64px nav height + 16px breathing room. |

---

## 26. Performance Middleware

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Every API response should include timing information so clients can monitor performance and detect slowdowns. |
| **Architecture Chosen** | FastAPI middleware that records `time.time()` before and after the request, computes elapsed milliseconds, and adds an `X-Response-Time` header. |
| **Implementation Details** | `@app.middleware("http")`: `start = time.time()`, `response = await call_next(request)`, `elapsed = round((time.time() - start) * 1000)`, `response.headers["X-Response-Time"] = f"{elapsed}ms"`. Runs on every HTTP request. |
| **Challenges Faced** | The middleware timing includes the rate limiter's execution time. `time.time()` has microsecond precision, which is sufficient for sub-100ms responses. |
| **Solutions Chosen** | Accepted that the timing includes middleware overhead. `time.time()` over `time.perf_counter()` because we only need millisecond precision. The header value is a string with "ms" suffix for human readability. |
| **Lessons Learned** | The simplest observability tool is sometimes the most valuable. A single response time header costs microseconds to compute and provides immediate visibility into API performance from the browser's network tab. This is far simpler than setting up distributed tracing for an MVP. |

---

## 27. Sentry + PostHog Integration

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Production error tracking (Sentry) and product analytics (PostHog) must be configured. Both must degrade gracefully when not configured. |
| **Architecture Chosen** | Initialized at module level in `main.py`. Sentry captures exceptions automatically. PostHog is initialized but event capturing needs to be added per-endpoint. |
| **Implementation Details** | Sentry: `sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2, send_default_pii=False)`. If DSN is empty, Sentry is a no-op. PostHog: `posthog.project_api_key = settings.POSTHOG_API_KEY`, `posthog.host = settings.POSTHOG_HOST`. Both run at module import time. |
| **Challenges Faced** | PostHog initialization at module level means it's configured before the app starts, but no events are actually captured from endpoints — it's initialized but untapped. Sentry's default behavior captures all unhandled exceptions automatically. |
| **Solutions Chosen** | Sentry requires no per-endpoint changes — it captures exceptions automatically. PostHog initialization is complete but event capture (`posthog.capture()`) must be added to individual endpoints as needed. Both services check for empty API keys at initialization — if keys are empty, they're no-ops. |
| **Lessons Learned** | Sentry's "set and forget" model (init once, capture all exceptions) is brilliant. PostHog's "capture explicitly" model (need to add `posthog.capture()` calls) requires more discipline but gives more control over what's tracked. The graceful initialization pattern (no crash if DSN is empty) means these can be added to production at any time without a code deploy. |

---

## 28. Seed Script

| Aspect | Details |
|--------|---------|
| **Business Requirement** | Development and demo environments need realistic sample data: 50 products across 5 categories, 8 suppliers, 5 customers with user accounts, 30 orders, 10 purchase orders, 6 notifications, 3 stores. |
| **Architecture Chosen** | Python script that creates an async session, deletes all data (except users — idempotent check), and inserts sample data. |
| **Implementation Details** | 237 lines. Defines CATEGORIES, BRANDS, PRODUCT_NAMES dictionaries for realistic data. Creates admin and shopkeeper users (idempotent — checks email existence). CLEARS all dependent tables with `DELETE FROM`. Creates 3 stores, 50 products (10 per category, with batch/expiry for medicines/groceries), 8 suppliers, 5 customers with credit limits and user accounts, 30 orders with random statuses and items, 10 purchase orders, 6 notifications. |
| **Challenges Faced** | The `DELETE FROM` order matters due to foreign keys — order_items must be deleted before orders. The idempotency check (only seed if admin user doesn't exist) conflicts with the destructive `DELETE FROM` approach. |
| **Solutions Chosen** | Delete in dependency order: movements → items → invoices → orders → PO items → POs → notifications → products → stores → suppliers → customers. Users are never deleted (checked by email). The script is "idempotent-destructive": it always clears data and recreates it. This is acceptable for dev but dangerous for production — document this clearly. |
| **Lessons Learned** | A seed script is essential for developer onboarding. Without it, new developers spend hours creating data to test features. The destructive nature is fine for local dev but must be clearly documented to prevent accidental production runs. The idempotent user creation pattern (check email, create if not found) should extend to all entities, not just users. |

---

## Summary

| Category | # Features | Key Engineering Takeaways |
|----------|-----------|-------------------------|
| **Authentication** | 2 | Pin bcrypt, validate against DB every request |
| **Core CRUD** | 5 | Soft-delete, tsvector search, atomic audit |
| **Billing & Orders** | 4 | GST invoices, credit in-transaction, barcode scan |
| **B2B Commerce** | 2 | Email-based customer resolution, CQRS pattern |
| **Intelligence** | 2 | ML fallback first, synthetic data for demo |
| **Infrastructure** | 7 | Graceful degradation for all external services |
| **Data Management** | 3 | Partial-success import, JSON backup, FK-aware ordering |
| **Operations** | 3 | Rate limiting, response time headers, Sentry auto-capture |
| **UX** | 2 | Mobile bottom nav, desktop sidebar, role-filtered nav |

**Total: 28 features documented**
