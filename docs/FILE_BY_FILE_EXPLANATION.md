# KhataBox — File-by-File Explanation

> A comprehensive walkthrough of every major file in the codebase, written for a senior engineer teaching a student. Each entry covers: **purpose, imports, key functions, execution flow, design patterns, interview explanation, and important syntax.**

---

## Table of Contents

- [Backend Core](#backend-core)
  - [app/main.py](#appmainpy)
  - [app/config.py](#appconfigpy)
  - [app/core/database.py](#appcoredatabasepy)
  - [app/core/security.py](#appcoresecuritypy)
  - [app/core/dependencies.py](#appcoredependenciespy)
- [Backend API Layer](#backend-api-layer)
  - [app/api/v1/\_\_init\_\_.py](#appapiv1__init__py)
  - [app/api/v1/auth.py](#appapiv1authpy)
  - [app/api/v1/products.py](#appapiv1productspy)
  - [app/api/v1/orders.py](#appapiv1orderspy)
  - [app/api/v1/dashboard.py](#appapiv1dashboardpy)
  - [app/api/v1/catalog.py](#appapiv1catalogpy)
  - [app/api/v1/forecasting.py](#appapiv1forecastingpy)
  - [app/api/v1/reports.py](#appapiv1reportspy)
  - [app/api/v1/notifications.py](#appapiv1notificationspy)
  - [app/api/v1/qrcodes.py](#appapiv1qrcodespy)
  - [app/api/v1/invoices.py](#appapiv1invoicespy)
  - [app/api/v1/data.py](#appapiv1datapy)
- [Backend Service Layer](#backend-service-layer)
  - [app/services/email.py](#appservicesemailpy)
  - [app/services/cache.py](#appservicescachepy)
  - [app/services/storage.py](#appservicesstoragepy)
  - [app/services/rate_limiter.py](#appservicesrate_limiterpy)
  - [app/services/task_queue.py](#appservicestask_queuepy)
  - [app/services/notifications.py](#appservicesnotificationspy)
  - [app/services/backup.py](#appservicesbackuppy)
  - [app/services/socketio_manager.py](#appservicessocketio_managerpy)
- [Backend Models & Schemas](#backend-models--schemas)
  - [app/models/user.py](#appmodelsuserpy)
  - [app/models/product.py](#appmodelsproductpy)
  - [app/models/order.py](#appmodelsorderpy)
  - [app/schemas/user.py](#appschemasuserpy)
  - [app/schemas/product.py](#appschemasproductpy)
  - [app/schemas/order.py](#appschemasorderpy)
- [Backend ML Layer](#backend-ml-layer)
  - [app/ml/train.py](#appmltrainpy)
  - [app/ml/predict.py](#appmlpredictpy)
- [Backend Infrastructure](#backend-infrastructure)
  - [seed.py](#seedpy)
  - [Dockerfile](#dockerfile)
  - [requirements.txt](#requirementstxt)
- [Frontend Core](#frontend-core)
  - [src/lib/auth.ts](#srclibauthsts)
  - [src/lib/client-api.ts](#srclibclient-apits)
  - [src/store/cart.ts](#srcstorecartts)
- [Frontend Components](#frontend-components)
  - [src/components/layout/sidebar.tsx](#srccomponentslayoutsidebartsx)
  - [src/components/layout/bottom-nav.tsx](#srccomponentslayoutbottom-navtsx)
  - [src/components/auth/role-guard.tsx](#srccomponentsauthrole-guardtsx)
- [Frontend Pages](#frontend-pages)
  - [src/app/(dashboard)/layout.tsx](#srcappdashboardlayouttsx)
  - [src/app/(dashboard)/dashboard/page.tsx](#srcappdashboarddashboardpagetsx)
  - [src/app/(dashboard)/inventory/page.tsx](#srcappdashboardinventorypagetsx)
  - [src/app/(dashboard)/billing/page.tsx](#srcappdashboardbillingpagetsx)

---

# Backend Core

## app/main.py

**Path:** `backend/app/main.py` (64 lines)

### Purpose
The application entry point. Creates the FastAPI app instance, configures middleware (CORS, rate limiting, performance headers), mounts the Socket.IO server, initializes external services (Sentry, PostHog), and registers all API routes.

### Imports Used
```python
import time                              # For performance timing
from contextlib import asynccontextmanager  # For lifespan handler
import sentry_sdk                        # Error tracking
from fastapi import FastAPI, Request     # Framework core
from fastapi.middleware.cors import CORSMiddleware  # CORS
import posthog                           # Product analytics
from app.api.v1 import router as v1_router      # All API routes
from app.config import settings          # Env config
from app.services.rate_limiter import rate_limit_middleware
from app.services.socketio_manager import socket_app
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `lifespan(app)` | Async context manager for startup/shutdown events. Currently a no-op (`yield`). |
| `rate_limit(request, call_next)` | HTTP middleware: delegates to rate limiter service before processing request. |
| `add_performance_headers(request, call_next)` | HTTP middleware: times the request and adds `X-Response-Time` header. |
| `health()` | Simple health check endpoint returning `{"status": "ok"}`. |

### Execution Flow

1. **Module level** (lines 21-32) — Sentry and PostHog are initialized with settings from env vars. These run at import time, before the app is created.
2. **`app = FastAPI(...)`** (line 34) — Creates the FastAPI instance with title, version, and lifespan handler.
3. **`app.add_middleware(CORSMiddleware)`** (line 36) — Adds CORS middleware with origins from `settings.CORS_ORIGINS` (comma-separated).
4. **`app.mount("/ws", socket_app)`** (line 44) — Mounts the Socket.IO ASGI app at the `/ws` path. This is a separate ASGI app, not a FastAPI route.
5. **`app.include_router(v1_router)`** (line 45) — Registers all 18 API route modules under the v1 router.
6. **`@app.middleware("http")`** (lines 48-59) — Registers two HTTP middleware functions. Order matters: rate limiter runs first, then performance timing wraps the entire request.

### Design Patterns

- **Middleware pipeline** — Two HTTP middleware functions stacked in sequence. Rate limiting runs before the request handler to reject early. Performance timing wraps the entire chain.
- **Separate ASGI mount** — Socket.IO runs on its own ASGI app, not as FastAPI middleware. This keeps WebSocket lifecycle separate from HTTP request/response.
- **Global initialization** — Sentry and PostHog are initialized at module level (not inside lifespan) because they need to be available before the app starts accepting requests.

### Interview Explanation

**"How does the app start?"** — When uvicorn runs `app.main:app`, Python executes the module top-to-bottom. First, Sentry and PostHog are configured (they'll be no-ops if DSN/key are empty). Then the FastAPI app is created with a lifespan context manager (currently empty, but could start DB connection pools or background tasks). CORS middleware is added to allow cross-origin requests. The Socket.IO server is mounted at `/ws` — this is a separate ASGI application that runs alongside the FastAPI app on the same port. Finally, all 18 route modules are registered under the `/api/v1` prefix.

**"Why two middleware functions instead of one?"** — Separation of concerns. The rate limiter and performance timer do different things. Stacking them as separate middleware makes each one simpler, testable, and independently removable.

### Important Syntax

```python
@app.middleware("http")
async def rate_limit(request: Request, call_next):
    return await rate_limit_middleware(request, call_next)
```

This is FastAPI's decorator-based middleware syntax. `call_next` is a function that passes the request to the next middleware (or the route handler). The middleware must return `await call_next(request)` to continue the chain.

---

## app/config.py

**Path:** `backend/app/config.py` (25 lines)

### Purpose
Centralized configuration management using Pydantic's `BaseSettings`. Reads environment variables from `.env` file and provides typed, validated settings to the entire application.

### Imports Used
```python
from pydantic_settings import BaseSettings  # Pydantic v2 settings management
```

### Key Definitions

| Setting | Type | Default | Required | Description |
|---------|------|---------|----------|-------------|
| `DATABASE_URL` | str | `localhost:5432/khatabox` | ✅ | PostgreSQL async connection string |
| `SECRET_KEY` | str | `change-me` | ✅ | JWT signing secret |
| `ALGORITHM` | str | `HS256` | ❌ | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | int | `30` | ❌ | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | int | `7` | ❌ | Refresh token lifetime |
| `REDIS_URL` | str | `redis://localhost:6379` | ❌ | Redis connection string |
| `RESEND_API_KEY` | str | `""` | ❌ | Resend email API key |
| `POSTHOG_API_KEY` | str | `""` | ❌ | PostHog analytics key |
| `POSTHOG_HOST` | str | `https://us.i.posthog.com` | ❌ | PostHog API host |
| `SENTRY_DSN` | str | `""` | ❌ | Sentry DSN |
| `CORS_ORIGINS` | str | `http://localhost:3000` | ✅ | Comma-separated allowed origins |
| `R2_*` (5 vars) | str | `""` | ❌ | Cloudflare R2 credentials |

### Execution Flow

At module level, `settings = Settings()` instantiation triggers Pydantic to:
1. Look for `.env` file in the current directory
2. Read all matching environment variables
3. Parse and validate each value to the declared Python type
4. Return the singleton `settings` object

### Design Patterns

- **Singleton** — `settings` is created once at module level and imported by every file that needs config. There's no need for dependency injection here because config is read-only.
- **Typed defaults** — Every setting has a sensible default. Optional services (Redis, R2, Resend, Sentry, PostHog) default to empty strings, enabling graceful degradation.
- **`model_config`** — Pydantic v2 uses `model_config` dict instead of the v1 `Config` class.

### Interview Explanation

**"Why Pydantic Settings instead of os.getenv or python-dotenv?"** — Pydantic Settings provides type coercion and validation. If `ACCESS_TOKEN_EXPIRE_MINUTES` is set to `"thirty"` instead of `"30"`, Pydantic raises a validation error at startup. `os.getenv` returns strings only, forcing manual type conversion everywhere. Pydantic also handles `.env` file loading automatically.

### Important Syntax

```python
model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
```

This Pydantic v2 syntax replaces the v1 `Config` class. It tells Pydantic to read a `.env` file in the project root.

---

## app/core/database.py

**Path:** `backend/app/core/database.py` (19 lines)

### Purpose
Creates the async SQLAlchemy engine and session factory for PostgreSQL connectivity. Defines the declarative `Base` class that all models inherit from.

### Imports Used
```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
```

### Key Definitions

| Symbol | Purpose |
|--------|---------|
| `engine` | Single `AsyncEngine` instance, created once at module level |
| `async_session` | `async_sessionmaker` factory that creates `AsyncSession` instances |
| `Base` | Declarative base class for all ORM models |
| `get_db()` | Async generator dependency that yields a session and closes it after use |

### Execution Flow

1. **Module level** — `engine` and `async_session` are created once.
   - `create_async_engine(settings.DATABASE_URL, echo=False)` — Creates the database engine. `echo=False` disables SQL logging.
   - `async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)` — Creates a session factory. `expire_on_commit=False` prevents SQLAlchemy from expiring all attributes after commit (important for returning objects to the client after commit).
2. **Per request** — FastAPI calls `get_db()` as a dependency:
   ```python
   async with async_session() as session:
       yield session
       await session.close()
   ```
   FastAPI's dependency injection system manages the lifecycle. The session is created when the endpoint starts and closed when it ends.

### Design Patterns

- **Dependency injection** — `get_db()` is a FastAPI dependency, so each request gets its own session. This is cleaner than manual `with` blocks in every route handler.
- **Module-level singletons** — `engine` and `async_session` are created once and reused. Creating an engine is expensive (TCP connection pool initialization), so it should be done once.
- **`expire_on_commit=False`** — Without this, SQLAlchemy marks all loaded attributes as "expired" after commit, triggering a lazy load on the next attribute access. Since we return objects to the client after commit, we disable this.

### Interview Explanation

**"How does async SQLAlchemy work?"** — Traditional SQLAlchemy uses blocking I/O — each query blocks the Python thread until the database responds. Async SQLAlchemy uses Python's `asyncio` event loop and `asyncpg` (the async PostgreSQL driver). When a query is sent, the event loop can handle other requests while waiting for the database. This means a single uvicorn worker can handle hundreds of concurrent requests without thread pool overhead.

**"Why `expire_on_commit=False`?"** — By default, SQLAlchemy expires all objects after commit (marks them as stale). The next attribute access triggers a lazy load. In a web API, we typically query an object, modify it, commit, and return it in a response. Without `expire_on_commit=False`, the response serialization would trigger additional lazy-loaded queries — defeating the purpose of eager loading with `selectinload`.

### Important Syntax

```python
async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

This is an **async generator** — it's a special Python construct that can `yield` values asynchronously. FastAPI's DI system calls `get_db()`, gets the session, passes it to the route handler, and when the handler completes, execution resumes after `yield` to close the session. The `try/finally` ensures cleanup even if the handler raises an exception.

---

## app/core/security.py

**Path:** `backend/app/core/security.py` (37 lines)

### Purpose
Handles all authentication primitives: password hashing (bcrypt), JWT token creation (access + refresh), and JWT token validation.

### Imports Used
```python
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt          # JWT encode/decode (python-jose)
from passlib.context import CryptContext  # Password hashing (passlib + bcrypt 4.0.1)
```

### Key Functions

| Function | Purpose | Return |
|----------|---------|--------|
| `hash_password(password)` | Bcrypt hash | str (hash string) |
| `verify_password(plain, hashed)` | Verify against hash | bool |
| `create_access_token(data)` | JWT with 30-min expiry | str (token) |
| `create_refresh_token(data)` | JWT with 7-day expiry | str (token) |
| `decode_token(token)` | Decode + validate JWT | dict or None |

### Execution Flow

**Creating a token:**
1. Copy the input `data` dict (e.g., `{"sub": "1", "role": "admin"}`)
2. Add an `exp` claim: `datetime.now(timezone.utc) + timedelta`
3. Encode with `jwt.encode(payload, SECRET_KEY, algorithm="HS256")`

**Verifying a token:**
1. Call `jwt.decode(token, SECRET_KEY, algorithms=["HS256"])`
2. python-jose checks: valid signature, not expired, valid `iat`
3. Returns decoded payload dict, or raises `JWTError` on failure
4. The function catches `JWTError` and returns `None` — the caller decides how to handle

### Design Patterns

- **Single-responsibility functions** — Each function does exactly one thing: hash, verify, create access, create refresh, decode. No side effects.
- **Explicit UTC** — All timestamps use `timezone.utc` to avoid timezone-related bugs.
- **No state** — The security module is stateless. JWT tokens contain all necessary information (user ID, role) and are validated by signature alone.

### Interview Explanation

**"How does JWT auth work?"** — When a user logs in, the server creates a JSON Web Token containing the user's ID and role, signs it with a secret key using HMAC-SHA256, and sets an expiration time. The client stores this token and sends it in the `Authorization: Bearer <token>` header on every request. The server decodes the token on each request, extracts the user ID and role, and uses them for authorization. The server never stores tokens — they're self-contained.

**"Why two tokens (access + refresh)?"** — Short-lived access tokens (30 min) limit damage if a token is stolen. The long-lived refresh token (7 days) allows the client to get new access tokens without re-entering credentials. This is a standard pattern that balances security (short-lived access token) with UX (no frequent re-login).

**"Why bcrypt specifically?"** — Bcrypt is intentionally slow (configurable cost factor, default 12). This makes brute-force attacks computationally expensive. SHA-256 hashes (used for JWT) are fast — fine for signing, terrible for passwords. Bcrypt also includes a random salt, so identical passwords produce different hashes.

### Important Syntax

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

`CryptContext` from passlib supports multiple hashing schemes. `schemes=["bcrypt"]` means only bcrypt is used. `deprecated="auto"` means any non-bcrypt hash is automatically upgraded to bcrypt on verification. This is important because bcrypt 4.0.1 is pinned (newer versions are incompatible with passlib).

```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()  # Don't mutate the input
    expire = datetime.now(timezone.utc) + timedelta(...)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

Note `data.copy()` — don't modify the caller's dict. Always work on a copy.

---

## app/core/dependencies.py

**Path:** `backend/app/core/dependencies.py` (35 lines)

### Purpose
Provides FastAPI dependencies for authentication (`get_current_user`) and authorization (`require_role`). These are injected into route handlers to protect endpoints.

### Imports Used
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer  # OpenAPI security scheme
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `get_current_user()` | Decodes Bearer token, looks up user in DB, returns User or 401 |
| `require_role(*roles)` | Factory: returns a dependency that checks `current_user.role` is in specified roles |

### Execution Flow

**`get_current_user`:**
1. FastAPI's `HTTPBearer` extracts the `Authorization: Bearer <token>` header
2. `decode_token(credentials.credentials)` decodes the JWT
3. If invalid → raise 401
4. Extract `sub` (user ID) from payload
5. Query DB: `SELECT * FROM users WHERE id = :user_id`
6. If not found → raise 401
7. Return `User` ORM object

**`require_role("admin")`:**
1. First calls `get_current_user` (via `Depends`)
2. Checks `current_user.role not in roles`
3. If not allowed → raise 403
4. Return `User` ORM object

### Design Patterns

- **Dependency factory** — `require_role` is a factory function that returns a dependency. The pattern: `require_role("admin")` returns a function that FastAPI uses as a Depends. This allows parameterized role checks.
- **Chained dependencies** — `require_role` internally depends on `get_current_user`. FastAPI's DI system automatically resolves this chain. The route only declares `require_role("admin")`, and FastAPI calls `get_current_user` first.
- **Early rejection** — Both dependencies raise `HTTPException` immediately on failure. FastAPI catches these and returns the error response without executing the route handler.

### Interview Explanation

**"How does the role-based access control work?"** — FastAPI dependencies are functions that run before the route handler. `get_current_user` extracts the JWT from the Authorization header, validates it, and loads the user from the database. If the token is invalid or the user doesn't exist, it returns a 401 immediately. For role-specific endpoints, `require_role("admin")` wraps `get_current_user` and adds an additional check — if the user's role isn't "admin", it returns 403. The route handler never executes if auth fails.

**"Why DB lookup on every request instead of just trusting the JWT?"** — If we only decoded the JWT without DB lookup, a deactivated user could still use their token until it expires (30 minutes). The DB lookup on every request ensures real-time account status. The cost is one indexed query (~2-5ms) per request, which is acceptable.

### Important Syntax

```python
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
```

`HTTPBearer()` is a FastAPI utility that automatically:
1. Parses the `Authorization` header
2. Validates it's a Bearer token
3. Returns an `HTTPAuthorizationCredentials` object
4. Adds the security scheme to OpenAPI docs (the "Authorize" button in Swagger)

```python
def require_role(*roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        ...
    return role_checker
```

This is a **closure**: `require_role` captures `roles`, and the inner function `role_checker` (which FastAPI treats as the actual dependency) accesses it from the enclosing scope.

---

# Backend API Layer

## app/api/v1/\_\_init\_\_.py

**Path:** `backend/app/api/v1/__init__.py` (42 lines)

### Purpose
Aggregates all 18 API route modules into a single router with the `/api/v1` prefix. This is the single point where all endpoints are registered.

### Imports Used
```python
from fastapi import APIRouter
# 18 route modules
from app.api.v1 import auth, catalog, dashboard, data, products, orders, ...
```

### Key Definitions

| Symbol | Purpose |
|--------|---------|
| `router` | Main `APIRouter` with `prefix="/api/v1"` |
| 18 `include_router` calls | Each sub-router mounted under its own prefix |

### Execution Flow

1. Imports all 18 route modules (each has its own `router = APIRouter()`)
2. Creates a parent router with `prefix="/api/v1"`
3. Mounts each sub-router with a unique path prefix and OpenAPI tag

### Design Patterns

- **Router hierarchy** — A parent router with sub-routers. This creates clean URL namespaces: `/api/v1/products/`, `/api/v1/orders/`, etc.
- **Tag-based OpenAPI grouping** — Each `include_router` call adds a `tags` parameter that groups endpoints in Swagger UI.

### Important Syntax

```python
router = APIRouter(prefix="/api/v1")
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
```

The final path is `prefix + prefix = "/api/v1/auth"`. FastAPI does not double-slash.

---

## app/api/v1/auth.py

**Path:** `backend/app/api/v1/auth.py` (102 lines)

### Purpose
Handles all authentication and user management: register, login, get current user, list users (admin), update role (admin), toggle active (admin).

### Imports Used
```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
```

### Key Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Create account, return tokens |
| POST | `/login` | Public | Validate credentials, return tokens |
| GET | `/me` | Bearer | Current user profile |
| GET | `/users` | Admin | List all users (with role/search filters) |
| PATCH | `/users/{id}/role` | Admin | Change user role |
| PATCH | `/users/{id}/toggle-active` | Admin | Enable/disable user |

### Key Functions (non-endpoint)

| Function | Purpose |
|----------|---------|
| `register(payload, db)` | Check email uniqueness, create user, generate tokens |
| `login(payload, db)` | Find user by email, verify password, generate tokens |
| `get_me(current_user)` | Return validated user object |
| `list_users(role, search, current_user, db)` | Filtered user list (admin only) |
| `update_user_role(user_id, new_role, current_user, db)` | Validate role enum, assign, return |

### Execution Flow

**Registration:**
1. Check email uniqueness → if exists, 400
2. `hash_password(payload.password)` → bcrypt hash
3. Create `User` ORM instance with all fields
4. `db.add(user)`, `db.commit()`, `db.refresh(user)`
5. Create access + refresh tokens
6. Return `TokenResponse` (tokens + user)

**Login:**
1. Query user by email
2. If not found or password doesn't match → 401 (same error message to prevent email enumeration)
3. Create access + refresh tokens
4. Return `TokenResponse`

### Design Patterns

- **Public vs protected routes** — `/register` and `/login` have no auth dependency. All others use `get_current_user` or `require_role("admin")`.
- **Consistent error messages** — Login uses the same message for "user not found" and "wrong password" to prevent attackers from guessing valid emails.

### Interview Explanation

**"How is password security handled?"** — Passwords are never stored in plain text. On registration, `hash_password()` uses bcrypt with a random salt and a cost factor of 12 (~250ms per hash). On login, `verify_password()` compares the plaintext against the stored hash. The bcrypt algorithm handles everything — salt generation, hash computation, and constant-time comparison to prevent timing attacks.

### Important Syntax

```python
result = await db.execute(select(User).where(User.email == payload.email))
user = result.scalar_one_or_none()
```

`.scalar_one_or_none()` returns a single row or `None`. If multiple rows match, it raises an error. Use `scalars().all()` for multiple results, `.one()` when exactly one is expected (raises if zero or multiple), and `.scalar_one_or_none()` for optional single results.

---

## app/api/v1/products.py

**Path:** `backend/app/api/v1/products.py` (155 lines)

### Purpose
Full CRUD for products plus image upload to Cloudflare R2. Includes product listing with search, filtering by category/brand/stock status/price/store, and a helper function that enriches responses with store names.

### Imports Used
```python
import uuid                               # Unique filenames for image uploads
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.product import Product
from app.models.store import Store
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.notifications import check_low_stock
from app.services.storage import upload as r2_upload, is_available as r2_available
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List products with filters + full-text search |
| POST | `/` | Create product (triggers low-stock check) |
| GET | `/{id}` | Get single product |
| PUT | `/{id}` | Update product (triggers low-stock check if stock changed) |
| POST | `/{id}/image` | Upload product image to R2 |
| DELETE | `/{id}` | Soft-delete (sets `is_active=False`) |

### Key Functions

| Function | Purpose |
|----------|---------|
| `_enrich_store_name(product, resp, db)` | Helper that queries store name by `store_id` and attaches it to the response |
| `list_products(...)` | 8 optional filters, full-text search via `search_vector @@ plainto_tsquery`, batch store name enrichment |
| `create_product(payload, current_user, db)` | Validate SKU uniqueness, create, check low stock, enrich store name |
| `upload_product_image(product_id, file, current_user, db)` | Validate image type, generate UUID filename, upload to R2 or set placeholder |

### Execution Flow

**Product Listing (with filters):**
1. Start with `select(Product).where(Product.owner_id == current_user.id, Product.is_active == True)`
2. Chain additional filters based on query params
3. For search: `Product.search_vector.op("@@")(func.plainto_tsquery("english", search))`
4. Execute query, get all matching products
5. Batch-load store names: collect all store IDs, query stores in one query, build `{store_id: name}` dict
6. Build response list with store names attached

**Image Upload:**
1. Find product, verify ownership
2. Validate `content_type` starts with `"image/"`
3. Generate storage key: `products/{user_id}/{product_id}_{8-char-uuid}.{ext}`
4. Check `r2_available()` — if R2 is configured, upload to bucket; if not, set placeholder URL
5. `product.image_url = f"{R2_PUBLIC_URL}/{key}"` or placeholder
6. Commit, refresh, return enriched response

### Design Patterns

- **Batch enrichment** — Instead of making N queries for N products' store names, collect all store IDs and do one `in_()` query. This is the classic N+1 optimization.
- **Graceful storage degradation** — If R2 isn't configured, the image upload still "succeeds" with a placeholder URL. The caller doesn't need to handle a 500 error.
- **Soft-delete** — Products are never hard-deleted. `is_active = False` hides them from queries while preserving referential integrity for historical orders.

### Important Syntax

```python
query = select(Product).where(Product.owner_id == current_user.id, Product.is_active == True)
# ...
if stock_status == "in_stock":
    query = query.where(Product.stock_quantity > Product.reorder_threshold)
# ...
result = await db.execute(query)
products = result.scalars().all()
```

SQLAlchemy 2.0 uses "unified" query style — always start with `select()`, chain `.where()`, and execute with `await db.execute()`. The old `query = db.query(Product).filter_by()` style is deprecated.

```python
resp.store_name = stores.get(p.store_id) if p.store_id else None
```

Responses are Pydantic models with `from_attributes = True`, so we can assign attributes directly after `model_validate()`.

---

## app/api/v1/orders.py

**Path:** `backend/app/api/v1/orders.py` (188 lines)

### Purpose
Order management with two distinct flows: (1) shopkeeper creates orders for in-store billing, (2) B2B customers create bulk orders with credit limit enforcement. Includes order listing, detail, status updates, and automatic low-stock notifications.

### Imports Used
```python
import random, string                     # Order number generation
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload   # N+1 prevention
from app.models.customer import Customer
from app.models.inventory import InventoryMovement, MovementType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.order import BulkOrderCreate, OrderCreate, OrderResponse, OrderStatusUpdate
from app.services.notifications import check_low_stock
```

### Key Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Bearer | List shopkeeper's orders (with items loaded) |
| POST | `/` | Bearer | Create order (billing flow) |
| POST | `/bulk` | Bearer | B2B bulk order with credit check |
| GET | `/my-orders` | Bearer | Customer's order history (via email match) |
| GET | `/{id}` | Bearer | Get single order detail |
| PATCH | `/{id}/status` | Bearer | Update order status |

### Key Functions

| Function | Purpose |
|----------|---------|
| `generate_order_number()` | Creates `ORD-XXXXXXXX` (8 random digits) |
| `create_order(payload, current_user, db)` | Standard billing flow: compute subtotal/GST/total, create order + items + inventory movement, check low stock |
| `create_bulk_order(payload, current_user, db)` | B2B flow: resolve customer by email, credit check, create order + items + movements, deduct credit |
| `my_orders(current_user, db)` | Customer flow: resolve customer by email, return their orders |

### Execution Flow

**Standard Order Creation:**
1. Compute `subtotal = sum(item.unit_price * item.quantity)`
2. Compute `gst = subtotal * 0.18`
3. Compute `total = subtotal + gst - discount`
4. Create `Order` with generated order number
5. For each item: create `OrderItem`, decrement `Product.stock_quantity`, create `InventoryMovement(quantity=-item.quantity, movement_type="sale")`
6. Call `check_low_stock()` for each product
7. Commit, return order with items

**Bulk Order (B2B):**
1. Validate items not empty
2. Resolve customer: `SELECT * FROM customers WHERE email = current_user.email`
3. Compute totals
4. If `payment_method == "credit"`: check `credit_limit - credit_used >= total`; if not, 402
5. Create order + items + movements (shopkeeper_id = customer.owner_id)
6. If credit: `customer.credit_used += total`
7. Commit

### Design Patterns

- **Order number generation** — Random numeric string `ORD-XXXXXXXX` instead of DB auto-increment. This hides order volume from competitors and provides a clean customer-facing reference.
- **Credit enforcement** — The credit check and deduction happen in the same transaction. If the commit fails, everything rolls back — no partially applied credits.
- **Dual ownership** — `shopkeeper_id` is set to `customer.owner_id` for bulk orders, so the order appears in the correct shopkeeper's dashboard.

### Important Syntax

```python
.order_by(Order.created_at.desc())
```

SQLAlchemy's `.desc()` is a method on columns. Equivalent: `order_by(desc(Order.created_at))` with `from sqlalchemy import desc`.

```python
result = await db.execute(
    select(Order).where(Order.shopkeeper_id == current_user.id)
    .options(selectinload(Order.items))
)
```

`selectinload` is the async-safe way to eagerly load relationships. It executes a second query (`SELECT * FROM order_items WHERE order_id IN (...)`) instead of lazy-loading (N+1 queries). In async mode, lazy loading doesn't work because it requires a sync DB call.

---

## app/api/v1/dashboard.py

**Path:** `backend/app/api/v1/dashboard.py` (66 lines)

### Purpose
Provides aggregated dashboard statistics (total products, inventory value, today's sales, pending orders, low stock count) using parallel queries and Redis caching.

### Imports Used
```python
import asyncio                            # asyncio.gather for parallel queries
from datetime import datetime, timezone
from sqlalchemy import func, select
from app.services.cache import get as cache_get, set as cache_set, is_available as cache_available
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | 5 aggregated metrics, parallel execution, Redis cached |

### Key Functions

| Function | Purpose |
|----------|---------|
| `count_products()` | `SELECT COUNT(*) FROM products WHERE owner_id = :uid AND is_active = true` |
| `inventory_value()` | `SELECT SUM(cost_price * stock_quantity) FROM products WHERE owner_id = :uid AND is_active = true` |
| `today_sales()` | `SELECT COUNT(*), SUM(total) FROM orders WHERE shopkeeper_id = :uid AND created_at >= :today_start` |
| `pending_count()` | `SELECT COUNT(*) FROM orders WHERE shopkeeper_id = :uid AND status = 'pending'` |
| `low_stock_count()` | `SELECT COUNT(*) FROM products WHERE owner_id = :uid AND is_active = true AND stock_quantity <= reorder_threshold` |

### Execution Flow

1. Check Redis cache: `cache_get("dashboard:{user_id}")` → if hit, return immediately
2. Define 5 async closures (each is a coroutine function)
3. Execute all 5 in parallel: `results = await asyncio.gather(count_products(), inventory_value(), today_sales(), pending_count(), low_stock_count())`
4. Build response dict from results
5. Store in Redis: `cache_set("dashboard:{user_id}", data, ttl=300)`
6. Return data

### Design Patterns

- **Parallel execution** — 5 independent DB queries run concurrently via `asyncio.gather`. Without this, they'd run sequentially (~50ms × 5 = 250ms). With parallel, ~50ms total (slowest query wins).
- **Cache-aside (lazy loading)** — Check cache first. If miss, compute, populate cache. This is the simplest caching pattern and works well for read-heavy dashboards.
- **Inline closures** — The 5 query functions are defined inside the endpoint function. This keeps them close to where they're used and avoids polluting module namespace.

### Interview Explanation

**"Why `asyncio.gather` instead of sequential queries?"** — Each DB query is an async I/O operation. Without `gather`, the event loop processes them one at a time: start query 1, wait, get result, start query 2, wait, etc. With `gather`, the event loop starts all 5 queries simultaneously and resumes processing each one as its result arrives. This is the async equivalent of parallel execution, but note that PostgreSQL itself processes them sequentially on the same connection.

**"Why cache the dashboard specifically?"** — Dashboard data is the most frequently accessed (every page load) and most expensive to compute (5 aggregate queries). A 5-minute TTL means the cache is stale for at most 5 minutes, which is acceptable for summary statistics.

### Important Syntax

```python
async def today_sales():
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    r = await db.execute(
        select(func.count(Order.id), func.coalesce(func.sum(Order.total), 0))
        .where(Order.shopkeeper_id == current_user.id, Order.created_at >= today_start)
    )
    c, a = r.one()
    return c, round(a or 0, 2)
```

`func.count()` and `func.coalesce()` are SQLAlchemy's SQL function wrappers. `coalesce(SUM(Order.total), 0)` handles the case where there are no orders (SUM returns NULL, COALESCE converts to 0).

---

## app/api/v1/catalog.py

**Path:** `backend/app/api/v1/catalog.py` (53 lines)

### Purpose
Customer-facing product listing for B2B commerce. Returns only active products from all shopkeepers, with search/filter capabilities.

### Imports Used
```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from app.models.product import Product
from app.models.user import User
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List active products with search/category/brand/price filters |

### Key Differences from Products Listing

| Aspect | `/products/` (shopkeeper) | `/catalog/products` (customer) |
|--------|--------------------------|-------------------------------|
| Filter | `owner_id = current_user.id` | `is_active = True` (all shops) |
| Fields | All fields + store lookup | Name, SKU, category, brand, selling_price, stock_quantity |
| Purpose | Inventory management | Customer browsing |

### Important Syntax

```python
query = select(Product).where(Product.is_active == True)
```

Note that customer catalog shows all active products across all shopkeepers, not just the customer's own shopkeeper. This is by design — B2B customers can browse the full catalog.

---

## app/api/v1/forecasting.py

**Path:** `backend/app/api/v1/forecasting.py` (63 lines)

### Purpose
AI-powered demand forecasting. Predicts demand for a specific product using a Random Forest model, with automatic fallback to a formula-based prediction when the model file is unavailable.

### Imports Used
```python
from app.ml import predict as ml_predict  # ML prediction + is_model_ready()
from sqlalchemy import select, func
from app.models.order import Order, OrderItem
from app.models.product import Product
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/demand/{product_id}` | Get demand forecast for a product |

### Execution Flow

1. Find product, verify ownership
2. Get total sales (last 30 days): `SELECT SUM(order_items.quantity) FROM orders JOIN order_items WHERE product_id = :pid AND shopkeeper_id = :uid`
3. Check `ml_predict.is_model_ready()` → does `model.pkl` exist?
4. **If ML ready**: Build feature dict, call `ml_predict.predict_demand(features)` → returns predicted_demand, confidence, recommended_order_qty, seasonality_factor
5. **If ML not ready**: Compute `predicted_demand = round(total_sold * 1.1)`, apply seasonality, use fixed confidence of 85
6. Return combined result

### Design Patterns

- **Feature parity** — Both ML and fallback paths return the same response structure. The caller doesn't need to handle two different response types.
- **Graceful degradation** — If the model file doesn't exist (hasn't been trained), use a simple formula: `previous_sales × 1.1`. This ensures the feature always works.

### Important Syntax

```python
if ml_predict.is_model_ready():
    ml_input = {
        "product_id": product_id,
        "category": product.category,
        "current_stock": product.stock_quantity,
        "day_of_week": now.weekday(),
        "month": now.month,
        "is_holiday": 1 if now.weekday() >= 5 else 0,
    }
    forecast = ml_predict.predict_demand(ml_input)
```

The ML model expects specific feature names. These must match the training data exactly. `is_holiday` is 1 for weekends (5, 6) and could be extended for public holidays.

---

## app/api/v1/reports.py

**Path:** `backend/app/api/v1/reports.py` (119 lines)

### Purpose
Customer analytics reports: top customers by spending, repeat purchasers, and customer lifetime value (CLV).

### Imports Used
```python
from sqlalchemy import func, select
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers/top` | Top customers by total spending (excl. cancelled) |
| GET | `/customers/repeat-purchases` | Customers with >1 order, sorted by frequency |
| GET | `/customers/clv` | Customer lifetime value (avg order, total spend, last order date) |

### Key SQL Patterns

**Top Customers:**
```sql
SELECT customer.id, company_name, email, credit_limit, credit_used,
       COALESCE(SUM(order.total), 0) as total_spent,
       COUNT(order.id) as order_count
FROM customers
LEFT JOIN orders ON orders.customer_id = customers.id
WHERE customers.owner_id = :uid AND orders.status != 'cancelled'
GROUP BY customers.id
ORDER BY total_spent DESC
LIMIT :limit
```

**Repeat Purchases:**
```sql
SELECT ..., COUNT(order.id) as order_count, COALESCE(SUM(order.total), 0) as total_spent
FROM customers JOIN orders ON orders.customer_id = customers.id
WHERE customers.owner_id = :uid AND orders.status != 'cancelled'
GROUP BY customers.id
HAVING COUNT(order.id) > 1
ORDER BY order_count DESC
```

**CLV:**
```sql
SELECT ..., SUM(order.total) as lifetime_value, AVG(order.total) as avg_order_value,
       MAX(order.created_at) as last_order_date
FROM customers LEFT JOIN orders ON orders.customer_id = customers.id
WHERE customers.owner_id = :uid AND orders.status != 'cancelled'
GROUP BY customers.id
HAVING COUNT(order.id) >= :min_orders
ORDER BY lifetime_value DESC
```

### Important Syntax

```python
result = await db.execute(
    select(Customer.id, Customer.company_name, ...)
    .select_from(Customer)
    .outerjoin(Order, Order.customer_id == Customer.id)
)
```

When using aggregate functions like `SUM` with a join, you must use `.select_from()` to specify the primary table. This is because `select(Customer.id, func.sum(...))` doesn't have an implicit FROM clause when columns come from different tables.

---

## app/api/v1/notifications.py

**Path:** `backend/app/api/v1/notifications.py` (58 lines)

### Purpose
Notification management: list notifications (with type filter), mark individual as read, mark all as read.

### Imports Used
```python
from sqlalchemy import select, update
from app.models.notification import Notification, NotificationType
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List user's notifications (type filter optional) |
| PATCH | `/mark-all-read` | Mark all unread as read |
| PATCH | `/{id}/read` | Mark single notification as read |

### Key Functions

| Function | Purpose |
|----------|---------|
| `list_notifications(type, current_user, db)` | Query notifications by user_id, filter by type if provided |
| `mark_all_notifications_read(current_user, db)` | Bulk UPDATE: SET is_read = True WHERE user_id = :uid AND is_read = False |
| `mark_notification_read(notification_id, current_user, db)` | Find by id AND user_id (prevents reading others' notifications), set is_read = True |

### Important Syntax

```python
await db.execute(
    update(Notification)
    .where(Notification.user_id == current_user.id, Notification.is_read == False)
    .values(is_read=True)
)
```

SQLAlchemy Core's `update()` performs a bulk update without loading objects into memory. This is more efficient than loading each notification, modifying it, and committing.

---

## app/api/v1/qrcodes.py

**Path:** `backend/app/api/v1/qrcodes.py` (111 lines)

### Purpose
Generates QR codes for products: single QR code images and batch label sheets (3×6 grid) for printing.

### Imports Used
```python
import qrcode                          # QR code generation
from PIL import Image, ImageDraw, ImageFont  # Image composition
from fastapi.responses import StreamingResponse  # Image return
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/product/{product_id}` | Single QR code PNG |
| GET | `/batch?ids=1,2,3` | Label sheet (200×120 per label, 3 columns × 6 rows) |

### Execution Flow (Batch Labels)

1. Parse comma-separated IDs: `ids.split(",")`
2. Query all products by IDs, verify ownership
3. Calculate grid dimensions: `nc = 3`, `nr = ceil(n / 3)`
4. Create white canvas: `Image.new("RGB", (nc * 200, max(nr * 120, 120)), "white")`
5. For each product:
   - Generate QR code: `qrcode.make(str(product_id)).resize((80, 80))`
   - Paste QR at grid position: `(col * 200 + 10, row * 120 + 10)`
   - Draw text: product name, SKU, price, stock, category
   - Draw border rectangle
6. Save to BytesIO, return `StreamingResponse` with PNG media type

### Design Patterns

- **Streaming response** — Instead of saving to disk and returning a file, the image is composed in memory (BytesIO) and streamed to the client. No temp files, no cleanup needed.
- **Font fallback** — If Arial isn't available on the system (Docker), falls back to PIL's default bitmap font.

### Important Syntax

```python
return StreamingResponse(
    buf,
    media_type="image/png",
    headers={"Content-Disposition": 'inline; filename="qr_labels_batch.png"'},
)
```

`Content-Disposition: inline` tells the browser to display the image (not download it). Change to `attachment` to force download.

---

## app/api/v1/invoices.py

**Path:** `backend/app/api/v1/invoices.py` (117 lines)

### Purpose
Generates GST-compliant PDF invoices for orders using ReportLab. Includes store info header, line-item table, and totals section with discount and GST breakdown.

### Imports Used
```python
from reportlab.lib import colors, pagesizes, styles, units
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from fastapi.responses import StreamingResponse
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate/{order_id}` | Generate PDF invoice for an order |

### PDF Structure

1. **Header** — Store name (or "KhataBox Store"), phone, email
2. **Invoice info** — Order number, date, status
3. **Line items table** — #, Product, Qty, Unit Price, Total (with blue header row)
4. **Totals section** — Subtotal, Discount (if any), GST (18%), Total (bold, black line above)
5. **Notes** — Optional order notes

### Design Patterns

- **Single-responsibility endpoint** — The endpoint only generates PDFs. It doesn't save to DB or send email. This keeps the endpoint simple and composable (email service can call this endpoint if needed).
- **Streaming PDF** — PDF is built in memory with `BytesIO` and streamed back. ReportLab writes directly to the buffer.

---

## app/api/v1/data.py

**Path:** `backend/app/api/v1/data.py` (221 lines)

### Purpose
Data management hub: Excel export (products + orders), CSV/Excel import (products), and full database backup/restore (local JSON + R2 storage).

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/export/products` | Excel file with styled headers |
| GET | `/export/orders` | Excel file with order items concatenated |
| GET | `/backup/export` | Full DB as JSON |
| POST | `/backup/import` | Restore DB from JSON |
| POST | `/backup/export-r2` | Export to Cloudflare R2 |
| POST | `/backup/restore-r2` | Restore from Cloudflare R2 |
| POST | `/import/products` | CSV/Excel product import |

### Key Functions

| Function | Purpose |
|----------|---------|
| `_style_header(ws, headers)` | Applies blue fill + white bold font to Excel header row |
| `_parse_excel(contents)` | Reads .xlsx file, returns list of dicts |
| `_parse_csv(contents)` | Reads CSV (handles BOM, quoted fields), returns list of dicts |

### Design Patterns

- **Bulk import with error reporting** — The import endpoint returns `{"created": N, "errors": [...], "total": M}` — it doesn't stop on the first error. This is the "fail-fast" approach: process all rows, report all errors, succeed partially.
- **CSV parsing (no library)** — The `_parse_csv` function is hand-rolled. This is intentional — `csv.DictReader` handles standard CSV, but the hand-rolled `parseCsvRow` in the frontend handles edge cases (quoted fields with commas). In production, use `pandas.read_csv()` for robustness.

---

# Backend Service Layer

## app/services/email.py

**Path:** `backend/app/services/email.py` (19 lines)

### Purpose
Sends transactional emails via the Resend API. Currently used for low-stock alerts.

### Imports Used
```python
import resend          # Resend Python SDK
from app.config import settings
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `send_email(to, subject, html)` | Sends email via Resend, returns bool |

### Execution Flow

1. Check `settings.RESEND_API_KEY` — if empty, return `False` immediately
2. Set `resend.api_key`
3. Call `resend.Emails.send_async({"from": ..., "to": [...], "subject": ..., "html": ...})`
4. Return `True` on success, `False` on exception

### Design Patterns

- **Fail silent** — Returns `False` on failure instead of raising. The caller can decide whether to retry or log.
- **Graceful degradation** — If `RESEND_API_KEY` isn't set, the function is a no-op. The app works without email.

---

## app/services/cache.py

**Path:** `backend/app/services/cache.py` (50 lines)

### Purpose
Redis caching layer with JSON serialization and graceful degradation.

### Key Functions

| Function | Purpose |
|----------|---------|
| `is_available()` | Returns whether Redis is connected |
| `get(key)` | Get JSON value, auto-deserialized |
| `set(key, value, ttl=300)` | Set JSON value with TTL |
| `delete(key)` | Delete single key |
| `invalidate_pattern(pattern)` | Delete all keys matching glob pattern |

### Design Patterns

- **Graceful degradation** — The entire Redis import is wrapped in `try/except`. If Redis isn't running or the URL is wrong, `_available = False` and all methods are no-ops. The app never crashes due to Redis.
- **JSON serialization** — Values are JSON-encoded before storing and decoded after retrieval. This allows caching complex Python objects (dicts, lists, etc.) without manual serialization.

---

## app/services/storage.py

**Path:** `backend/app/services/storage.py` (62 lines)

### Purpose
S3-compatible object storage via Cloudflare R2 for file uploads (product images, backups).

### Key Functions

| Function | Purpose |
|----------|---------|
| `upload(key, data, content_type)` | Upload bytes to R2 bucket |
| `download(key)` | Download bytes from R2 |
| `delete_file(key)` | Delete object from R2 |
| `get_public_url(key)` | Return public URL for key |
| `is_available()` | Returns whether R2 is configured |

### Design Patterns

- **Graceful degradation** — `_available` is set to `bool(settings.R2_ACCESS_KEY_ID)`. If credentials aren't provided, the service is a no-op.
- **S3 compatibility** — R2 uses the S3 API. The `boto3` client is configured with `signature_version="s3v4"`, which is required for R2.

---

## app/services/rate_limiter.py

**Path:** `backend/app/services/rate_limiter.py` (29 lines)

### Purpose
In-memory sliding window rate limiter: 100 requests per 60 seconds per IP address.

### Key Data Structure

```python
_requests: dict[str, list[float]] = defaultdict(list)
# Key: client IP (string)
# Value: list of timestamps (float, epoch seconds)
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `rate_limit_middleware(request, call_next)` | ASGI middleware: check rate, either reject (429) or pass through |

### Execution Flow

1. Skip rate limiting for `/ws`, `/health`, `/docs`, `/redoc`, `/openapi.json`
2. Get client IP: `request.client.host`
3. Get current time
4. Remove timestamps older than 60 seconds: `timestamps[:] = [t for t in timestamps if t > now - 60]`
5. If `len(timestamps) >= 100`: raise 429
6. Append current timestamp
7. Call next handler

### Design Patterns

- **Sliding window (not fixed window)** — Fixed window resets every 60 seconds, allowing 100 requests at 00:59 and 100 more at 01:00 (200 in 2 seconds). Sliding window uses the last 60 seconds of actual request history.
- **In-memory** — Simple `defaultdict(list)` per process. This works for single-worker deployments. For multiple workers, use Redis.

---

## app/services/task_queue.py

**Path:** `backend/app/services/task_queue.py` (40 lines)

### Purpose
Simple async task queue using Redis lists. LPUSH to enqueue, RPOP to dequeue.

### Key Functions

| Function | Purpose |
|----------|---------|
| `enqueue(queue, task_type, payload)` | Push task JSON to list head |
| `dequeue(queue)` | Pop task JSON from list tail |
| `queue_length(queue)` | Get approximate queue size |

### Design Patterns

- **Redis lists as FIFO queues** — `lpush` + `rpop` = Stack (LIFO). `lpush` + `rpop` = Queue (FIFO). The Redis list acts as a buffer that survives server restarts.

---

## app/services/notifications.py

**Path:** `backend/app/services/notifications.py` (54 lines)

### Purpose
Creates low-stock notifications and sends email alerts when product stock drops below reorder threshold.

### Key Functions

| Function | Purpose |
|----------|---------|
| `check_low_stock(product_id, shopkeeper_id, db)` | Check stock, create notification + send email if below threshold |

### Execution Flow

1. Load product by ID
2. If `stock_quantity > reorder_threshold`: return `None` (no alert needed)
3. Deduplication check: look for existing unread `LOW_STOCK` notification for this product and user
4. If already exists: return `None` (don't spam)
5. Create new `Notification` record
6. Send email: `send_email(shopkeeper.email, "Low Stock Alert", html_body)`
7. Return notification

### Important Syntax

```python
existing = await db.execute(
    select(Notification).where(
        Notification.reference_id == product_id,
        Notification.type == NotificationType.LOW_STOCK,
        Notification.user_id == shopkeeper_id,
        Notification.is_read == False,
    )
)
if existing.scalar_one_or_none():
    return None
```

This deduplication prevents creating a new notification every time an order is placed for a low-stock product. Once the user marks it as read, the next order will create a new one.

---

## app/services/backup.py

**Path:** `backend/app/services/backup.py` (87 lines)

### Purpose
Full database export/import as JSON. Supports 13 tables, automatic datetime serialization, and R2 storage integration.

### Key Functions

| Function | Purpose |
|----------|---------|
| `export_backup()` | Query all 13 tables, return JSON-serializable dict |
| `import_backup(backup)` | Insert rows into all 13 tables |
| `export_to_storage()` | Export backup and upload to R2 |
| `restore_from_storage(key)` | Download from R2 and import |

### Important Syntax

```python
result = await db.execute(text(f"SELECT * FROM {table}"))
columns = list(result.keys())
rows = [dict(zip(columns, row)) for row in result.all()]
```

This uses raw SQL (`text()`) instead of ORM to export all rows without loading them into model instances. This is much faster for bulk operations. The `result.keys()` returns column names from the cursor.

---

## app/services/socketio_manager.py

**Path:** `backend/app/services/socketio_manager.py` (24 lines)

### Purpose
Sets up the Socket.IO server for real-time bidirectional communication. Mounted at `/ws` in main.py.

### Key Functions/Events

| Event | Purpose |
|-------|---------|
| `connect(sid, environ, auth)` | Logs new connections |
| `disconnect(sid)` | Logs disconnections |
| `subscribe(sid, user_id)` | Joins room `user_{user_id}` |

### Important Syntax

```python
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS.split(","),
)
socket_app = socketio.ASGIApp(sio)
```

Socket.IO runs as an ASGI application. `ASGIApp` wraps the `AsyncServer` into an ASGI-compatible format that FastAPI's `app.mount()` can handle.

---

# Backend Models & Schemas

## app/models/user.py

**Path:** `backend/app/models/user.py` (30 lines)

### Purpose
User model for authentication and role-based access control. Three roles: admin, shopkeeper, customer.

### Design Patterns

- **StrEnum** — `UserRole(str, enum.Enum)` allows both `UserRole.ADMIN == "admin"` comparison and `user.role == "admin"` string comparison. This is a Python pattern where the enum value is a string.
- **`values_callable`** — `Enum(UserRole, values_callable=lambda x: [e.value for e in x])` stores the lowercase string in PostgreSQL (`'admin'` not `'UserRole.ADMIN'`).

## app/models/product.py

**Path:** `backend/app/models/product.py` (34 lines)

### Purpose
Core inventory entity with 19 fields covering pricing, stock, batch tracking, store assignment, and full-text search.

### Important Columns

| Column | Type | Purpose |
|--------|------|---------|
| `search_vector` | TSVECTOR | PostgreSQL full-text search vector (filled by trigger) |
| `image_url` | String(500) | R2 CDN URL for product image |
| `store_id` | Integer | Multi-store assignment |
| `is_active` | Boolean | Soft-delete flag |

## app/models/order.py

**Path:** `backend/app/models/order.py` (58 lines)

### Purpose
Order + OrderItem models for the complete order/invoice lifecycle.

### Important Patterns

- **`cascade="all, delete-orphan"`** — When an Order is deleted, all its OrderItems are automatically deleted. This is the database cascade option, enforced at the ORM level.
- **Denormalized `product_name`** — OrderItem stores `product_name` as a string, not a FK to Product. This preserves the product name at the time of order, even if the product is later renamed or deleted.

## app/schemas/user.py

**Path:** `backend/app/schemas/user.py` (37 lines)

### Purpose
Pydantic models for user registration, login, response, and token response.

### Important Pattern

```python
model_config = {"from_attributes": True}
```

This Pydantic v2 setting enables creating a Pydantic model from an ORM object: `UserResponse.model_validate(user_orm_object)`. Without this, you'd need to manually map fields.

### Role Default

```python
class UserCreate(BaseModel):
    role: str = "shopkeeper"
```

New users default to shopkeeper. Admin accounts must be created via seed script or manually set in the database.

## app/schemas/product.py

**Path:** `backend/app/schemas/product.py` (60 lines)

### Purpose
Three Pydantic models for product create, update, and response.

### Important Pattern

```python
class ProductUpdate(BaseModel):
    name: str | None = None
    # ... all fields optional with None default
```

`ProductUpdate` has all fields optional. In the endpoint: `payload.model_dump(exclude_unset=True)` keeps only the fields the client actually included. This enables partial updates — you can update just the `selling_price` without sending all other fields.

## app/schemas/order.py

**Path:** `backend/app/schemas/order.py` (58 lines)

### Purpose
Pydantic models for order creation, response, and the B2B bulk order flow.

### Important Models

| Model | Purpose |
|-------|---------|
| `OrderItemCreate` | Line item in an order (product_id, product_name, quantity, unit_price) |
| `OrderCreate` | Standard order (customer_id, payment_method, discount, items) |
| `BulkOrderCreate` | B2B order (payment_method defaults to "credit", notes, items) |
| `OrderResponse` | Full order with nested items, uses `from_attributes` |
| `OrderStatusUpdate` | Just `status: str` |

---

# Backend ML Layer

## app/ml/train.py

**Path:** `backend/app/ml/train.py` (78 lines)

### Purpose
Trains a Random Forest regression model on synthetic sales data and serializes it as `model.pkl`.

### Key Functions

| Function | Purpose |
|----------|---------|
| `generate_synthetic_data(n_samples)` | Creates 2,000 synthetic sales records with realistic patterns |
| `train(save=True)` | Trains RF, evaluates, optionally saves model |

### Training Pipeline

1. Generate 2,000 synthetic records with:
   - 5 categories (electronics, groceries, clothing, medicines, stationery)
   - Realistic base quantities per category
   - Holiday/weekend boosts
   - Random noise
2. Encode category: `LabelEncoder()` → `category_enc`
3. Feature matrix: `["product_id", "day_of_week", "month", "is_holiday", "category_enc"]`
4. Train/test split: 80/20
5. Model: `RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)`
6. Evaluate: R² = 0.862, MAE = 6.94 units
7. Serialize: `joblib.dump({"model": model, "cat_encoder": cat_encoder, "feature_cols": feature_cols}, "model.pkl")`

## app/ml/predict.py

**Path:** `backend/app/ml/predict.py` (81 lines)

### Purpose
Loads the trained model and makes demand predictions with confidence scoring.

### Key Functions

| Function | Purpose |
|----------|---------|
| `_load_model()` | Lazy-load model from disk (cached in `_loaded` global) |
| `predict_demand(product_data)` | Predict demand, compute confidence, return forecast |
| `is_model_ready()` | Check if model.pkl exists |

### Confidence Scoring

```python
if predictions is not None:
    individual_preds = [tree.predict(input_df)[0] for tree in predictions]
    std = float(pd.Series(individual_preds).std())
    confidence = max(0, min(100, round(100 - (std / max(pred, 1)) * 20)))
```

Standard deviation across individual tree predictions measures model uncertainty. Low variance = high confidence.

---

# Backend Infrastructure

## seed.py

**Path:** `backend/seed.py` (237 lines)

### Purpose
Populates the database with sample data for development/demo: 50 products, 8 suppliers, 5 customers (with customer user accounts), 30 orders, 10 POs, 6 notifications, 3 stores.

### Key Features

- **Idempotent** — Deletes all data before seeding (via `DELETE FROM` SQL)
- **Creates user accounts** — Admin (`admin@khatabox.com / Admin@123`), Shopkeeper (`shop@khatabox.com / Shop@123`), Customer users (named like `manager@techcorp.client.com / customer123`)
- **Realistic data** — Categories match products, batch numbers for medicines/groceries, expiry dates in the future, varied order statuses

### Important Syntax

```python
result = await session.execute(select(User).where(User.email == "admin@khatabox.com"))
admin = result.scalar_one_or_none()
if not admin:
    admin = User(...)
    session.add(admin)
    await session.flush()
```

This pattern prevents duplicate seeding. The script checks if the user already exists before creating. The `DELETE FROM` at the top clears dependent tables only (not users).

---

## Dockerfile

**Path:** `backend/Dockerfile` (12 lines)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Known Gaps

1. **Port** — Railway assigns `$PORT` dynamically. Should be `--port ${PORT:-8000}`.
2. **No .dockerignore** — Sends `__pycache__`, `.venv`, `.env`, `.git` to Docker daemon.
3. **No non-root user** — Running as root is a security risk in production.
4. **No health check** — `HEALTHCHECK` instruction would tell Railway when the container is ready.

---

## requirements.txt

**Path:** `backend/requirements.txt` (27 lines)

### Key Pins

| Package | Version | Reason |
|---------|---------|--------|
| `bcrypt` | `4.0.1` | Pinned — passlib is incompatible with bcrypt ≥5 |
| `scikit-learn` | `1.9.0` | Pinned — model.pkl was trained with this version |
| `boto3` | `1.35.0` | Cloudflare R2 S3 compatibility |
| `resend` | `2.30.1` | Email API |
| `sentry-sdk` | `2.19.0` | Error tracking |
| `posthog` | `3.7.2` | Product analytics |

---

# Frontend Core

## src/lib/auth.ts

**Path:** `src/lib/auth.ts` (56 lines)

### Purpose
Auth.js (NextAuth v5) configuration with a credentials provider that authenticates against the FastAPI backend. Exports `handlers`, `signIn`, `signOut`, and `auth`.

### Configuration

```typescript
providers: [
  Credentials({
    name: "credentials",
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      })
      if (!res.ok) return null
      const data = await res.json()
      return {
        id: String(data.user.id),
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      }
    },
  }),
]
```

### Callbacks

| Callback | Purpose |
|----------|---------|
| `jwt({ token, user })` | On sign-in, copy user data (id, role, tokens) into the JWT |
| `session({ session, token })` | On session read, copy token data into the session object |

### Execution Flow

1. User submits email/password on `/login` page
2. Auth.js calls `authorize()` → sends POST to FastAPI `/api/v1/auth/login`
3. Backend validates credentials, returns JWT + user data
4. Auth.js creates a JWT session containing the token and user data
5. On subsequent requests, `getSession()` or `useSession()` returns this data

### Important Syntax

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({...})
```

NextAuth v5 (beta) uses a different export pattern than v4. `handlers` is used in the API route (`src/app/api/auth/[...nextauth]/route.ts`), `auth` is the server-side auth check, and `signIn`/`signOut` are client-side functions.

---

## src/lib/client-api.ts

**Path:** `src/lib/client-api.ts` (48 lines)

### Purpose
HTTP client wrapper that automatically attaches JWT tokens to all API requests.

### Key Functions

| Function | Purpose |
|----------|---------|
| `getToken()` | Dynamically imports `next-auth/react`, gets session, returns `access_token` |
| `headers()` | Builds headers object with Authorization Bearer if token exists |
| `clientApi.get<T>(path)` | GET request → returns parsed JSON |
| `clientApi.post<T>(path, body)` | POST request → returns parsed JSON |
| `clientApi.put<T>(path, body)` | PUT request |
| `clientApi.patch<T>(path, body)` | PATCH request |
| `clientApi.delete(path)` | DELETE request |

### Key Pattern

```typescript
async function getToken(): Promise<string | null> {
  try {
    const { getSession } = await import("next-auth/react")
    const session = await getSession()
    return (session as any)?.access_token || null
  } catch {
    return null
  }
}
```

Dynamic `import()` inside the function instead of static `import` at the top. This prevents the import from running during SSR when NextAuth might not be initialized yet.

---

## src/store/cart.ts

**Path:** `src/store/cart.ts` (43 lines)

### Purpose
Zustand store for the billing cart state. Manages items, quantities, and discounts.

### Key Functions

| Function | Purpose |
|----------|---------|
| `addItem(item, quantity=1)` | Add to cart or increment existing |
| `removeItem(productId)` | Remove from cart |
| `updateQuantity(productId, quantity)` | Change quantity (auto-removes if ≤ 0) |
| `setDiscount(discount)` | Set discount amount |
| `clearCart()` | Reset to empty |

### Important Syntax

```typescript
export const useCartStore = create<CartState>((set) => ({
  items: [],
  discount: 0,
  addItem: (item, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.product_id === item.product_id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        }
      }
      return { items: [...state.items, { ...item, quantity }] }
    }),
  // ...
}))
```

Zustand's `set` can take a function (for state updates based on previous state) or an object (for absolute updates). The function form is used here because `addItem` depends on the current items array.

---

# Frontend Components

## src/components/layout/sidebar.tsx

**Path:** `src/components/layout/sidebar.tsx` (~70 lines)

### Purpose
Desktop sidebar navigation with role-filtered links. Uses Lucide icons and highlights the active route.

### Key Pattern

```typescript
const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "shopkeeper"] },
  { label: "Catalog", href: "/catalog", icon: ShoppingBag, roles: ["customer"] },
  // ... 17 items total
]
```

Each nav item has a `roles` array. The sidebar filters items based on the current user's role:

```typescript
const filteredItems = navItems.filter((item) => role && item.roles.includes(role))
```

Customer users see: Catalog, My Orders, Orders, Notifications, Settings
Admin/Shopkeeper users see: Dashboard, Inventory, Orders, Billing, Suppliers, Forecasting, Reports, Settings, etc.

### Important Syntax

```typescript
const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
```

This highlights the sidebar item when the current route matches exactly or is a sub-route. For example, `/suppliers/price-analysis` highlights the "Suppliers" link.

---

## src/components/layout/bottom-nav.tsx

**Path:** `src/components/layout/bottom-nav.tsx` (~60 lines)

### Purpose
Mobile bottom navigation bar (visible on screens <1024px). 5 tabs + a floating action button (FAB).

### Key Points

- **5 tabs** — Dashboard, Inventory, Orders, Billing, Reports (shopkeeper view)
- **FAB button** — Dispatches a custom DOM event `khatabox:fab-click` that pages can listen for
- **Hidden on desktop** — `lg:hidden` CSS class on the `<nav>` element
- **Bottom padding** — The layout adds `pb-20 lg:pb-6` to `main` to prevent content from being hidden behind the nav

---

## src/components/auth/role-guard.tsx

**Path:** `src/components/auth/role-guard.tsx` (~36 lines)

### Purpose
Two exports: `RoleGuard` component for wrapping protected UI sections, and `useRole` hook for reading the current user's role.

### Key Functions/Components

| Export | Type | Purpose |
|--------|------|---------|
| `RoleGuard` | Component | Wraps children, redirects if unauthorized |
| `useRole` | Hook | Returns `{ role, isAdmin, isShopkeeper, isCustomer }` |

### Important Syntax

```typescript
if (status === "loading") {
  return <div>Loading...</div>
}
if (!session?.user) {
  redirect("/login")
}
if (!allowedRoles.includes(session.user.role as Role)) {
  if (fallback) return <>{fallback}</>
  redirect("/dashboard")
}
return <>{children}</>
```

This is a **guard component** pattern: render nothing (or loading) while auth is loading, redirect to login if unauthenticated, redirect to dashboard if wrong role, or render children if authorized.

---

# Frontend Pages

## src/app/(dashboard)/layout.tsx

**Path:** `src/app/(dashboard)/layout.tsx` (15 lines)

### Purpose
Shared layout for all dashboard pages. Composes sidebar, top nav, main content area, bottom nav (mobile), and toast notifications.

```typescript
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
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

### Important Notes

- `pb-20 lg:pb-6` — 80px bottom padding on mobile (for the fixed BottomNav), 24px on desktop
- `max-w-[1280px]` — Content max-width for readability on wide screens
- `min-w-0` — Prevents flex items from overflowing

---

## src/app/(dashboard)/dashboard/page.tsx

**Path:** `src/app/(dashboard)/dashboard/page.tsx` (~100 lines)

### Purpose
Main dashboard page showing 4 metric cards: total inventory value, today's sales, pending orders, low stock count.

### Data Flow

1. On mount: `useEffect → clientApi.get("/api/v1/dashboard/stats")`
2. Backend runs 5 parallel aggregate queries (cached in Redis)
3. Response populates 4 metric cards
4. Each card shows: title, icon, value (or skeleton while loading), change indicator

### Important Pattern

```typescript
const [stats, setStats] = useState<DashboardStats | null>(null)
// ...
{loading ? (
  <Skeleton className="h-8 w-3/4" />
) : (
  <div className="text-2xl font-bold">{card.value}</div>
)}
```

Loading state is handled with a `Skeleton` component that shows a gray placeholder matching the text dimensions. This prevents layout shift when data loads (CLS optimization).

---

## src/app/(dashboard)/inventory/page.tsx

**Path:** `src/app/(dashboard)/inventory/page.tsx` (~160 lines)

### Purpose
Full product management page: table listing, search, CSV import, add/edit/delete products.

### Key Features

- **Search/filter** — Client-side filtering by name, SKU, or category
- **CSV import** — Hand-rolled CSV parser with quoted-field support, batch API calls
- **CRUD** — Uses `ProductFormDialog` component for create/edit
- **Stock badges** — Visual indicators for Out of Stock (red), Low Stock (yellow), In Stock (gray)

### Important Pattern (CSV Import)

```typescript
const parseCsvRow = (line: string): string[] => {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue }
    if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue }
    current += char
  }
  result.push(current.trim())
  return result
}
```

This hand-rolled parser handles quoted fields containing commas (e.g., `"Product, Name", SKU123`). A simple `line.split(",")` would produce incorrect results for quoted fields. In production, consider using `papaparse` library for robustness.

---

## src/app/(dashboard)/billing/page.tsx

**Path:** `src/app/(dashboard)/billing/page.tsx` (~170 lines)

### Purpose
QR billing/counter-sale page with product search, scan-to-add, cart management, and bill generation.

### Data Flow

1. Load products on mount
2. User searches or scans SKU → adds to Zustand cart
3. Cart shows items with quantity controls (+/-) and line totals
4. User optionally adds discount
5. "Generate Bill" → `POST /api/v1/orders/` → clears cart → redirects to `/orders`

### Important Pattern (Scan)

```typescript
const handleScan = () => {
  const q = scanInput.trim().toLowerCase()
  if (!q) return
  const product = products.find(
    (p) => p.sku.toLowerCase() === q || p.name.toLowerCase() === q
  )
  if (product) {
    addItem({
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      unit_price: product.selling_price,
    })
    setScanInput("")
  }
}
```

The scan input matches by SKU or name. In a real store, a barcode scanner would type the SKU followed by Enter, triggering `handleScan()` via `onKeyDown`.

### Store Integration

```typescript
const { items, discount, addItem, removeItem, updateQuantity, setDiscount, clearCart } = useCartStore()
```

Zustand state persists across the billing session but resets on page refresh (no persistence middleware).

---

*End of KhataBox File-by-File Explanation*
