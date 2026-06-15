# KhataBox — Code Walkthrough

> A comprehensive file-by-file guide to the KhataBox codebase.
> Written for interview preparation — each entry covers **purpose, important functions/classes, design patterns, and syntax explanation** with real code examples.

---

## Table of Contents

1. [Backend Core](#backend-core)
2. [Backend API Layer](#backend-api-layer)
3. [Backend Models](#backend-models)
4. [Backend Schemas](#backend-schemas)
5. [Services & ML](#services--ml)
6. [Frontend Core](#frontend-core)
7. [Frontend Pages](#frontend-pages)

---

## Backend Core

### 1. `app/main.py`

**File:** `backend/app/main.py`

**Purpose:** Application entry point. Creates the FastAPI app, configures middleware (CORS, rate limiting, performance headers), mounts Socket.IO server, initializes external services (Sentry, PostHog), registers all API routes, and defines the health check.

**Important Functions:**

| Function | Purpose |
|----------|---------|
| `lifespan(app)` | Async context manager for startup/shutdown events. Code before `yield` runs on startup, after on shutdown. Currently a no-op. |
| `rate_limit(request, call_next)` | HTTP middleware that delegates to `rate_limit_middleware` before processing request. Applied to every request. |
| `add_performance_headers(request, call_next)` | HTTP middleware that times the request and adds `X-Response-Time` header in milliseconds. |
| `health()` | `GET /health` returning `{"status": "ok", "service": "KhataBox API"}`. Used by Railway for health check pings. |

**Important Classes:** None — all top-level functions.

**Design Patterns:**
- **Middleware Pattern:** Two `@app.middleware("http")` decorators wrap every request. Each middleware receives `request` + `call_next`; `call_next` passes the request down the chain.
- **Lifespan Pattern:** `@asynccontextmanager` replaces the deprecated `startup`/`shutdown` event handlers.
- **Graceful Degradation:** Sentry and PostHog initialize at module level but only activate when credentials are provided.

**Syntax Explanation:**

```python
# Lifespan replaces startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup code here
    yield
    # shutdown code here

# Middleware wraps the request-response cycle
@app.middleware("http")
async def add_performance_headers(request: Request, call_next):
    start = time.time()
    response = await call_next(request)  # Process request
    elapsed = round((time.time() - start) * 1000)
    response.headers["X-Response-Time"] = f"{elapsed}ms"
    return response

# Mount a separate ASGI app at a path prefix
app.mount("/ws", socket_app)
```

**Interview Talking Points:**
- "Lifespan is the modern FastAPI way to handle startup/shutdown — replaces `@app.on_event('startup')`"
- "The `call_next` pattern is the standard ASGI middleware interface — each middleware calls `call_next` to delegate to the next handler"
- "Socket.IO is mounted at `/ws` as a separate ASGI app, independent of the FastAPI routes"

---

### 2. `app/config.py`

**File:** `backend/app/config.py`

**Purpose:** Centralized configuration management using Pydantic's `BaseSettings`. Reads from `.env` file with sensible defaults.

**Important Classes:**

| Class | Purpose |
|-------|---------|
| `Settings` | 15 typed configuration fields. Reads from environment variables and `.env` file. Instantiated as module-level singleton `settings`. |

**Design Patterns:**
- **Singleton:** `settings = Settings()` at module level — every module imports the same instance.
- **12-Factor Config:** Environment variables are the source of truth; `.env` is a convenience for local dev.
- **Sensible Defaults:** Every field has a default so the app works without a complete `.env`.

**Syntax Explanation:**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/khatabox"
    SECRET_KEY: str = "change-me"                    # MUST override in production
    CORS_ORIGINS: str = "http://localhost:3000"       # Comma-separated
    REDIS_URL: str = "redis://localhost:6379"
    RESEND_API_KEY: str = ""
    # ... more fields

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()  # Global singleton
```

**Key syntax:** `model_config` replaces Pydantic v1's inner `Config` class. `BaseSettings` auto-reads `.env` and env vars (env vars take priority).

---

### 3. `app/core/database.py`

**File:** `backend/app/core/database.py`

**Purpose:** SQLAlchemy async engine and session factory. Provides `get_db` dependency for route handlers.

**Important Classes:**

| Class | Purpose |
|-------|---------|
| `Base` | Declarative base for all models. Every SQLAlchemy model inherits from it. |

**Important Functions:**

| Function | Purpose |
|----------|---------|
| `get_db()` | Async generator yielding a DB session per request. Used as `db: AsyncSession = Depends(get_db)` on every route. |

**Design Patterns:**
- **Dependency Injection:** `get_db` is a FastAPI dependency creating a request-scoped session.
- **Generator Pattern:** `yield` (not `return`) makes it an async generator — FastAPI handles the lifecycle.

**Syntax Explanation:**

```python
engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session    # FastAPI injects this into routes
        finally:
            await session.close()  # Always clean up
```

**Critical config:** `expire_on_commit=False` — without this, SQLAlchemy expires all attributes after commit, triggering lazy loads on closed sessions in async contexts.

---

### 4. `app/core/security.py`

**File:** `backend/app/core/security.py`

**Purpose:** Password hashing (bcrypt) and JWT token creation/validation. The authentication foundation.

**Important Functions:**

| Function | Purpose |
|----------|---------|
| `hash_password(password)` | Hashes plaintext password using bcrypt via passlib. Returns hash string. |
| `verify_password(plain, hashed)` | Verifies plaintext against bcrypt hash. Returns boolean. |
| `create_access_token(data)` | Creates JWT with 30-min expiry. Encodes `{sub, role, exp}` with HS256. |
| `create_refresh_token(data)` | Creates JWT with 7-day expiry for token refresh. |
| `decode_token(token)` | Decodes and validates JWT. Returns payload dict or `None`. |

**Design Patterns:**
- **Strategy Pattern:** `CryptContext` abstracts hashing algorithm — currently bcrypt, can switch to argon2/scrypt.
- **Factory Pattern:** Access and refresh token functions share same encoding logic, differ only in expiry.

**Syntax Explanation:**

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict | None:  # Python 3.10+ union syntax
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None  # NEVER leak whether it was expired vs malformed
```

**Critical gotcha:** `bcrypt==4.0.1` is pinned because `passlib 1.7.4` is incompatible with bcrypt ≥5.0 — upgrading bcrypt breaks password hashing with `AttributeError`.

---

### 5. `app/core/dependencies.py`

**File:** `backend/app/core/dependencies.py`

**Purpose:** FastAPI dependency functions for authentication (JWT validation) and authorization (role checking). Every protected route depends on these.

**Important Functions:**

| Function | Purpose |
|----------|---------|
| `get_current_user(credentials, db)` | Extracts Bearer token, decodes JWT, looks up User in DB, returns `User`. Used on every authenticated route. |
| `require_role(*roles)` | Factory returning a dependency that checks `current_user.role` against allowed roles. Used for admin-only endpoints. |

**Design Patterns:**
- **Dependency Injection:** FastAPI resolves nested dependencies automatically — `require_role` internally depends on `get_current_user`.
- **Closure/Factory:** `require_role` captures allowed roles, returns an inner function that FastAPI treats as a dependency.

**Syntax Explanation:**

```python
security = HTTPBearer()  # Extracts "Bearer <token>" from Authorization header

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(*roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker  # FastAPI resolves the nested Depends()

# Usage: current_user: User = Depends(require_role("admin"))
```

**401 vs 403:** Invalid/missing token = 401 (Unauthenticated). Valid token + wrong role = 403 (Forbidden).

---

## Backend API Layer

### 6. `app/api/v1/__init__.py`

**File:** `backend/app/api/v1/__init__.py`

**Purpose:** Aggregates 18 route modules into a single `APIRouter` with prefix `/api/v1`. Imported by `main.py` as `v1_router`.

**Design Patterns:**
- **Facade Pattern:** Hides 18 individual modules behind a single import.
- **Module Registration Pattern:** Each module creates its own `router = APIRouter()`, then gets registered with a prefix and Swagger tags.

```python
router = APIRouter(prefix="/api/v1")
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(products.router, prefix="/products", tags=["Products"])
# ... 18 modules
```

---

### 7. `app/api/v1/auth.py`

**File:** `backend/app/api/v1/auth.py`

**Purpose:** Authentication + admin user management — register, login, profile, list users, change roles, toggle active.

**Important Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `register(payload, db)` | `POST /auth/register` | Creates user with hashed password, returns JWT (status 201). |
| `login(payload, db)` | `POST /auth/login` | Validates credentials, returns JWT. |
| `get_me(current_user)` | `GET /auth/me` | Returns authenticated user's profile. |
| `list_users(role, search, ...)` | `GET /auth/users` | Admin-only. Lists users with role filter + name/email search. |
| `update_user_role(user_id, new_role, ...)` | `PATCH /auth/users/{id}/role` | Admin-only. Changes user role, validates against `UserRole` enum. |
| `toggle_user_active(user_id, ...)` | `PATCH /auth/users/{id}/toggle-active` | Admin-only. Toggles `is_active`. Prevents self-deactivation. |

**Syntax Explanation:**

```python
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    # 1. Check duplicate
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    # 2. Create user with hashed password
    user = User(email=payload.email, password_hash=hash_password(payload.password), name=payload.name, role=payload.role)
    db.add(user)
    await db.commit()
    await db.refresh(user)  # Get auto-generated id, timestamps
    # 3. Create tokens
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserResponse.model_validate(user))
```

**Full CRUD flow:** validate → hash password → create model → `db.add` → `commit` → `refresh` → create tokens → return.

---

### 8. `app/api/v1/products.py`

**File:** `backend/app/api/v1/products.py`

**Purpose:** Product CRUD with 8 optional filters, image upload to R2, low-stock notification triggering.

**Important Functions:**

| Function | Purpose |
|----------|---------|
| `_enrich_store_name(product, resp, db)` | Private helper. Fetches store name for a product and sets it on the response. |
| `list_products(...)` | `GET /products/` — Lists products with search (tsvector), category, brand, stock_status, price_range, store_id filters. |
| `create_product(payload, ...)` | `POST /products/` — Creates product with SKU uniqueness check, triggers low-stock check. |
| `update_product(product_id, payload, ...)` | `PUT /products/{id}` — Partial update via `model_dump(exclude_unset=True)`. Re-checks low stock if stock changed. |
| `upload_product_image(product_id, file, ...)` | `POST /products/{id}/image` — Validates image type, uploads to R2, updates product.image_url. |
| `delete_product(product_id, ...)` | `DELETE /products/{id}` — Soft delete (sets `is_active = False`). |

**Syntax Explanation:**

```python
# Query builder — chain where clauses
query = select(Product).where(Product.owner_id == current_user.id, Product.is_active == True)
if category: query = query.where(Product.category == category)
if brand: query = query.where(Product.brand.ilike(f"%{brand}%"))
if min_price is not None: query = query.where(Product.selling_price >= min_price)
if stock_status == "low_stock":
    query = query.where(Product.stock_quantity > 0, Product.stock_quantity <= Product.reorder_threshold)
if search:
    query = query.where(Product.search_vector.op("@@")(func.plainto_tsquery("english", search)))

# Partial update — only apply fields that were sent
for key, value in payload.model_dump(exclude_unset=True).items():
    setattr(product, key, value)

# Image upload with R2 fallback
if r2_available():
    r2_upload(key, data, file.content_type)
    product.image_url = f"{settings.R2_PUBLIC_URL}/{key}"
else:
    product.image_url = "/api/v1/products/{product.id}/image/placeholder"
```

---

### 9. `app/api/v1/orders.py`

**File:** `backend/app/api/v1/orders.py`

**Purpose:** Order management — shopkeeper POS orders, B2B customer bulk orders (with credit check), order history, status updates.

**Important Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `generate_order_number()` | — | Generates `ORD-` + 8 random digits. |
| `list_orders(...)` | `GET /orders/` | Lists shopkeeper's orders with eager-loaded items. |
| `create_order(payload, ...)` | `POST /orders/` | Creates order + items, deducts stock, creates inventory movement, checks low stock — all in one transaction. |
| `create_bulk_order(payload, ...)` | `POST /orders/bulk` | B2B customer order. Resolves customer by email, checks credit limit, creates order with items/movements, increments `credit_used`. |
| `my_orders(...)` | `GET /orders/my-orders` | Customer's order history filtered by customer_id (resolved from email). |
| `update_order_status(order_id, payload, ...)` | `PATCH /orders/{id}/status` | Updates order status (validates against enum). |

**Syntax Explanation:**

```python
# Single transaction with flush + commit
order = Order(order_number=generate_order_number(), shopkeeper_id=current_user.id, ...)
db.add(order)
await db.flush()  # Get order.id without committing

for item in payload.items:
    db.add(order_item)           # OrderItem
    product.stock_quantity -= item.quantity  # Stock deduction
    db.add(movement)             # InventoryMovement
    await check_low_stock(item.product_id, ...)  # Notification check

await db.commit()  # All-or-nothing — if anything fails, everything rolls back

# Bulk order credit check
if payload.payment_method == "credit":
    credit_remaining = customer.credit_limit - customer.credit_used
    if total > credit_remaining:
        raise HTTPException(status_code=402,
            detail=f"Credit limit exceeded. Available: ₹{credit_remaining:.2f}")
```

**Design Patterns:**
- **Unit of Work:** All DB operations in `create_order` are in one transaction — atomicity guaranteed.
- **402 Payment Required:** Used when credit limit exceeded — unconventional but semantically correct.

---

### 10. `app/api/v1/dashboard.py`

**File:** `backend/app/api/v1/dashboard.py`

**Purpose:** Aggregates 5 business metrics into a single dashboard response. Uses parallel queries and Redis caching.

**Important Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `get_dashboard_stats(current_user, db)` | `GET /dashboard/stats` | Runs 5 aggregate queries concurrently via `asyncio.gather`, caches in Redis (TTL 300s). |

**Syntax Explanation:**

```python
@router.get("/stats")
async def get_dashboard_stats(current_user, db):
    cache_key = f"dashboard:{current_user.id}"

    # Cache-Aside: check cache first
    if cache_available():
        cached = await cache_get(cache_key)
        if cached: return cached

    # Define 5 independent queries as closures
    async def count_products():
        r = await db.execute(select(func.count(...)).where(...))
        return r.scalar() or 0

    # Run all 5 in parallel
    results = await asyncio.gather(
        count_products(), inventory_value(), today_sales(),
        pending_count(), low_stock_count()
    )

    data = {"total_products": results[0], "total_inventory_value": results[1], ...}

    if cache_available():
        await cache_set(cache_key, data, ttl=300)  # 5 min cache

    return data
```

**Design Patterns:**
- **Parallel Query:** `asyncio.gather` runs 5 queries concurrently instead of sequentially — ~40ms vs ~150ms.
- **Cache-Aside:** Check cache → if miss, compute → store in cache. Graceful fallback if Redis unavailable.

---

### 11. `app/api/v1/suppliers.py`

**File:** `backend/app/api/v1/suppliers.py`

**Purpose:** Supplier CRUD + price analysis (margin analysis grouped by supplier).

**Important Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `list_suppliers(...)` | `GET /suppliers/` | Lists suppliers for current user. |
| `create_supplier(...)` | `POST /suppliers/` | Creates supplier. |
| `update_supplier(...)` | `PUT /suppliers/{id}` | Partial update pattern. |
| `delete_supplier(...)` | `DELETE /suppliers/{id}` | Hard delete. |
| `price_analysis(current_user, db)` | `GET /suppliers/price-analysis` | Complex aggregation: loads POs with items, finds most recent price for each product-supplier pair, calculates margin %, groups by supplier. |

**Syntax Explanation (price_analysis):**

```python
@router.get("/price-analysis", response_model=list[SupplierPriceAnalysisResponse])
async def price_analysis(current_user, db):
    # Step 1: Load suppliers into dict {id: name}
    suppliers = {s.id: s.name for s in (await db.execute(...)).scalars().all()}

    # Step 2: Load POs with items, ordered by date DESC (most recent first)
    all_pos = (await db.execute(
        select(PurchaseOrder).where(...).options(selectinload(PurchaseOrder.items))
        .order_by(desc(PurchaseOrder.created_at))
    )).scalars().all()

    # Step 3: Build {(product_id, supplier_id): unit_price}
    # First encounter wins (most recent PO due to DESC ordering)
    product_last_price = {}
    for po in all_pos:
        for item in po.items:
            key = (item.product_id, po.supplier_id)
            if key not in product_last_price:
                product_last_price[key] = item.unit_price

    # Step 4: Load products into dict {id: Product}
    products = {p.id: p for p in (await db.execute(...)).scalars().all()}

    # Step 5: Group by supplier, calculate margins
    from collections import defaultdict
    supplier_groups = defaultdict(list)
    for (pid, sid), unit_price in product_last_price.items():
        product = products.get(pid)
        margin = round(((product.selling_price - unit_price) / product.selling_price) * 100, 2)
        supplier_groups[sid].append(PriceAnalysisItem(...))

    # Step 6: Build response (include suppliers with 0 purchases)
    result = []
    for sid, items in supplier_groups.items():
        avg_margin = round(sum(i.margin_percent for i in items) / len(items), 2)
        result.append(SupplierPriceAnalysisResponse(...))
    for sid in suppliers:
        if sid not in supplier_groups:
            result.append(SupplierPriceAnalysisResponse(supplier_id=sid, items=[], avg_margin_percent=0, total_items=0))
    return result
```

**Design Patterns:**
- **In-Memory Aggregation:** Complex ranking logic (most recent price per product-supplier) done in Python rather than SQL — simpler than window functions.
- **DefaultDict Pattern:** `defaultdict(list)` avoids checking key existence before appending.

---

### 12. `app/api/v1/notifications.py`

**File:** `backend/app/api/v1/notifications.py`

**Purpose:** Notification listing and management — list (with type filter), mark-one-read, mark-all-read.

**Important Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `list_notifications(type, ...)` | `GET /notifications/` | Lists user's notifications, newest first. Optional `type` filter. |
| `mark_all_notifications_read(...)` | `PATCH /notifications/mark-all-read` | Bulk update all unread to read — single SQL UPDATE. |
| `mark_notification_read(notification_id, ...)` | `PATCH /notifications/{id}/read` | Marks one notification as read. Ownership check included. |

**Important:** Route ordering matters — `mark-all-read` must be registered BEFORE `/{notification_id}/read` or FastAPI interprets "mark-all-read" as a notification ID.

```python
@router.patch("/mark-all-read", response_model=dict)  # Static path FIRST
async def mark_all_notifications_read(...):
    await db.execute(
        update(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}

@router.patch("/{notification_id}/read", response_model=NotificationResponse)  # Parameterized path SECOND
```

---

### 13. `app/api/v1/forecasting.py`

**File:** `backend/app/api/v1/forecasting.py`

**Purpose:** ML demand forecasting endpoint with fallback formula.

**Important Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `get_demand_forecast(product_id, ...)` | `GET /forecasting/demand/{product_id}` | Loads product + sales data, runs ML prediction (Random Forest) or fallback heuristic, returns predicted demand + reorder qty + confidence. |

```python
@router.get("/demand/{product_id}")
async def get_demand_forecast(product_id, current_user, db):
    product = (await db.execute(...)).scalar_one_or_none()

    if ml_predict.is_model_ready():
        forecast = ml_predict.predict_demand({
            "product_id": product_id,
            "category": product.category,
            "current_stock": product.stock_quantity,
            "day_of_week": now.weekday(),
            "month": now.month,
            "is_holiday": 1 if now.weekday() >= 5 else 0,
        })
    else:
        # Fallback: 10% growth + seasonal adjustment
        forecast = {
            "predicted_demand": round(total_sold * 1.1),
            "recommended_order_qty": max(0, predicted_demand - product.stock_quantity),
            "confidence_score": 85,
        }

    return {"product_id": product_id, "current_stock": product.stock_quantity, **forecast}
```

---

### 14. `app/api/v1/catalog.py`

**File:** `backend/app/api/v1/catalog.py`

**Purpose:** Customer-facing product catalog. Returns only active products with search/filter, showing only customer-relevant fields (no cost_price).

```python
@router.get("/products")
async def catalog_products(search="", category="", brand="", min_price=0, max_price=0, current_user, db):
    query = select(Product).where(Product.is_active == True)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))
    # ... more filters
    result = await db.execute(query)
    return [{"id": p.id, "name": p.name, "sku": p.sku, "selling_price": p.selling_price, ...} for p in result.scalars().all()]
```

---

### 15. `app/api/v1/qrcodes.py`

**File:** `backend/app/api/v1/qrcodes.py`

**Purpose:** QR code generation — single product QR or batch label sheets (3-col × 6-row grid).

**Important Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `generate_product_qr(product_id, ...)` | `GET /qrcodes/product/{product_id}` | Single QR code PNG. Uses `qrcode` library. |
| `batch_qr_labels(ids, ...)` | `GET /qrcodes/batch?ids=1,2,3` | Label sheet with 80×80 QR + product info per label. |

**Syntax:**

```python
# Font fallback for cross-platform compatibility
try:
    font = ImageFont.truetype("arial.ttf", 10)  # Windows
except (IOError, OSError):
    font = ImageFont.load_default()             # Docker

# Build label sheet
sheet = Image.new("RGB", (sheet_w, sheet_h), "white")
for idx, pid in enumerate(id_list):
    col = idx % 3
    row = idx // 3
    x, y = col * LABEL_W, row * LABEL_H
    qr_img = qrcode.make(str(pid)).resize((80, 80), Image.NEAREST)
    sheet.paste(qr_img, (x + 10, y + 10))
    draw.text((x + 100, y + 10), product.name[:20], fill="black")  # Truncate long names

buf = BytesIO()
sheet.save(buf, format="PNG")
buf.seek(0)
return StreamingResponse(buf, media_type="image/png")
```

---

### 16. `app/api/v1/invoices.py`

**File:** `backend/app/api/v1/invoices.py`

**Purpose:** Generate GST-compliant PDF invoices via ReportLab.

**Important Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `generate_invoice(order_id, ...)` | `POST /invoices/generate/{order_id}` | Builds PDF with store header, line items table, totals, streams as download. |

**Syntax:**

```python
buf = BytesIO()
doc = SimpleDocTemplate(buf, pagesize=A4)
elements = []

# Store header
elements.append(Paragraph(f"<b>{current_user.store_name}</b>", styles["Title"]))
elements.append(Paragraph(f"Order: {order.order_number}", styles["Normal"]))

# Line items table
table_data = [["#", "Product", "Qty", "Price", "Total"]]
for i, item in enumerate(order.items, 1):
    table_data.append([str(i), item.product_name, str(item.quantity),
                       f"₹{item.unit_price:.2f}", f"₹{item.total_price:.2f}"])
table = Table(table_data, colWidths=[0.5*inch, 2.5*inch, 0.5*inch, 0.8*inch, 0.8*inch])
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
]))
elements.append(table)

doc.build(elements)
buf.seek(0)
return StreamingResponse(buf, media_type="application/pdf",
    headers={"Content-Disposition": f'attachment; filename="invoice_{order.order_number}.pdf"'})
```

---

### 17. `app/api/v1/reports.py`

**File:** `backend/app/api/v1/reports.py`

**Purpose:** Customer analytics — top customers, repeat purchases, customer lifetime value (CLV).

**Important Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `top_customers(limit, ...)` | `GET /reports/customers/top` | Top N customers by total spend. `GROUP BY` + `ORDER BY sum(total) DESC`. |
| `repeat_purchases(limit, ...)` | `GET /reports/customers/repeat-purchases` | Customers with `count(order_id) > 1`. Uses `HAVING`. |
| `customer_lifetime_value(min_orders, ...)` | `GET /reports/customers/clv` | CLV, avg order value, last order date. |

**Syntax:**

```python
@router.get("/customers/top")
async def top_customers(limit: int = Query(10, ge=1, le=100), current_user, db):
    result = await db.execute(
        select(Customer.id, Customer.company_name,
               func.coalesce(func.sum(Order.total), 0).label("total_spent"),
               func.count(Order.id).label("order_count"))
        .select_from(Customer)
        .outerjoin(Order, Order.customer_id == Customer.id)
        .where(Customer.owner_id == current_user.id, Order.status != OrderStatus.CANCELLED)
        .group_by(Customer.id)
        .order_by(func.coalesce(func.sum(Order.total), 0).desc())
        .limit(limit)
    )
    return [{"id": r[0], "company_name": r[1], "total_spent": float(r[2]), "order_count": r[3]} for r in result.all()]
```

---

### 18. `app/api/v1/inventory.py` + `purchase_orders.py` + `customers.py`

**File:** `backend/app/api/v1/inventory.py`

Movement listing with product_id / movement_type filters, pagination (limit/offset). Inline `MovementResponse` schema.

**File:** `backend/app/api/v1/purchase_orders.py`

PO CRUD with inline schemas (POCreate, POResponse, POItemResponse). Uses `selectinload(PurchaseOrder.items)`. PO number generation with `PO-` + random digits. Status update validates against `POStatus` enum.

**File:** `backend/app/api/v1/customers.py`

Simple CRUD — same pattern as suppliers: list, create, update, delete. No special business logic.

---

## Backend Models

### 19. `app/models/user.py`

**File:** `backend/app/models/user.py`

**Purpose:** User model with role-based access control. Core entity owned by `owner_id` on most other models.

**Important Classes:**

| Class | Purpose |
|-------|---------|
| `UserRole(str, enum.Enum)` | `ADMIN="admin"`, `SHOPKEEPER="shopkeeper"`, `CUSTOMER="customer"` |
| `User(Base)` | `users` table: email, password_hash, name, role, store_name, phone, is_active, timestamps. |

**Syntax Explanation:**

```python
class UserRole(str, enum.Enum):               # str + Enum = auto-serializable
    ADMIN = "admin"
    SHOPKEEPER = "shopkeeper"
    CUSTOMER = "customer"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)  # NEVER plaintext
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x]),  # CRITICAL!
        default=UserRole.SHOPKEEPER, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)  # Callable, not value!
    )
```

**CRITICAL:** `values_callable=lambda x: [e.value for e in x]` — without this, SQLAlchemy stores `"ADMIN"` (member name) instead of `"admin"` (member value). Required on every Enum column.

---

### 20. `app/models/product.py`

**File:** `backend/app/models/product.py`

**Purpose:** Product model — the central entity with 19 fields covering inventory, pricing, batch tracking, multi-store, full-text search.

**Syntax:**

```python
class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False)
    selling_price: Mapped[float] = mapped_column(Float, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    reorder_threshold: Mapped[int] = mapped_column(Integer, default=10)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mfg_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner_id: Mapped[int] = mapped_column(Integer, nullable=False)
    store_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)  # PG-specific
```

---

### 21. `app/models/order.py`

**File:** `backend/app/models/order.py`

**Purpose:** Order + OrderItem with status workflow and payment methods.

**Important Classes:**

| Class | Purpose |
|-------|---------|
| `OrderStatus(str, enum.Enum)` | PENDING, CONFIRMED, PROCESSING, COMPLETED, CANCELLED |
| `PaymentMethod(str, enum.Enum)` | CASH, UPI, CREDIT, BANK_TRANSFER |
| `Order(Base)` | Financial fields, status, items relationship with cascade delete |
| `OrderItem(Base)` | Line item with product_id + product_name (redundant for history) |

**Syntax:**

```python
class Order(Base):
    __tablename__ = "orders"
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order",
        cascade="all, delete-orphan"  # Delete order → delete items
    )

class OrderItem(Base):
    __tablename__ = "order_items"
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    order: Mapped["Order"] = relationship("Order", back_populates="items")
```

**`cascade="all, delete-orphan"`:** Children deleted when removed from collection OR when parent is deleted.

---

### 22-26. Other Models

**`app/models/supplier.py`** — Simple: name, contact_person, email, phone, address, owner_id.

**`app/models/customer.py`** — B2B: company_name, gst_number, credit_limit, credit_used, price_tier, owner_id.

**`app/models/purchase_order.py`** — PO + POItem. `POStatus` enum: DRAFT, SENT, RECEIVED, CANCELLED. Has items relationship with cascade delete.

**`app/models/inventory.py`** — Movement tracking: product_id, shopkeeper_id, movement_type (SALE/PURCHASE/ADJUSTMENT/RETURN), quantity (negative for sales), reference.

**`app/models/notification.py`** — NotificationType enum: LOW_STOCK, EXPIRY, PAYMENT_REMINDER, AI_RECOMMENDATION. Fields: user_id, type, title, message, is_read, reference_id.

---

## Backend Schemas

### 27. `app/schemas/user.py`

**File:** `backend/app/schemas/user.py`

**Purpose:** Pydantic schemas for user-related request/response validation.

**Important Classes:**

| Class | Purpose |
|-------|---------|
| `UserCreate` | Request for register: `EmailStr`, password, name, role (default: "shopkeeper"), optional store_name/phone. |
| `UserLogin` | Request for login: email + password. |
| `UserResponse` | Response: id, email, name, role, store_name, phone, is_active, created_at. `model_config = {"from_attributes": True}`. |
| `TokenResponse` | Token response: access_token, refresh_token, token_type, nested `UserResponse`. |

```python
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr               # Auto-validates email format
    password: str
    name: str
    role: str = "shopkeeper"      # Default value
    store_name: str | None = None  # Optional

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    model_config = {"from_attributes": True}  # Pydantic v2 ORM mode
```

**Pattern:** Separate Create/Response schemas — `UserCreate` has `password` (request), `UserResponse` doesn't (response).

---

### 28. `app/schemas/product.py`

**File:** `backend/app/schemas/product.py`

**Purpose:** Product Create, Update (all fields optional), Response schemas.

**Key pattern:** `ProductUpdate` makes every field optional — combined with `model_dump(exclude_unset=True)` for true partial updates. `ProductResponse` includes `store_name` (derived at query time, not stored in DB).

---

### 29. `app/schemas/price_analysis.py`

**File:** `backend/app/schemas/price_analysis.py`

**Purpose:** Schemas for supplier price analysis — computed view, not a DB table.

```python
class PriceAnalysisItem(BaseModel):
    product_id: int
    product_name: str
    product_sku: str
    category: str
    supplier_id: int
    supplier_name: str
    last_supplier_price: float
    current_selling_price: float
    current_cost_price: float
    margin_percent: float
    profit_per_unit: float
    last_purchased: str | None

class SupplierPriceAnalysisResponse(BaseModel):
    supplier_id: int
    supplier_name: str
    items: list[PriceAnalysisItem]  # Nested
    avg_margin_percent: float
    total_items: int
```

---

## Services & ML

### 30. `app/services/` Overview

**`app/services/cache.py`** — Redis caching: `get(key)`, `set(key, value, ttl)`, `invalidate_pattern(pattern)`. Graceful fallback via `is_available()`.

**`app/services/notifications.py`** — `check_low_stock(product_id, user_id, db)`: called after order creation, checks if stock ≤ threshold. Creates `Notification` row. Also sends email via Resend if configured.

**`app/services/email.py`** — `send_email(to, subject, html)`: async email via Resend API. `from` sender configurable.

**`app/services/storage.py`** — Cloudflare R2 file storage: `upload(key, data, content_type)`, `download(key)`, `delete_file(key)`, `get_public_url(key)`. Uses boto3 with S3-compatible API.

**`app/services/rate_limiter.py`** — In-memory sliding window rate limiter: 100 requests/minute per IP.

**`app/services/socketio_manager.py`** — Socket.IO server mounted at `/ws`. Supports rooms per user (`user_{user_id}`).

**`app/services/task_queue.py`** — Redis-based task queue: `enqueue(type, payload)`, `dequeue()`. Task format: `{type, payload, created_at}`.

**`app/services/backup.py`** — Full DB export/import as JSON. Dumps all 13 tables with serialized timestamps.

### 31. `app/ml/predict.py`

**File:** `backend/app/ml/predict.py`

**Purpose:** ML prediction module. Loads `model.pkl` (Random Forest, 100 trees, R²=0.862) and exposes `predict_demand(features)` and `is_model_ready()`.

**Design Patterns:**
- **Lazy Loading Pattern:** Model is loaded at import time; `is_model_ready()` catches any import/load errors.
- **Singleton:** `model` is loaded once when the module is first imported, not on every request.
- **Suppress Warnings:** Scikit-learn feature name warnings are suppressed to keep logs clean.

```python
def predict_demand(input_data: dict) -> dict:
    features = pd.DataFrame([{
        "quantity_sold_7d": input_data.get("quantity_sold_7d", 10),
        "quantity_sold_30d": input_data.get("quantity_sold_30d", 30),
        "category_encoded": hash(input_data["category"]) % 20,
        "day_of_week": input_data["day_of_week"],
        "month": input_data["month"],
        "is_weekend": 1 if input_data["day_of_week"] >= 5 else 0,
        "is_holiday": input_data.get("is_holiday", 0),
    }])
    pred = model.predict(features)[0]
    predictions = [tree.predict(features)[0] for tree in model.estimators_]
    confidence = round(100 - (np.std(predictions) / np.mean(predictions) * 100), 1)
    return {
        "predicted_demand": round(float(pred)),
        "confidence_score": confidence,
        "recommended_order_qty": max(0, round(float(pred)) - input_data.get("current_stock", 0)),
    }
```

---

## Frontend Core

### 32. `src/app/layout.tsx`

**File:** `src/app/layout.tsx`

**Purpose:** Root layout — sets up Inter font as CSS variable, global CSS, wraps in `Providers`.

```tsx
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full"><Providers>{children}</Providers></body>
    </html>
  )
}
```

- `Readonly<>` — TypeScript utility wrapping props type. Standard Next.js 16 pattern.
- `inter.variable` — spreads the CSS variable for use in Tailwind via `font-sans`.

---

### 33. `src/app/providers.tsx`

**File:** `src/app/providers.tsx`

**Purpose:** Client component wrapping app with SessionProvider + QueryClientProvider.

```tsx
"use client"
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())  // Lazy init
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  )
}
```

**Pattern:** `useState(() => new QueryClient())` — factory function prevents re-creation on re-renders.

---

### 34. `src/app/(dashboard)/layout.tsx`

**File:** `src/app/(dashboard)/layout.tsx`

**Purpose:** Dashboard layout — sidebar (desktop) + top nav + bottom nav (mobile) + Toaster.

```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
      <Toaster richColors closeButton />
    </div>
  )
}
```

**Layout:** Sidebar (260px fixed) + content area (flex-1). Bottom padding `pb-20` for mobile nav, `lg:pb-6` on desktop. Content width capped at 1280px (per DESIGN.md).

---

### 35. `src/proxy.ts`

**File:** `src/proxy.ts`

**Purpose:** Route guard (Next.js 16 middleware). Redirects unauthenticated users to `/login`, authenticated users away from `/login`/`/register`.

```ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  const session = await auth()
  const isLoggedIn = !!session?.user
  const publicPaths = ["/login", "/register", "/api/auth"]

  if (!isLoggedIn && !publicPaths.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (isLoggedIn && ["/login", "/register"].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

**Pattern:** `proxy` replaces `middleware` from earlier Next.js versions. Matcher regex excludes static assets.

---

### 36. `src/lib/auth.ts`

**File:** `src/lib/auth.ts`

**Purpose:** Auth.js (NextAuth v5) configuration with credentials provider. Calls FastAPI login endpoint, stores JWT in session.

```ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const res = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        })
        if (!res.ok) return null
        const data = await res.json()
        return { id: String(data.user.id), email: data.user.email, name: data.user.name,
                 role: data.user.role, access_token: data.access_token, refresh_token: data.refresh_token }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = (user as any).role; token.access_token = (user as any).access_token }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role as string; (session as any).access_token = token.access_token
      return session
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
})
```

**Pattern:** JWT callback copies `role` + `access_token` from user object into token; Session callback copies from token into session. `(session as any).access_token` — type assertion for non-standard session properties.

---

### 37. `src/lib/client-api.ts`

**File:** `src/lib/client-api.ts`

**Purpose:** Typed HTTP client for all frontend API calls. Automatically attaches JWT Bearer token.

```ts
export const clientApi = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: await headers() })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()  // TypeScript infers T
  },
  async post<T>(path: string, body: unknown): Promise<T> { ... },
  async patch<T>(path: string, body: unknown): Promise<T> { ... },
  async delete(path: string): Promise<void> { ... },
}
```

**Pattern:** Generic `<T>` enables typed responses: `const data = await clientApi.get<Supplier[]>("/api/v1/suppliers/")`. Token fetched lazily via `getSession()` to avoid SSR issues.

---

### 38. `src/components/auth/role-guard.tsx`

**File:** `src/components/auth/role-guard.tsx`

**Purpose:** Client-side RBAC — component and hook for role-based UI filtering and access control.

```tsx
type Role = "admin" | "shopkeeper" | "customer"

export function RoleGuard({ children, allowedRoles, fallback }: {
  children: React.ReactNode; allowedRoles: Role[]; fallback?: React.ReactNode
}) {
  const { data: session, status } = useSession()
  if (status === "loading") return <div className="...">Loading...</div>
  if (!session?.user) redirect("/login")
  if (!allowedRoles.includes(session.user.role as Role)) {
    if (fallback) return <>{fallback}</>
    redirect("/dashboard")
  }
  return <>{children}</>
}

export function useRole() {
  const { data: session } = useSession()
  return { role: session?.user?.role as Role | undefined,
           isAdmin: session?.user?.role === "admin", ... }
}
```

**Pattern:** Three distinct states: loading → unauthenticated redirect → unauthorized redirect/fallback → authorized content.

---

### 39. `src/components/layout/sidebar.tsx`

**File:** `src/components/layout/sidebar.tsx`

**Purpose:** Sidebar navigation — role-filtered nav items with active-state highlighting.

```tsx
const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "shopkeeper"] },
  { label: "Catalog", href: "/catalog", icon: ShoppingBag, roles: ["customer"] },
  { label: "Price Analysis", href: "/suppliers/price-analysis", icon: LineChart, roles: ["admin", "shopkeeper"] },
  // ...17 items total
]

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useRole()
  const filteredItems = navItems.filter((item) => role && item.roles.includes(role))

  return filteredItems.map((item) => {
    const Icon = item.icon
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
    return <Link className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")} />
  })
}
```

**Pattern:** `pathname.startsWith(item.href + "/")` — also highlights when on a child route (e.g., `/suppliers/price-analysis` highlights the Suppliers nav).

---

### 40. `src/store/cart.ts`

**File:** `src/store/cart.ts`

**Purpose:** Zustand store for POS billing cart.

```ts
export interface CartItem {
  product_id: number; name: string; sku: string; unit_price: number; quantity: number
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  discount: 0,
  addItem: (item, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.product_id === item.product_id)
      if (existing) return { items: state.items.map((i) =>
        i.product_id === item.product_id ? { ...i, quantity: i.quantity + quantity } : i) }
      return { items: [...state.items, { ...item, quantity }] }
    }),
  removeItem: (productId) => set((state) => ({ items: state.items.filter((i) => i.product_id !== productId) })),
  clearCart: () => set({ items: [], discount: 0 }),
}))
```

**Pattern:** `create<Interface>()` with immutable updates via `map`/`filter`/spread. `set((state) => ({...}))` — functional update depending on current state.

---

## Frontend Pages

### 41. `src/app/login/page.tsx`

**File:** `src/app/login/page.tsx`

**Purpose:** Login page — credentials form using Auth.js `signIn()`.

```tsx
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await signIn("credentials", { email, password, redirect: false })
    if (result?.error) setError("Invalid email or password")
    else router.push("/dashboard")
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Boxes className="size-8 text-primary" />
        <CardTitle>Welcome to KhataBox</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full">Sign In</Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Pattern:** `signIn("credentials", { ..., redirect: false })` — manual redirect for client-side control. Error state via local `useState`.

---

### 42. `src/app/(dashboard)/dashboard/page.tsx`

**File:** `src/app/(dashboard)/dashboard/page.tsx`

**Purpose:** Dashboard page — 4 metric cards (inventory value, today's sales, pending orders, low stock) with loading skeletons.

```tsx
"use client"
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clientApi.get<DashboardStats>("/api/v1/dashboard/stats")
      .then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  // Card config with conditional rendering
  const cards = [{ title: "Total Inventory Value", icon: DollarSign,
    value: stats ? `₹${stats.total_inventory_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null,
    change: "+12.5%", changePositive: true }]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-3/4" />
              : <div className="text-2xl font-bold">{card.value}</div>}
            <p className={`text-xs ${card.changePositive ? "text-emerald-600" : "text-destructive"}`}>{card.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Pattern:** `useEffect` + `clientApi.get` for data fetching. Skeleton loading states. `toLocaleString("en-IN")` for Indian number formatting (₹ symbol, comma placement).

---

### 43. `src/app/(dashboard)/suppliers/page.tsx`

**File:** `src/app/(dashboard)/suppliers/page.tsx`

**Purpose:** Full CRUD suppliers page with search, table, form dialog (create + edit), delete confirmation dialog.

**Patterns demonstrated:**
- `useState` for list, search, dialog state, editing item, delete confirmation
- `useEffect` for initial load
- Filtered list with case-insensitive search across name/contact/email
- Reusable `SupplierFormDialog` component (same form for create + edit)
- Optimistic refresh: after create/update/delete, re-fetch the list

---

### 44. `src/app/(dashboard)/notifications/page.tsx`

**File:** `src/app/(dashboard)/notifications/page.tsx`

**Purpose:** Notification center — fetches from real API, displays with type icons, mark-as-read, type filter, mark-all-read.

**Patterns demonstrated:**
- `Record<NotificationType, { icon, color, label }>` — type-safe config object for dynamic icon rendering
- `clientApi.patch` for both single and bulk mark-as-read
- Type filter buttons with conditional active styling
- Optimistic UI: after API call succeeds, update local state immediately without re-fetch
- `timeAgo()` helper: relative timestamps (5m ago, 2h ago, 3d ago)

---

## Seed Script & Data

### 45. `backend/seed.py`

**File:** `backend/seed.py`

**Purpose:** Populates DB with sample data for development/demo. Idempotent — deletes and recreates all data.

**Seeded data:** 50 products (5 categories × 10), 8 suppliers, 5 B2B customers (with User accounts), 30 orders (with items + inventory movements), 10 purchase orders (with items), 6 notifications.

**Credentials:**
- Admin: admin@khatabox.com / Admin@123
- Shopkeeper: shop@khatabox.com / Shop@123
- Customers: tech.corp@client.com / customer123 (5 customers)

**Important:** Seed script DELETES all data from 7 tables before inserting — it is idempotent but destructive.

---

## Summary: Design Patterns Reference

| Pattern | Where Used |
|---------|-----------|
| **Dependency Injection** | FastAPI `Depends()` on every route — `get_db`, `get_current_user` |
| **Middleware** | Rate limiting + performance headers in `main.py` |
| **Lifespan** | `@asynccontextmanager` for startup/shutdown |
| **Singleton** | `settings = Settings()` in config.py |
| **Factory Pattern** | `require_role(*roles)` returns a dependency closure |
| **DTO Pattern** | Separate Create/Response Pydantic schemas |
| **Unit of Work** | Single DB transaction per request (flush + commit) |
| **Cache-Aside** | Check cache → compute → store (dashboard, 300s TTL) |
| **Parallel Queries** | `asyncio.gather` for independent DB queries |
| **Graceful Degradation** | All services check `is_available()` before use |
| **Soft Delete** | `is_active` flag instead of hard DELETE |
| **Query Builder** | Incremental `.where()` chaining based on filters |
| **Partial Update** | `model_dump(exclude_unset=True)` for PUT |
| **Fallback** | ML model → heuristic formula (forecasting) |
| **Font Fallback** | Try Arial → PIL default (QR labels) |

---

## Summary: Critical Gotchas (Must-Know for Interviews)

1. **`values_callable` on Enum columns** — Without `Enum(UserRole, values_callable=lambda x: [e.value for e in x])`, the DB stores `"ADMIN"` instead of `"admin"`. Must be on every Enum column.

2. **`selectinload` in async** — Lazy loading relationships in async SQLAlchemy sessions causes `DetachedInstanceError`. Always use `.options(selectinload(Relationship))`.

3. **`expire_on_commit=False`** — Required in the async session factory. Without it, accessing model attributes after `commit()` triggers lazy loads on closed sessions.

4. **`bcrypt==4.0.1`** — Pinned because passlib 1.7.4 is incompatible with bcrypt ≥5.0. Upgrading bcrypt silently breaks password hashing.

5. **`scikit-learn==1.9.0`** — Pinned because `model.pkl` was trained on 1.9.0. Loading it with a different scikit-learn version causes `InconsistentVersionWarning`.

6. **Route ordering in FastAPI** — Static paths (`/mark-all-read`) must be registered before parameterized paths (`/{id}/read`).

7. **`flush()` vs `commit()`** — Flush sends to DB but doesn't persist (other connections can't see it). Commit persists. Use flush to get IDs mid-transaction.

8. **Port 8000 blocked** — Phantom process on dev machine. Always use 8001+ for local backend.

9. **`model_validate()` not `from_orm()`** — Pydantic v2 uses `UserResponse.model_validate(user)` not `UserResponse.from_orm(user)`.

10. **401 vs 403** — Invalid/missing token = 401. Valid token + wrong role = 403. Backend enforces via `get_current_user` (401) and `require_role` (403).
