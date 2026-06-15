# KhataBox — Syntax Cheatsheet

> Every syntax pattern used in this codebase, with real examples.
> Organized by language/framework. Cross-references to source files provided.

---

## Table of Contents

1. [Next.js Syntax](#1-nextjs-syntax)
2. [React Syntax](#2-react-syntax)
3. [TypeScript Syntax](#3-typescript-syntax)
4. [FastAPI (Python) Syntax](#4-fastapi-python-syntax)
5. [SQLAlchemy Database Queries](#5-sqlalchemy-database-queries)
6. [API Patterns](#6-api-patterns)
7. [Authentication Patterns](#7-authentication-patterns)
8. [Python Language Patterns](#8-python-language-patterns)
9. [CSS / Tailwind Patterns](#9-css--tailwind-patterns)
10. [Common Code Snippets](#10-common-code-snippets)

---

## 1. Next.js Syntax

### 1.1 App Router — Route Groups

Parenthesized folders create route groups that don't affect the URL path.

```tsx
// src/app/(dashboard)/inventory/page.tsx → /inventory
// src/app/(dashboard)/orders/page.tsx    → /orders
// src/app/(dashboard)/suppliers/page.tsx → /suppliers
// All pages inside (dashboard) share the same layout.tsx
```

### 1.2 Root Layout (`layout.tsx`)

Every Next.js app needs a root layout. It wraps all pages.

```tsx
// src/app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "KhataBox — Inventory & B2B Retail Platform",
  description: "AI-powered inventory management for small and medium retailers",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**Key patterns:**
- `next/font/google` + `Inter` with CSS variable `--font-sans`
- `Readonly<{ children: React.ReactNode }>` — exact children type from Next.js 16
- `inter.variable` spreads the CSS variable on `<html>`
- `antialiased` on `<html>`, `Providers` wraps `<body>`

### 1.3 Dashboard Group Layout

```tsx
// src/app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Toaster } from "sonner"

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

**Key patterns:**
- Route group `(dashboard)` — all pages inside share this layout
- `min-h-screen` + `flex` + `flex-1` for full-height layout
- `max-w-[1280px]` — dashboard content width per DESIGN.md
- `pb-20 lg:pb-6` — bottom padding for mobile bottom nav
- `Toaster` from `sonner` for toast notifications

### 1.4 Metadata Export (Server Component)

```tsx
export const metadata: Metadata = {
  title: "KhataBox — Inventory & B2B Retail Platform",
  description: "AI-powered inventory management for small and medium retailers",
}
```

**Pattern:** `metadata` is a named export from server components (not `"use client"`). Next.js uses it for `<title>` and `<meta>` tags.

### 1.5 Server Component vs Client Component

```tsx
// THIS IS A SERVER COMPONENT (no "use client" directive)
// Can export metadata, use async, import server-only modules
// src/app/layout.tsx — NO "use client"

// THIS IS A CLIENT COMPONENT (has "use client" directive)
// Can use hooks (useState, useEffect), event handlers, browser APIs
// src/app/(dashboard)/inventory/page.tsx — "use client" at top
"use client"
import { useEffect, useState } from "react"
```

**Rule:** All dashboard pages in this project use `"use client"` because they need interactivity (data fetching, form handlers). Only `layout.tsx`, `page.tsx` (landing), `login/page.tsx`, and `register/page.tsx` are server components.

### 1.6 Route Handler (API Route)

```tsx
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

**Pattern:** Next.js App Router API routes use named exports (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`). Catch-all `[...nextauth]` captures all sub-paths.

### 1.7 Middleware / Proxy (`proxy.ts`)

Next.js 16 uses `proxy.ts` in the source root (not `middleware.ts`).

```tsx
// src/proxy.ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl
  const isLoggedIn = !!session?.user

  const publicPaths = ["/login", "/register", "/api/auth"]
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

**Key patterns:**
- `proxy(request: NextRequest)` — replaces `middleware` from earlier versions
- `config.matcher` — regex to exclude static assets
- `NextResponse.redirect()` / `NextResponse.next()` for routing

### 1.8 `@/` Path Aliases

```tsx
import { Button } from "@/components/ui/button"
import { clientApi } from "@/lib/client-api"
import { useCartStore } from "@/store/cart"
import { Supplier } from "@/types/supplier"
import { cn } from "@/lib/utils"
```

**Pattern:** `@/` maps to `src/` via `tsconfig.json` paths. Always use `@/` imports, never relative `../../`.

---

## 2. React Syntax

### 2.1 useState — State Management

```tsx
// Simple state
const [search, setSearch] = useState("")

// Object state
const [stats, setStats] = useState<DashboardStats | null>(null)

// Boolean toggle
const [dialogOpen, setDialogOpen] = useState(false)

// Form state
const [form, setForm] = useState<SupplierFormData>({
  name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
})

// Update individual form fields
onChange={(e) => setForm({ ...form, name: e.target.value })}
```

### 2.2 useEffect — Data Fetching on Mount

```tsx
// src/app/(dashboard)/suppliers/page.tsx
const [suppliers, setSuppliers] = useState<Supplier[]>([])
const [loading, setLoading] = useState(true)

const loadSuppliers = async () => {
  try {
    const data = await clientApi.get<Supplier[]>("/api/v1/suppliers/")
    setSuppliers(data)
  } catch (err) {
    console.error("Failed to load suppliers", err)
  } finally {
    setLoading(false)
  }
}

useEffect(() => { loadSuppliers() }, [])
//                                                     ^ empty deps = run once on mount
```

**Pattern:** `useEffect` with empty `[]` dependency array fetches data once on mount. `clientApi.get<T>()` is the typed API wrapper. Always handle loading and error states.

### 2.3 Conditional Rendering

```tsx
// Ternary — most common pattern
{loading ? (
  <Skeleton className="h-8 w-3/4" />
) : (
  <div className="text-2xl font-bold">{card.value}</div>
)}

// Short-circuit AND — show something only when condition is true
{unreadCount > 0 && (
  <Button variant="outline" size="sm" onClick={markAllAsRead}>
    <CheckCheck className="size-4 mr-2" /> Mark All Read
  </Button>
)}

// Empty state
{filtered.length === 0 && (
  <TableRow>
    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
      No suppliers found. Add your first supplier.
    </TableCell>
  </TableRow>
)}
```

### 2.4 Event Handlers

```tsx
// Inline arrow function
<Button onClick={() => { setEditingSupplier(null); setDialogOpen(true) }}>
  Add Supplier
</Button>

// Input change handler
<Input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="pl-10"
/>

// Form submit handler
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  try {
    await onSubmit(form)
    onOpenChange(false)
  } finally {
    setLoading(false)
  }
}
<form onSubmit={handleSubmit}>...</form>
```

### 2.5 Mapping Arrays to JSX

```tsx
// Basic map with key
{filtered.map((supplier) => (
  <TableRow key={supplier.id}>
    <TableCell className="font-medium">{supplier.name}</TableCell>
    <TableCell>{supplier.contact_person}</TableCell>
  </TableRow>
))}

// Map with index separator
{notifications.map((notification, i) => (
  <div key={notification.id}>
    {/* notification content */}
    {i < notifications.length - 1 && <Separator />}
  </div>
))}
```

### 2.6 Dynamic Icon Component Mapping

```tsx
// Define a config object with icon components
const typeConfig: Record<NotificationType, { icon: typeof Package; color: string; label: string }> = {
  low_stock: { icon: AlertTriangle, color: "text-amber-600 bg-amber-100", label: "Low Stock" },
  expiry: { icon: AlertTriangle, color: "text-red-600 bg-red-100", label: "Expiry" },
  payment: { icon: CreditCard, color: "text-blue-600 bg-blue-100", label: "Payment" },
  ai_recommendation: { icon: Lightbulb, color: "text-green-600 bg-green-100", label: "AI Insight" },
}

// Render dynamically
const config = typeConfig[notification.type]
const Icon = config.icon
return (
  <div className={cn("flex items-center justify-center size-10 rounded-full shrink-0", config.color)}>
    <Icon className="size-5" />
  </div>
)
```

### 2.7 shadcn/ui Component Usage

```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
```

**Button variants:**
```tsx
<Button>Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="icon" className="size-8"><Pencil className="size-3.5" /></Button>
```

**Dialog pattern:**
```tsx
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Add Supplier</DialogTitle>
      <DialogDescription>Add a new supplier</DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4 py-4">
        {/* form fields */}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit">Create</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### 2.8 Zustand Store

```tsx
// src/store/cart.ts
import { create } from "zustand"

export interface CartItem {
  product_id: number
  name: string
  sku: string
  unit_price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  discount: number
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  setDiscount: (discount: number) => void
  clearCart: () => void
}

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
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.product_id !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: quantity <= 0
        ? state.items.filter((i) => i.product_id !== productId)
        : state.items.map((i) =>
            i.product_id === productId ? { ...i, quantity } : i
          ),
    })),
  setDiscount: (discount) => set({ discount }),
  clearCart: () => set({ items: [], discount: 0 }),
}))

// Usage in components:
import { useCartStore } from "@/store/cart"
const { items, discount, addItem, removeItem, updateQuantity, clearCart } = useCartStore()
```

**Key patterns:**
- `create<Interface>()` with `(set) => ({ ... })`
- Immutable updates: `filter`, `map`, spread `...`
- `Omit<CartItem, "quantity">` — TypeScript utility type
- `set((state) => ({ ... }))` — functional update (not `set({ ... })`) when depending on current state

### 2.9 useSession (Auth.js / NextAuth v5)

```tsx
import { useSession } from "next-auth/react"

// Inside a component:
const { data: session, status } = useSession()
const user = session?.user  // { id, email, name, role }
const token = (session as any)?.access_token  // stored in session by auth.ts

// Loading check
if (status === "loading") return <div>Loading...</div>

// Role check
if (session?.user?.role === "admin") { /* admin-only UI */ }
```

---

## 3. TypeScript Syntax

### 3.1 Interface Definitions

```tsx
// src/types/supplier.ts
export interface Supplier {
  id: number
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
}

export interface SupplierFormData {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
}

// src/types/price-analysis.ts
export interface PriceAnalysisItem {
  product_id: number
  product_name: string
  product_sku: string
  category: string
  supplier_id: number
  supplier_name: string
  last_supplier_price: number
  current_selling_price: number
  current_cost_price: number
  margin_percent: number
  profit_per_unit: number
  last_purchased: string | null
}

export interface SupplierPriceAnalysis {
  supplier_id: number
  supplier_name: string
  items: PriceAnalysisItem[]
  avg_margin_percent: number
  total_items: number
}
```

### 3.2 Union Types & Type Aliases

```tsx
type Role = "admin" | "shopkeeper" | "customer"

// In React component props:
export function RoleGuard({
  children,
  allowedRoles,
  fallback,
}: {
  children: React.ReactNode
  allowedRoles: Role[]
  fallback?: React.ReactNode
}) { ... }

// String literal union (without TypeScript enum — simpler)
type NotificationType = "low_stock" | "expiry" | "payment" | "ai_recommendation"
```

### 3.3 Generic Functions

```tsx
// src/lib/client-api.ts
export const clientApi = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: await headers() })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()  // TypeScript infers T from context
  },
  async post<T>(path: string, body: unknown): Promise<T> { ... },
  async put<T>(path: string, body: unknown): Promise<T> { ... },
  async patch<T>(path: string, body: unknown): Promise<T> { ... },
  async delete(path: string): Promise<void> { ... },
}

// Usage — TypeScript infers the return type
const data = await clientApi.get<Supplier[]>("/api/v1/suppliers/")
// data is typed as Supplier[]
```

### 3.4 Optional & Nullable Types

```tsx
// TypeScript | null — explicitly nullable
const [stats, setStats] = useState<DashboardStats | null>(null)

// Optional interface fields
interface UserResponse {
  store_name: string | null
  phone: string | null
}

// Optional props
fallback?: React.ReactNode

// Python equivalent (for reference):
// str | None = None (Python 3.10+)
```

### 3.5 Props as Record/Object

```tsx
// Inline props type (most common in this codebase)
function SupplierFormDialog({
  open,
  onOpenChange,
  onSubmit,
  supplier,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SupplierFormData) => Promise<void>
  supplier?: Supplier | null
}) { ... }

// Or using an interface defined externally
interface DashboardStats {
  total_products: number
  total_inventory_value: number
  today_sales_count: number
  today_sales_amount: number
  pending_orders_count: number
  low_stock_count: number
}
```

### 3.6 Readonly Children

```tsx
// Standard Next.js 16 children pattern
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) { ... }
```

### 3.7 Type Assertion (as any)

Used sparingly in this project, mostly for Auth.js session augmentation:

```tsx
(session as any)?.access_token
(user as any).role
(user as any).access_token
```

### 3.8 Type Augmentation (next-auth.d.ts)

```tsx
// src/types/next-auth.d.ts
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }
}
```

**Pattern:** Augments the `next-auth` module to add `role` and `id` to the session user type.

### 3.9 `Record<K, V>` Type

```tsx
const typeConfig: Record<NotificationType, { icon: typeof Package; color: string; label: string }> = {
  low_stock: { icon: AlertTriangle, color: "text-amber-600 bg-amber-100", label: "Low Stock" },
  // ...
}
```

**Pattern:** `Record<string, SomeType>` is a TypeScript utility that creates an object type with string keys and values of `SomeType`.

---

## 4. FastAPI (Python) Syntax

### 4.1 Route Decorators

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter()

# GET with response model
@router.get("/", response_model=list[ProductResponse])
async def list_products(
    search: str | None = Query(None),          # Optional query param
    category: str | None = Query(None),
    store_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),  # Auth dependency
    db: AsyncSession = Depends(get_db),              # DB session dependency
):
    ...

# POST with status code override
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,                    # Request body
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ...

# GET with path parameter
@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ...

# PUT with path + body
@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ...

# DELETE with 204
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ...

# PATCH
@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ...
```

### 4.2 Dependency Injection — get_db

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

**Pattern:** `get_db` is a FastAPI dependency that yields an async session and closes it in `finally`. Every route uses `db: AsyncSession = Depends(get_db)`.

### 4.3 Route Registration (APIRouter)

```python
# app/api/v1/__init__.py
from fastapi import APIRouter
from app.api.v1 import auth, products, orders, suppliers, ...

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(products.router, prefix="/products", tags=["Products"])
# ... 18 modules total
```

**Pattern:** Each feature module creates its own `router = APIRouter()`, then the main `__init__.py` aggregates them with prefixes and tags for Swagger.

### 4.4 Pydantic Schemas

```python
from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "shopkeeper"          # Default value
    store_name: str | None = None      # Optional field
    phone: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    store_name: str | None
    phone: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}  # Enables ORM -> Pydantic conversion

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse                    # Nested schema
```

**Key patterns:**
- `model_config = {"from_attributes": True}` — allows `UserResponse.model_validate(db_user)`
- `EmailStr` from `pydantic` — validates email format
- `str | None` — Python 3.10+ union syntax
- `= None` — makes field optional in request
- Schemas can be nested (`user: UserResponse`)

### 4.5 Error Handling

```python
from fastapi import HTTPException, status

# 400 — Bad Request
raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

# 401 — Unauthorized
raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

# 403 — Forbidden
raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

# 404 — Not Found
raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
```

### 4.6 Request Body Validation

```python
# Request body — inferred as JSON body
async def create_product(payload: ProductCreate, ...):
    # payload is automatically validated by Pydantic

# Query parameters
async def list_products(
    search: str | None = Query(None),                    # Optional string
    min_price: float | None = Query(None, ge=0),         # Optional with constraint
    category: str | None = Query(None),
    stock_status: str | None = Query(None, description="in_stock, low_stock, out_of_stock"),
):
    ...

# Path parameters
@router.get("/{product_id}")
async def get_product(product_id: int, ...):

# File upload
from fastapi import UploadFile, File
@router.post("/{product_id}/image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    ...
):
```

### 4.7 Response Building

```python
# Return Pydantic schema directly (FastAPI auto-serializes)
return UserResponse.model_validate(user)

# Return list of schemas
return [ProductResponse.model_validate(p) for p in result.scalars().all()]

# Return dict
return {"message": "All notifications marked as read"}
```

---

## 5. SQLAlchemy Database Queries

### 5.1 Model Definition

```python
from sqlalchemy import String, Integer, Float, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from datetime import datetime, timezone

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False)
    selling_price: Mapped[float] = mapped_column(Float, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    owner_id: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

### 5.2 Enum Model

```python
import enum
from sqlalchemy import Enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SHOPKEEPER = "shopkeeper"
    CUSTOMER = "customer"

class User(Base):
    __tablename__ = "users"
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x]),
        default=UserRole.SHOPKEEPER,
        nullable=False,
    )
```

**CRITICAL:** The `values_callable=lambda x: [e.value for e in x]` is required on every Enum column. Without it, SQLAlchemy stores the member name (`"ADMIN"`) instead of the value (`"admin"`).

### 5.3 SELECT Queries

```python
from sqlalchemy import select, func

# Simple select
result = await db.execute(select(User).where(User.email == "admin@khatabox.com"))
user = result.scalar_one_or_none()     # Returns None if not found

# Select with multiple conditions
result = await db.execute(
    select(Product).where(
        Product.owner_id == current_user.id,
        Product.is_active == True,
    )
)
products = result.scalars().all()      # Returns list

# Select with LIKE
query = query.where(User.name.ilike(f"%{search}%"))

# Select with IN
store_ids = [1, 2, 3]
result = await db.execute(select(Store).where(Store.id.in_(store_ids)))

# Full-text search (PostgreSQL specific)
query = query.where(
    Product.search_vector.op("@@")(func.plainto_tsquery("english", search_text))
)

# Order by
query = select(User).order_by(User.created_at.desc())
```

### 5.4 INSERT (Add & Commit)

```python
# Create model instance
user = User(
    email=payload.email,
    password_hash=hash_password(payload.password),
    name=payload.name,
    role=payload.role,
)

# Add to session and commit
db.add(user)
await db.commit()
await db.refresh(user)  # Loads auto-generated fields (id, created_at)
```

### 5.5 UPDATE

```python
# Method 1: Set attribute on fetched object
product = result.scalar_one_or_none()
product.stock_quantity = new_quantity
await db.commit()
await db.refresh(product)

# Method 2: Dynamic update from payload
for key, value in payload.model_dump(exclude_unset=True).items():
    setattr(product, key, value)
await db.commit()

# Method 3: Bulk update via SQLAlchemy update()
from sqlalchemy import update
await db.execute(
    update(Notification)
    .where(Notification.user_id == current_user.id, Notification.is_read == False)
    .values(is_read=True)
)
await db.commit()
```

### 5.6 DELETE (Soft Delete)

```python
# This project uses soft-delete (is_active flag), not hard DELETE
product.is_active = False
await db.commit()
```

### 5.7 One-to-Many Relationship (eager loading)

```python
from sqlalchemy import select, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Parent — Order has many OrderItems
class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order")

# Child
class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), nullable=False)
    order: Mapped["Order"] = relationship("Order", back_populates="items")

# Eager loading (REQUIRED in async sessions — lazy loading hangs)
from sqlalchemy.orm import selectinload
result = await db.execute(
    select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
)
order = result.scalar_one_or_none()
order.items  # Already loaded — no lazy query
```

**CRITICAL:** Always use `selectinload()` for relationships in async sessions. Lazy loading (`order.items` without `selectinload`) will hang because the async session is closed.

### 5.8 Checking Existence

```python
result = await db.execute(select(Product).where(Product.sku == payload.sku, Product.owner_id == current_user.id))
if result.scalar_one_or_none():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")
```

### 5.9 flush vs commit

```python
# flush — sends to DB but does NOT persist (transaction not committed)
await db.flush()

# commit — persists all changes
await db.commit()

# refresh — re-reads from DB (needed after commit to get auto-generated fields)
await db.refresh(product)

# Typical transaction pattern:
product = Product(**payload.model_dump(), owner_id=current_user.id)
db.add(product)
await db.flush()          # Get product.id for next step
await check_low_stock(product.id, current_user.id, db)  # Use product.id
await db.commit()         # Persist everything
await db.refresh(product) # Get server-generated timestamps
```

---

## 6. API Patterns

### 6.1 Route Registration Pattern

Every new feature module follows these steps:

```python
# Step 1: Create a route file with APIRouter
# backend/app/api/v1/products.py
router = APIRouter()

@router.get("/", response_model=list[ProductResponse])
async def list_products(...): ...

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(...): ...

# Step 2: Register in __init__.py
# backend/app/api/v1/__init__.py
from app.api.v1 import products
router.include_router(products.router, prefix="/products", tags=["Products"])
```

### 6.2 Auth Dependency Pattern

```python
# Public endpoint (no auth — but rare)
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    ...

# Authenticated endpoint (most common)
@router.get("/", response_model=list[SupplierResponse])
async def list_suppliers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Supplier).where(Supplier.owner_id == current_user.id)
    ...

# Admin-only endpoint
@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    ...
```

### 6.3 Error Response Pattern

```python
# Consistent error format:
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,  # Use named constants
    detail="Human-readable error message"       # Always use "detail" key
)
```

### 6.4 Response Serialization Pattern

```python
# Single object: Use model_validate()
return ProductResponse.model_validate(product)

# List: Use list comprehension
return [ProductResponse.model_validate(p) for p in result.scalars().all()]
```

### 6.5 File Response Pattern

```python
from fastapi.responses import StreamingResponse
from io import BytesIO

@router.get("/qrcodes/product/{product_id}")
async def generate_qr(product_id: int, ...):
    # ... generate image in buffer ...
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
```

---

## 7. Authentication Patterns

### 7.1 Backend JWT Flow

```python
# app/core/security.py
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

### 7.2 Backend Auth Dependency

```python
# app/core/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_role(*roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_checker
```

**Usage:** `current_user: User = Depends(get_current_user)` on any route that needs auth.
**Admin-only:** `current_user: User = Depends(require_role("admin"))`

### 7.3 Frontend Auth.js Configuration

```tsx
// src/lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
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
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.access_token = (user as any).access_token
        token.refresh_token = (user as any).refresh_token
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      ;(session as any).access_token = token.access_token
      return session
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
})
```

**Key patterns:**
- `Credentials` provider calls FastAPI login endpoint
- JWT callback persists `access_token`, `role`, `id` into the NextAuth token
- Session callback copies token fields to `session.user`
- `(session as any).access_token` — type assertion because `access_token` isn't in the default Session type
- `session: { strategy: "jwt" }` — no database needed for sessions

### 7.4 Frontend Client API

```tsx
// src/lib/client-api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function getToken(): Promise<string | null> {
  try {
    const { getSession } = await import("next-auth/react")
    const session = await getSession()
    return (session as any)?.access_token || null
  } catch {
    return null
  }
}

async function headers(): Promise<Record<string, string>> {
  const token = await getToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const clientApi = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: await headers() })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST", headers: await headers(), body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
  async put<T>(path: string, body: unknown): Promise<T> { ... },
  async patch<T>(path: string, body: unknown): Promise<T> { ... },
  async delete(path: string): Promise<void> {
    await fetch(`${API_URL}${path}`, { method: "DELETE", headers: await headers() })
  },
}
```

**Key patterns:**
- `getToken()` lazy-imports `next-auth/react` to avoid SSR issues
- Generic `<T>` so callers get typed responses
- `body: JSON.stringify(body)` — explicit serialization
- Error handling: throws on non-OK responses; callers catch

### 7.5 Frontend Role Guard

```tsx
// src/components/auth/role-guard.tsx
"use client"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"

type Role = "admin" | "shopkeeper" | "customer"

export function RoleGuard({
  children,
  allowedRoles,
  fallback,
}: {
  children: React.ReactNode
  allowedRoles: Role[]
  fallback?: React.ReactNode
}) {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session?.user) {
    redirect("/login")
  }

  if (!allowedRoles.includes(session.user.role as Role)) {
    if (fallback) return <>{fallback}</>
    redirect("/dashboard")
  }

  return <>{children}</>
}

export function useRole() {
  const { data: session } = useSession()
  return {
    role: session?.user?.role as Role | undefined,
    isAdmin: session?.user?.role === "admin",
    isShopkeeper: session?.user?.role === "shopkeeper",
    isCustomer: session?.user?.role === "customer",
  }
}
```

**Usage:** Wrap admin-only pages with `<RoleGuard allowedRoles={["admin"]}>`.

---

## 8. Python Language Patterns

### 8.1 Type Hints (Python 3.10+)

```python
def hello(name: str) -> str:
    return f"Hello {name}"

# Union type (| syntax)
def process(value: str | int | None = None) -> dict | None:
    ...

# List of models
async def list_products(...) -> list[ProductResponse]:
    ...

# Optional with default
def greet(name: str | None = None) -> str:
    ...
```

### 8.2 Async/Await

```python
# All database operations and HTTP calls use async
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    return ProductResponse.model_validate(product)
```

### 8.3 Lambda / Inline Functions

```python
# In mapped_column defaults
created_at = mapped_column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc)
)

# In values_callable for enums
Enum(UserRole, values_callable=lambda x: [e.value for e in x])
```

### 8.4 List Comprehension

```python
# Convert DB results to Pydantic schemas (most common pattern)
responses = [ProductResponse.model_validate(p) for p in result.scalars().all()]

# Same as:
responses = []
for p in result.scalars().all():
    responses.append(ProductResponse.model_validate(p))
```

### 8.5 Unpacking dict to kwargs

```python
# Create model from Pydantic schema
product = Product(**payload.model_dump(), owner_id=current_user.id)

# Equivalent to:
product = Product(
    name=payload.name,
    sku=payload.sku,
    category=payload.category,
    cost_price=payload.cost_price,
    selling_price=payload.selling_price,
    owner_id=current_user.id,
)
```

### 8.6 Dict Comprehension

```python
# Build lookup dict from DB results
stores = {s.id: s.name for s in store_result.scalars().all()}
# Result: {1: "Main Store", 2: "Warehouse", ...}
```

### 8.7 `model_dump(exclude_unset=True)`

```python
# Only include fields that were actually sent in the request
for key, value in payload.model_dump(exclude_unset=True).items():
    setattr(product, key, value)
# This way, partial updates work — only changed fields are applied
```

---

## 9. CSS / Tailwind Patterns

### 9.1 Common Utility Combinations

```css
/* Card styling */
<div className="rounded-lg border bg-card">...</div>

/* Flex layout */
<div className="flex items-center justify-between">...</div>
<div className="flex items-center gap-4">...</div>
<div className="flex items-start gap-4">...</div>

/* Grid */
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">...</div>
<div className="grid grid-cols-2 gap-4 py-4">...</div>

/* Spacing pattern (space-y) */
<div className="space-y-6">...</div>  /* Children get vertical spacing */

/* Text patterns */
<h1 className="text-2xl font-semibold">Page Title</h1>
<p className="text-sm text-muted-foreground">Description text</p>
<span className="text-xs text-muted-foreground">Small hint</span>

/* Input with icon prefix */
<div className="relative flex-1 max-w-sm">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
  <Input className="pl-10" />
</div>

/* Table cell truncation */
<TableCell className="max-w-[200px] truncate">Long text here</TableCell>
```

### 9.2 Responsive Design

```css
/* Hide on mobile, show on desktop */
hidden lg:flex

/* Adjust padding for mobile vs desktop */
p-4 lg:p-6

/* Bottom nav only on mobile, hidden on desktop */
pb-20 lg:pb-6    /* Extra bottom padding on mobile for nav */
```

### 9.3 cn() Utility (class-variance-authority)

```tsx
import { cn } from "@/lib/utils"

<Link className={cn(
  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
  isActive
    ? "bg-primary/10 text-primary"
    : "text-muted-foreground hover:bg-muted hover:text-foreground"
)}>
```

**Pattern:** `cn()` merges Tailwind classes conditionally. Base styles first, then variant overrides.

### 9.4 Skeleton Loading

```tsx
<Skeleton className="h-8 w-3/4" />
<Skeleton className="h-64" />
<Skeleton className="h-8 w-64" />
```

### 9.5 Color Classes (per DESIGN.md)

```css
/* Primary (#2563EB) */
bg-primary text-primary bg-primary/10 text-primary

/* Muted text (#6B7280) */
text-muted-foreground

/* Muted background */
bg-muted bg-muted/50 hover:bg-muted

/* Status colors */
text-amber-600 bg-amber-100     /* Warning */
text-red-600 bg-red-100         /* Danger */
text-green-600 bg-green-100     /* Success */
text-blue-600 bg-blue-100       /* Info */

/* Badge styling */
<Badge variant="outline" className="text-[10px] px-1.5 py-0">
```

---

## 10. Common Code Snippets

### 10.1 Full API Route (Complete Example)

```python
# backend/app/api/v1/products.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse

router = APIRouter()

@router.get("/", response_model=list[ProductResponse])
async def list_products(
    search: str | None = Query(None),
    category: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(
        Product.owner_id == current_user.id,
        Product.is_active == True,
    )
    if category:
        query = query.where(Product.category == category)
    if search:
        query = query.where(Product.search_vector.op("@@")(func.plainto_tsquery("english", search)))
    result = await db.execute(query)
    return [ProductResponse.model_validate(p) for p in result.scalars().all()]

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Product).where(Product.sku == payload.sku, Product.owner_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")
    product = Product(**payload.model_dump(), owner_id=current_user.id)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return ProductResponse.model_validate(product)
```

### 10.2 Full Frontend Page (Complete Example)

```tsx
"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Supplier, SupplierFormData } from "@/types/supplier"
import { clientApi } from "@/lib/client-api"

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState("")

  const loadSuppliers = async () => {
    try {
      const data = await clientApi.get<Supplier[]>("/api/v1/suppliers/")
      setSuppliers(data)
    } catch (err) {
      console.error("Failed to load suppliers", err)
    }
  }

  useEffect(() => { loadSuppliers() }, [])

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_person.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <Button><Plus className="size-4 mr-2" /> Add Supplier</Button>
      </div>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  No suppliers found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contact_person}</TableCell>
                <TableCell className="text-sm">{supplier.email}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Pencil className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

### 10.3 Full Frontend Page with API Fetch + Table + Dialog

```tsx
// The full suppliers page at src/app/(dashboard)/suppliers/page.tsx
// combines: useState, useEffect, clientApi.get, Table, Dialog,
// form handling, optimistic UI updates (re-fetch after mutation)
// See that file for the complete 239-line reference implementation.
```

### 10.4 Full CRUD Pattern

```python
# Product CRUD follows this exact pattern for all entities:
# products.py, suppliers.py, customers.py, stores.py

# LIST (GET /)
@router.get("/", response_model=list[XxxResponse])
async def list_xxx(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Xxx).where(Xxx.owner_id == current_user.id)
    result = await db.execute(query)
    return [XxxResponse.model_validate(x) for x in result.scalars().all()]

# CREATE (POST /)
@router.post("/", response_model=XxxResponse, status_code=status.HTTP_201_CREATED)
async def create_xxx(
    payload: XxxCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obj = Xxx(**payload.model_dump(), owner_id=current_user.id)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return XxxResponse.model_validate(obj)

# UPDATE (PUT /{id})
@router.put("/{xxx_id}", response_model=XxxResponse)
async def update_xxx(
    xxx_id: int,
    payload: XxxUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Xxx).where(Xxx.id == xxx_id, Xxx.owner_id == current_user.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return XxxResponse.model_validate(obj)

# DELETE (DELETE /{id})
@router.delete("/{xxx_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_xxx(
    xxx_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Xxx).where(Xxx.id == xxx_id, Xxx.owner_id == current_user.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    obj.is_active = False  # Soft delete
    await db.commit()
```

### 10.5 Sidebar Nav Entry

```tsx
// src/components/layout/sidebar.tsx — add a new nav item:
import { Truck, LineChart } from "lucide-react"

const navItems = [
  { label: "Suppliers", href: "/suppliers", icon: Truck, roles: ["admin", "shopkeeper"] },
  { label: "Price Analysis", href: "/suppliers/price-analysis", icon: LineChart, roles: ["admin", "shopkeeper"] },
  // ...
]
```

**Pattern:** Each nav item has `label` (display text), `href` (URL), `icon` (Lucide component), `roles` (which roles can see it). The sidebar filters items by the user's role from `useRole()`.

### 10.6 New Route Module Boilerplate

```python
# Step 1: Create backend/app/api/v1/features.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/")
async def list_items(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return [{"message": "placeholder"}]

# Step 2: Register in backend/app/api/v1/__init__.py
from app.api.v1 import features
router.include_router(features.router, prefix="/features", tags=["Features"])
```

### 10.7 New Frontend Page Boilerplate

```bash
# Step 1: Create folder
mkdir -p src/app/\(dashboard\)/features

# Step 2: Create page.tsx
"use client"
import { useEffect, useState } from "react"
import { clientApi } from "@/lib/client-api"

export default function FeaturesPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clientApi.get("/api/v1/features/")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Features</h1>
      {loading ? <p>Loading...</p> : <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  )
}

# Step 3: Add sidebar entry (sidebar.tsx)
import { Sparkles } from "lucide-react"
# Add to navItems: { label: "Features", href: "/features", icon: Sparkles, roles: ["admin"] }
```
