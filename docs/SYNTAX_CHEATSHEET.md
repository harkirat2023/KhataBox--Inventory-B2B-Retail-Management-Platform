# KhataBox — Syntax Cheatsheet

> Quick-reference tables for every syntax pattern used in this project.

---

## 1. React

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `"use client"` | Marks file as Client Component | Enables hooks, state, browser APIs in a Server Component world | Every page in `(dashboard)/` | `"use client"; export default function Page() { ... }` |
| `useState<T>(init)` | Local state management | Creates typed state variable + setter | Forms, dialogs, toggles | `const [loading, setLoading] = useState(false)` |
| `useEffect(fn, [deps])` | Side effects after render | Runs callback when dependencies change | Data fetching on mount | `useEffect(() => { loadProducts() }, [storeFilter])` |
| `usePathname()` | Current URL path | Returns path string for active-link highlighting | Sidebar nav items | `const isActive = pathname === item.href` |
| `useSession()` | Auth.js session access | Returns current session (user, token) | RoleGuard, clientApi | `const { data: session } = useSession()` |
| `<Skeleton />` | Loading placeholder | Renders animated grey block matching content shape | Dashboard cards, tables | `<Skeleton className="h-8 w-3/4" />` |
| `<Badge />` | Status/label tag | Renders colored label via cva variants | Stock status, transfer status | `<Badge variant="destructive">Out of Stock</Badge>` |
| `cn(...inputs)` | Conditional class merge | `clsx` + `tailwind-merge` for conflict-free class strings | Every component | `cn("px-4", false && "hidden", className)` |
| `useRef<T>(init)` | Mutable ref | Holds DOM reference without re-render | File input reset | `const fileInputRef = useRef<HTMLInputElement>(null)` |

---

## 2. Next.js

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `(dashboard)` | Route group | Groups pages under shared layout without URL segment | `app/(dashboard)/layout.tsx` | `src/app/(dashboard)/inventory/page.tsx → /inventory` |
| `page.tsx` | Route page | Defines the UI for a route | Every route directory | `export default function Page() { ... }` |
| `layout.tsx` | Shared layout | Wraps child pages with persistent shell | Root + dashboard | `layout.tsx` renders Sidebar + `<main>{children}</main>` |
| `proxy.ts` (was middleware.ts) | Edge middleware | Guards routes, redirects unauthenticated users | Project root `src/` | `export { auth as middleware } from "@/lib/auth"` |
| `next-auth/react` | Auth.js client | Provides `signIn`, `signOut`, `useSession`, `getSession` | Login, API wrapper | `const session = await getSession()` |
| `NEXT_PUBLIC_*` | Public env variable | Exposed to client-side JS at build time | `client-api.ts` | `const API_URL = process.env.NEXT_PUBLIC_API_URL` |
| `next/font/google` | Font loading | Optimizes font delivery with CSS variable | `layout.tsx` | `const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })` |

---

## 3. TypeScript

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `interface Foo { ... }` | Object type | Defines shape of API response or props | `types/product.ts` | `interface Product { id: number; name: string; ... }` |
| `type X = "a" \| "b"` | Union type | Restricts value to literal strings | Movement types, status | `type MovementType = "sale" \| "purchase" \| "adjustment"` |
| `<T>` generic | Type parameter | Makes function type-safe for any input type | `clientApi.get<T>()` | `clientApi.get<Product[]>("/api/v1/products/")` |
| `T \| null` | Nullable type | Field can be value or null | Optional API fields | `store_id: number \| null` |
| `string \| undefined` | Optional field | Field may be absent | Config, optional props | `brand?: string` |
| `as any` | Type escape | Bypasses type checking (use sparingly) | Auth.js token access | `(session as any).access_token` |
| `declare module "..."` | Module augmentation | Extends existing type definitions | Auth.js JWT/Session | `declare module "next-auth" { interface Session { ... } }` |
| `React.ReactNode` | Children type | Type for component children prop | Layouts | `{ children }: { children: React.ReactNode }` |
| `Record<K, V>` | Dictionary type | Object with keys K and values V | Status config maps | `const config: Record<string, { label: string }> = {}` |

---

## 4. FastAPI

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `@router.get("/path")` | Route decorator | Registers GET endpoint with type-safe response | All API modules | `@router.get("/stats", response_model=DashboardStats)` |
| `Depends(get_db)` | Dependency injection | Injects async DB session into route | All endpoints | `async def list_products(db: AsyncSession = Depends(get_db))` |
| `Depends(get_current_user)` | Auth injection | Validates JWT, returns User model | Protected endpoints | `current_user: User = Depends(get_current_user)` |
| `Depends(require_role("admin"))` | RBAC guard | Checks user.role against allowed roles | Admin endpoints | `current_user: User = Depends(require_role("admin"))` |
| `Query(None, alias="x")` | Query parameter | Extracts optional query param with alias | Filters, pagination | `store_id: int \| None = Query(None)` |
| `HTTPException(status, detail)` | Error response | Returns JSON error with status code | Validation failures | `raise HTTPException(400, detail="Email exists")` |
| `response_model=list[T]` | Response schema | Validates/ serializes return data | List endpoints | `response_model=list[ProductResponse]` |
| `@asynccontextmanager lifespan` | App lifecycle | Startup/shutdown handler | `main.py` | `async def lifespan(app): yield` |
| `app.add_middleware(CORSMiddleware)` | CORS config | Allows cross-origin requests from frontend | `main.py` | `allow_origins=settings.CORS_ORIGINS.split(",")` |

---

## 5. SQLAlchemy

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `Mapped[T]` | Typed column | Type-annotated column with modern ORM style | All models | `name: Mapped[str] = mapped_column(String(255))` |
| `mapped_column(...)` | Column definition | Defines column type, constraints, defaults | All models | `stock_quantity: Mapped[int] = mapped_column(Integer, default=0)` |
| `Enum(T, values_callable=...)` | String enum | Stores enum `.value` (lowercase) not `.name` (uppercase) | User role, status | `Enum(UserRole, values_callable=lambda x: [e.value for e in x])` |
| `relationship("X", lazy="selectin")` | Eager relation | Loads related objects via SELECT WHERE IN (batch) | Inventory, Transfer | `store = relationship("Store", lazy="selectin")` |
| `select(Model).where(...)` | Query builder | Constructs async-safe SELECT query | All DB reads | `select(Product).where(Product.owner_id == uid)` |
| `await db.execute(q)` | Execute query | Runs query asynchronously, returns result | All DB reads | `result = await db.execute(query)` |
| `.scalar_one_or_none()` | Single result | Returns one row or None (no exception) | User lookup | `user = result.scalar_one_or_none()` |
| `.scalars().all()` | All results | Returns list of ORM objects | List endpoints | `return result.scalars().all()` |
| `func.count(X)` | Aggregate | SQL COUNT wrapper for aggregations | Dashboard | `select(func.count(Product.id))` |
| `func.coalesce(X, 0)` | Null default | Returns 0 when SUM result is NULL | Dashboard value | `func.coalesce(func.sum(price * qty), 0)` |
| `update(Model).where(...)` | Bulk update | Executes UPDATE without loading objects | Mark-all-read | `update(Notification).where(is_read=False).values(is_read=True)` |
| `expire_on_commit=False` | Session config | Prevents DetachedInstanceError after commit | `database.py` | `async_sessionmaker(..., expire_on_commit=False)` |

---

## 6. PostgreSQL Queries

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `TSVECTOR` | Full-text search column | Stores tokenized, stemmed text for fast search | Product model | `search_vector: Mapped[str] = mapped_column(TSVECTOR)` |
| `GIN (search_vector)` | Search index | Accelerates full-text search queries | Migration 0002 | `CREATE INDEX ix_products_search ON products USING GIN(search_vector)` |
| `to_tsvector('english', ...)` | Text tokenization | Splits text into lexemes with stemming | Migration trigger | `to_tsvector('english', COALESCE(name, '') \|\| ' ' \|\| COALESCE(sku, ''))` |
| `TIMESTAMP WITH TIME ZONE` | Timezone-aware time | Stores datetime with UTC offset | All created_at | `DateTime(timezone=True)` |
| `JSONB` | Flexible JSON col | Stores arbitrary JSON with indexing support | Future permissions | (Not used yet — recommended for RBAC v2) |

---

## 7. Authentication Patterns

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `HTTPBearer` | Token extraction | Extracts `Authorization: Bearer <token>` from headers | `dependencies.py` | `security = HTTPBearer()` |
| `jwt.encode(payload, key)` | Token creation | Signs JWT with HS256 + expiry | Login/Register | `create_access_token({"sub": str(uid), "role": role})` |
| `jwt.decode(token, key)` | Token validation | Verifies signature + expiry, returns payload | `dependencies.py` | `payload = decode_token(credentials.credentials)` |
| `pwd_context.hash(pw)` | Password hashing | Bcrypt hash with salt | Register | `password_hash=hash_password(payload.password)` |
| `pwd_context.verify(pw, hash)` | Password check | Constant-time comparison | Login | `verify_password(payload.password, user.password_hash)` |
| `require_role(*roles)` | Role guard | Closure returning Depends that checks user role | Admin routes | `Depends(require_role("admin", "shopkeeper"))` |
| `Credentials` provider | Auth.js plugin | Proxies login to FastAPI backend | `auth.ts` | `authorize(credentials) { fetch(API + "/login", ...) }` |
| `jwt` callback | Token propagation | Copies id, role, access_token from user to JWT | `auth.ts` | `token.role = user.role; token.access_token = user.access_token` |
| `session` callback | Session enrichment | Copies token fields to session for client access | `auth.ts` | `session.user.role = token.role` |

---

## 8. API Patterns

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `clientApi.get<T>(path)` | Typed GET | Fetches data, auto-attaches Bearer token, returns typed response | All frontend API calls | `const data = await clientApi.get<Product[]>("/api/v1/products/")` |
| `clientApi.post<T>(path, body)` | Typed POST | Sends JSON body with auth headers | Create endpoints | `await clientApi.post("/api/v1/transfers/", formData)` |
| `clientApi.patch<T>(path, body)` | Typed PATCH | Partial update with JSON body | Status updates | `await clientApi.patch("/transfers/1/status", { status: "approved" })` |
| `clientApi.delete(path)` | Typed DELETE | Sends DELETE, returns void (204 No Content) | Delete actions | `await clientApi.delete(\`/api/v1/products/${id}\`)` |
| `router.include_router(...)` | Route aggregation | Mounts sub-router under prefix | `__init__.py` | `router.include_router(stores.router, prefix="/stores")` |
| `GET /...?store_id=X` | Filter param | Adds server-side filtering via query param | Inventory, dashboard | `/api/v1/products/?store_id=3` |
| `@router.get("/{id}")`/`@router.post("/")` | REST conventions | URL design following resource-oriented patterns | All modules | `GET /products/{id}`, `POST /products/` |
| `paginate w/ offset + limit` | List pagination | Limits result set with offset/limit params | All list endpoints | `offset: int = Query(0), limit: int = Query(50)` |

---

## 9. State Management

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `create<State>()(persist(...))` | Zustand store | Creates global state with localStorage persistence | `store-context.ts` | `create<StoreState>()(persist((set) => ({...}), { name: "key" }))` |
| `useStoreContext()` | Custom hook | Access/set active store from anywhere | Sidebar, Dashboard | `const { activeStore, setActiveStore } = useStoreContext()` |
| `useState()` loading pattern | Page state | Boolean + skeleton for async data loading | All dashboard pages | `const [loading, setLoading] = useState(true)` |
| `useEffect(() => {...}, [])` | Mount fetch | Fetches data once on component mount | List pages | `useEffect(() => { loadData() }, [])` |
| `useEffect(() => {...}, [dep])` | Reactive fetch | Re-fetches data when dependency changes | Inventory (store filter) | `useEffect(() => { loadProducts() }, [storeFilter])` |
| `const [form, setForm] = useState(...)` | Form state | Controlled form with object spread updates | Form dialogs | `setForm({ ...form, name: e.target.value })` |
| `.finally(() => setLoading(false))` | Loading reset | Ensures loading stops even on error | All data fetches | `.catch(console.error).finally(() => setLoading(false))` |
| `toast.success("msg")` / `toast.error("msg")` | User feedback | Shows toast notification (Sonner) | All mutations | `toast.success("Product created")` |

---

## 10. Python Patterns

| Syntax | Use | What It Does | Where Used | Example |
|--------|-----|-------------|------------|---------|
| `async def fn()` | Async function | Coroutine that can be awaited | All routes, DB calls | `async def get_dashboard_stats(...)` |
| `asyncio.gather(c1(), c2())` | Concurrent execution | Runs multiple coroutines concurrently | Dashboard | `results = await asyncio.gather(count(), sum(), ...)` |
| `try: ... except Exception:` | Graceful degradation | Falls back when optional service is down | Redis, R2, Email | `try: import redis; except: _available = False` |
| `is_available() → bool` | Service health | Checks if external service is configured/connected | Cache, Storage | `if cache_available(): await cache_get(key)` |
| `@asynccontextmanager` | Async context | Yields control during app lifecycle | Lifespan handler | `async def lifespan(app): yield` |
| `class Settings(BaseSettings)` | Config class | Reads env vars with defaults via pydantic-settings | `config.py` | `DATABASE_URL: str = "postgresql+asyncpg://..."` |
| `model_config = {"env_file": ".env"}` | Env file config | Automatically loads .env file | `config.py` | Read from `.env` in development |
| `if __name__ == "__main__":` | Script entry | Runs code when file executed directly | `seed.py`, `train.py` | `if __name__ == "__main__": asyncio.run(seed())` |
