# Internal Working

> **KhataBox** — AI-powered inventory & B2B retail management platform  
> *A deep technical dive into the internal architecture, data flow, and design decisions*

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication Flow (OTP-based)](#2-authentication-flow-otp-based)
3. [Multi-Cart Billing System](#3-multi-cart-billing-system)
4. [Order Processing Pipeline](#4-order-processing-pipeline)
5. [Database Schema & Relationships](#5-database-schema--relationships)
6. [Frontend Component Architecture](#6-frontend-component-architecture)
7. [Inventory Management](#7-inventory-management)
8. [Seed Data System](#8-seed-data-system)
9. [Test Results & Known Issues](#9-test-results--known-issues)
10. [Internal Code Flow Examples](#10-internal-code-flow-examples)

---

## 1. Architecture Overview

### High-Level System Diagram

```
+----------------------------------------------------------------------+
|                    FRONTEND (Next.js 16.2.7)                        |
|  localhost:3000                                                      |
|                                                                      |
|  +--------------------------------------------------------------+   |
|  |  App Router (20 routes)                                      |   |
|  |  State: Zustand (persisted) + TanStack React Query           |   |
|  |  UI: shadcn/ui + Tailwind CSS v4 + Framer Motion             |   |
|  |  Auth: JWT cookies (khatabox_token)                          |   |
|  +--------------------------------------------------------------+   |
|           | HTTP (REST API via client-api.ts)                       |
|           v                                                         |
+----------------------------------------------------------+         |
|              BACKEND (FastAPI + Uvicorn)                  |         |
|              localhost:8002                              |         |
|  +----------------------------------------------------+ |         |
|  |  API v1 Routers (31 route modules)                 | |         |
|  |  Services Layer (order_service, otp, cart, ...)    | |         |
|  |  Core Layer (database, security, dependencies)     | |         |
|  +----------------------------------------------------+ |         |
+------------------+---------------------------------------+         |
                   | SQLAlchemy async (asyncpg)                       |
                   v                                                   |
+------------------------------------------------------+             |
|           PostgreSQL (Neon DB)                        |             |
|           15 tables, 11,531+ records                  |             |
+------------------------------------------------------+             |

+------------------------------------------------------+
|           Redis (Cache + OTP Store) port 6379         |
+------------------------------------------------------+
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 16.2.7 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Component Library | shadcn/ui (Radix primitives) | -- |
| State (Client) | Zustand | 5.0.14 |
| Server State | TanStack React Query | 5.101.0 |
| Animations | Framer Motion | 12.42.2 |
| Charts | Recharts | 3.8.1 |
| Backend Framework | FastAPI | -- |
| Python | CPython | 3.14 |
| ORM | SQLAlchemy 2.0 (async) | -- |
| Auth | JWT (python-jose) + bcrypt (passlib) | -- |
| Database | PostgreSQL (Neon serverless) | -- |
| Cache | Redis | 7.x |
| Real-time | Socket.IO | -- |
| Email | Resend API | -- |

### Key Design Decisions

1. **Dual API client pattern** -- `frontend/src/lib/api.ts` for Server Components (Next.js server-side fetch), `client-api.ts` for Client Components (browser fetch with HTTPS upgrade)
2. **Session replication for seed** -- The seed script uses `SET session_replication_role = replica` to bypass FK constraints during truncation (no `TRUNCATE ... CASCADE` needed)
3. **Receipt system after commit** -- Receipts are generated *after* `db.commit()` to avoid FK constraint failures on uncommitted order IDs
4. **Neon compatibility** -- Database URL query params (sslmode, channel_binding) are stripped via urlparse because asyncpg rejects them; SSL is auto-enabled

---

## 2. Authentication Flow (OTP-based)

### Sequence Diagram

```
User/Browser              Frontend (Next.js)          Backend (FastAPI)           Resend API / Redis
     |                          |                          |                          |
     |  -- 1. Enter email -->   |                          |                          |
     |                          |                          |                          |
     |                          |  -- 2. POST /api/v1/     |                          |
     |                          |     auth/send-otp ---->  |                          |
     |                          |     { email }            |                          |
     |                          |                          |  -- 3. Generate 6-digit  |
     |                          |                          |     OTP ---------------> |
     |                          |                          |                          |
     |                          |                          |  -- 4. Store in Redis    |
     |                          |                          |     (key: otp:{email})   |
     |                          |                          |     + in-memory fallback |
     |                          |                          |                          |
     |                          |                          |  -- 5. Send email via    |
     |                          |                          |     Resend API --------> |
     |                          |                          |                          |
     |                          |  <-- { debug_otp } ----  |                          |
     |                          |     (dev only)           |                          |
     |  <-- 6. Auto-fill OTP -- |                          |                          |
     |     (if debug_otp)       |                          |                          |
     |                          |                          |                          |
     |  -- 7. Enter OTP ---->  |                          |                          |
     |                          |  -- 8. POST /api/v1/     |                          |
     |                          |     auth/register-       |                          |
     |                          |     with-otp ----------> |                          |
     |                          |     { email, otp, ... }  |                          |
     |                          |                          |  -- 9. Verify OTP       |
     |                          |                          |     (Redis to in-memory) |
     |                          |                          |                          |
     |                          |                          |  -- 10. Create User      |
     |                          |                          |      + Store (if         |
     |                          |                          |      shopkeeper)         |
     |                          |                          |                          |
     |                          |                          |  -- 11. Generate JWT     |
     |                          |                          |      (access + refresh)  |
     |                          |                          |                          |
     |                          |  <-- { access_token,     |                          |
     |                          |         refresh_token,   |                          |
     |  <-- 12. Set cookie ---- |         user } --------- |                          |
     |      & redirect -------> |                          |                          |
     |                          |                          |                          |
```

### OTP Generation & Verification

**File:** `backend/app/services/otp.py`

The OTP system uses a **dual-storage** strategy:

```python
OTP_TTL = 300  # 5 minutes

# Primary store: Redis cache (via cache service)
await cache_set(f"otp:{email}", otp, ttl=OTP_TTL)

# Fallback: in-memory dict (when Redis is unavailable)
_otp_store[email] = (otp, time.time() + OTP_TTL)
```

- **Generation**: `str(random.randint(100000, 999999))` -- 6-digit numeric
- **Verification**: Checks Redis first, falls back to in-memory store with expiry check
- **Email sending**: HTML template with inline styles via send_email()

### JWT Token Creation

**File:** `backend/app/core/security.py`

```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

The JWT payload contains `{"sub": str(user.id), "role": user.role}`.

### Auth Endpoints

**File:** `backend/app/api/v1/auth.py`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/v1/auth/send-otp | POST | Send 6-digit OTP to email |
| /api/v1/auth/register-with-otp | POST | Register + verify OTP + create store |
| /api/v1/auth/login-with-otp | POST | Login via OTP |
| /api/v1/auth/register | POST | Password-based registration |
| /api/v1/auth/login | POST | Password-based login |
| /api/v1/auth/refresh | POST | Refresh JWT tokens |
| /api/v1/auth/me | GET | Get current user profile |
| /api/v1/auth/users | GET | List users (admin only) |
| /api/v1/auth/users/{id}/role | PATCH | Update user role (admin) |
| /api/v1/auth/users/{id}/toggle-active | PATCH | Toggle active status (admin) |

### Frontend OTP Auto-Fill

**File:** `frontend/src/app/(customer)/register/page.tsx`

```typescript
// Step 1: Send OTP
async function handleSendOtp(e: React.FormEvent) {
    const res = await fetch(`${API_URL}/api/v1/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
    });
    setStep("otp");
}

// Step 2: Verify OTP
async function handleVerifyOtp() {
    const otpStr = otp.join("");
    const payload = {
        email: form.email,
        otp: otpStr,
        name: form.name,
        password: password || null,
        role,
    };
    const res = await fetch(`${API_URL}/api/v1/auth/register-with-otp`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    setAuthToken(data.access_token);
    // Redirect shopkeeper to /setup-inventory?store_type=X
}
```

### JWT Auth Guard

**File:** `frontend/src/lib/auth-guard.ts`

```typescript
export async function requireAuth(roles?: Role[]) {
    const token = cookieStore.get("khatabox_token")?.value 
               || cookieStore.get("admin_token")?.value;
    if (!token) redirect("/login");
    
    const user = await validateToken(token);  // GET /api/v1/auth/me
    if (!user) redirect("/login");
    
    if (roles && !roles.includes(user.role as Role)) {
        redirect("/dashboard");
    }
    return user;
}
```


## 3. Multi-Cart Billing System

### Zustand Billing Store

**File:** `frontend/src/store/billing.ts`

The billing system uses a **Zustand store with persist middleware** (localStorage key: khatabox-billing-store).

```typescript
interface CartItem {
    product_id: number;
    name: string;
    sku: string;
    unit_price: number;
    quantity: number;
}

interface BillingCart {
    id: string;
    name: string;
    status: "active" | "incomplete" | "cancelled";
    items: CartItem[];
    discount: number;
    createdAt: string;
    cancelledAt: string | null;
}
```

### Cart State Machine

```
                    +----------+
                    |  ACTIVE  | <-- Current working cart
                    +----+-----+
                         | "Add new cart" or "Switch away"
                         v
                    +--------------+
                    |  INCOMPLETE  | <-- Saved for later
                    +------+-------+
                           | "Delete" or "Switch to"
                           v
                    +--------------+
                    |  CANCELLED   | <-- Moved to history
                    +--------------+
```

### Store Actions

```typescript
// Key actions:
addNewCart()              // Creates new cart, marks current as incomplete
deleteCart(cartId)        // Marks cart as cancelled (soft delete)
switchToCart(cartId)      // Switch to specific cart
switchToNext()            // Next non-cancelled cart (cyclic)
switchToPrev()            // Previous non-cancelled cart (cyclic)
addItemToActiveCart()     // Add product to active cart (with qty merge)
removeItemFromActiveCart()// Remove product from active cart
updateQtyInActiveCart()   // Update qty (auto-deletes if qty <= 0)
setDiscountOnActiveCart() // Set discount amount
clearActiveCart()         // Clear all items + discount
```

### Billing Lifecycle Flowchart

```
                    +--------------------------+
                    |  User opens /billing      |
                    +------------+-------------+
                                 |
                    +------------v-------------+
                    |  Load products from       |
                    |  GET /api/v1/products     |
                    +------------+-------------+
                                 |
              +------------------+------------------+
              v                  v                  v
      +--------------+  +--------------+  +--------------+
      | Search by    |  | Scan QR code |  | Enter SKU    |
      | name/SKU     |  | (camera)     |  | manually     |
      +------+-------+  +------+-------+  +------+-------+
             |                 |                  |
             +-----------------+------------------+
                               |
                    +----------v-----------+
                    |  Product found?       |
                    |  Validate stock qty   |
                    +----------+-----------+
                               | (stock OK)
                    +----------v-----------+
                    |  addItemToActiveCart()|
                    |  (merge qty if dup)   |
                    +----------+-----------+
                               |
              +----------------+----------------+
              v                v                v
      +--------------+  +--------------+  +--------------+
      | Add more     |  | Adjust qty   |  | Press        |
      | items        |  | (inline)     |  | "Generate    |
      |              |  |              |  | Bill"        |
      +--------------+  +--------------+  +------+-------+
                                                  |
                                      +-----------v-----------+
                                      |   Checkout Modal       |
                                      |   1. Review items      |
                                      |   2. Select payment    |
                                      |   3. Submit order      |
                                      +-----------+-----------+
                                                  | POST /api/v1/orders/
                                      +-----------v-----------+
                                      |   Backend processes:   |
                                      |   1. Validate stock    |
                                      |   2. Create order      |
                                      |   3. Deduct inventory  |
                                      |   4. Update Khata      |
                                      |   5. Generate receipt  |
                                      +-----------+-----------+
                                                  |
                                      +-----------v-----------+
                                      |   Success -> New Cart  |
                                      |   (prev goes to ORDERS |
                                      |    section)            |
                                      +-----------------------+
```

### QR Scan Flow

**File:** `frontend/src/app/(dashboard)/billing/page.tsx`

```typescript
const handleQRScanned = useCallback(async (uuid: string) => {
    // 1. Lookup product by UUID
    const product = await clientApi.get<Product>(`/api/v1/products/by-uuid/${uuid}`);
    setLastScanned(product);
    
    // 2. Check stock availability
    const currentQty = activeItems.find(i => i.product_id === product.id)?.quantity || 0;
    if (currentQty + 1 > product.stock_quantity) {
        toast.error(`Only ${product.stock_quantity - currentQty} more available`);
        return;
    }
    
    // 3. Add to active cart
    addItemToActiveCart({
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: product.selling_price,
    }, 1);
}, [addItemToActiveCart]);
```

### Store Selection Context

**File:** `frontend/src/lib/store-context.ts`

```typescript
export const useStoreContext = create<StoreContextState>()(
    persist(
        (set) => ({
            activeStore: { id: null, name: null },
            setActiveStore: (store) => set({ activeStore: store }),
            clearActiveStore: () => set({ activeStore: { id: null, name: null } }),
        }),
        { name: "khatabox-active-store" }
    )
);
```


## 4. Order Processing Pipeline

### Complete Order Flow

```
+-------------------------------+
|  Cart submission from Frontend |
+----------------+--------------+
                 |
+----------------v--------------+
|  Step 1: Validate             |
|  - Items, int32 range, qty   |
+----------------+--------------+
                 |
+----------------v--------------+
|  Step 2: Calculate totals     |
|  subtotal = sum(qty*price)   |
|  gst = subtotal * 0.18       |
|  total = subtotal + gst - dis|
+----------------+--------------+
                 |
+----------------v--------------+
|  Step 3: Create Order         |
|  status = COMPLETED           |
|  db.add + db.flush           |
+----------------+--------------+
                 |
+----------------v--------------+
|  Step 4: For each item:       |
|  - Deduct stock              |
|  - InventoryMovement         |
|    (CONSUME_OUT)             |
|  - Log ProductActivity       |
|  - Check low stock           |
+----------------+--------------+
                 |
+----------------v--------------+
|  Step 5: Update Khata Credit |
|  customer.credit_used += tot |
+----------------+--------------+
                 |
+----------------v--------------+
|  Step 6: db.commit()          |
|  db.refresh(order, ["items"])|
+----------------+--------------+
                 |
+----------------v--------------+
|  Step 7: Generate Receipt     |
|  (AFTER commit - avoids FK   |
|   constraint issues)         |
+----------------+--------------+
                 |
+----------------v--------------+
|  Step 8: Post-processing      |
|  - Notification              |
|  - SocketIO emit             |
|  - Cache invalidate          |
+-------------------------------+
```

### Key Code: create_order()

**File:** backend/app/services/order_service.py (116-372)

```python
async def create_order(db, payload, shopkeeper_id):
    if not payload.items:
        raise HTTPException(400, detail="Order must have at least one item")
    subtotal = sum(item.unit_price * item.quantity for item in payload.items)
    gst = subtotal * 0.18 if getattr(payload, 'apply_gst', True) else 0
    total = subtotal + gst - payload.discount
    order = Order(order_number=generate_order_number(), status=COMPLETED, ...)
    db.add(order); await db.flush()
    for item in payload.items:
        order_item = OrderItem(order_id=order.id, ...)
        db.add(order_item); await db.flush()
        product = await db.execute(select(Product).where(...)).scalar_one_or_none()
        if product:
            product.stock_quantity -= item.quantity
    await db.commit(); await db.refresh(order, ['items'])
```

### GST Calculation

The GST is **18%** (standard Indian GST rate) applied to the subtotal:

```python
gst = subtotal * 0.18 if getattr(payload, 'apply_gst', True) else 0
```

### SQLAlchemy Transaction Pattern

The service uses explicit save-and-flush with two-stage commit:

```
db.add(order) -> db.flush()       # Get order.id
db.add(items) -> db.flush()       # Get item IDs, validate stock
db.add(movements) -> db.flush()   # Log movements
db.add(credit) -> db.flush()      # Update customer credit
db.commit()                       # MAIN COMMIT
db.refresh(order, ['items'])      # Eagerly load items

# SECOND TRANSACTION (receipt)
db.add(receipt) -> db.flush()
db.add(receipt_items) -> db.commit()
```

### Order Revision Flow

**File:** backend/app/services/order_service.py (641-780)

Orders can be revised (quantity/price changes) via update_order_status() with revised_items:
1. Validate only completed orders can be revised
2. Calculate new totals with GST
3. Adjust inventory by difference (consumes more or returns excess)
4. Update or delete OrderItems as needed
5. Generate adjustment receipt
6. Track revision metadata (revision_number, previous_total, adjustment_total)

## 5. Database Schema & Relationships

### Entity-Relationship Diagram (Text)

```
+-----------+       +-----------+       +-----------+
|   users   |1--N+  |  stores   |       |  stores   |
| (id,email,|    |  | (id,name, |       | (id)      |
|  role,    |    |  |  owner_id)|       +-----------+
|  pwd_hash)|    |  +-----------+            |
+-----------+    |       |                   |
                 |       | 1                 | N
                 |       v                   v
                 |  +-----------+       +-----------+
                 |  | products  |       | inventory_|
                 |  | (id,name, |       | movements |
                 |  |  sku,stock|       | (id,ref)  |
                 |  |  owner_id)|       +-----------+
                 |  +-----------+
                 |       |
                 |       | 1
                 |       v
                 |  +-----------+       +-----------+
                 |  | orders   |1--N+  |order_items|
                 |  | (id,#,   |    |  | (id,qty,  |
                 |  |  customer|    |  |  price)   |
                 |  | shopkeeper)   |  +-----------+
                 |  +-----------+
                 |       | 1
                 |       v
                 |  +-----------+       +-----------+
                 |  | receipts  |1--N+  |receipt_   |
                 |  | (id,#,    |    |  |items      |
                 |  |  order_id)|    |  | (id)      |
                 |  +-----------+    |  +-----------+
                 |
+-----------+    |  +-----------+       +-----------+
| customers |N---+  | invoices  |       | payments  |
| (id,email,|       | (id,#,    |       | (id,txn_id|
|  owner_id)|       |  order_id)|       |  order_id)|
+-----------+       +-----------+       +-----------+

All entities scoped by owner_id
```

#### 4. customers - B2B Customers

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK |
| company_name / contact_person | VARCHAR(255) | nullable |
| email / phone | VARCHAR | nullable |
| gst_number | VARCHAR(50) | nullable |
| credit_limit / credit_used | FLOAT | default 0 |
| price_tier | VARCHAR(50) | default standard |
| owner_id | INTEGER | NOT NULL |

#### 5. orders - Sales orders

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK |
| order_number | VARCHAR(50) | UNIQUE |
| shopkeeper_id / customer_id | INTEGER | NOT NULL / nullable |
| status | ENUM | 7 values |
| payment_method | ENUM | cash, upi, credit, bank_transfer |
| is_b2c | BOOLEAN | default FALSE |
| subtotal / discount / gst / total | FLOAT | default 0 |
| notes | VARCHAR(500) | nullable |
| revision_number / previous_total | INTEGER / FLOAT | revision tracking |
| adjustment_total / revision_status | FLOAT / VARCHAR | revision tracking |

#### 6. order_items - Order line items

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK |
| order_id | INTEGER | FK to orders.id |
| product_id / product_name | INTEGER / VARCHAR | |
| quantity | INTEGER | NOT NULL |
| unit_price / total_price | FLOAT | NOT NULL |

#### 7. receipts - Payment receipts

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK |
| receipt_number | VARCHAR(50) | UNIQUE |
| order_id / b2c_order_id | INTEGER | FK, nullable |
| shopkeeper_id / customer_id / store_id | INTEGER | store_id denormalized |
| payment_method | ENUM | |
| subtotal / discount / taxes / total_amount | FLOAT | |
| generated_at | TIMESTAMPTZ | |

#### 8. receipt_items - Receipt line items

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK |
| receipt_id | INTEGER | FK to receipts.id |
| order_item_id | INTEGER | FK, nullable |
| product_id / product_name | INTEGER / VARCHAR | |
| quantity / unit_price / line_total | | |
| taxes / discount | FLOAT | default 0 |

#### Additional tables: suppliers, purchase_orders, purchase_order_items, inventory_movements, stock_transfers, notifications, seed_products, b2c_orders, b2c_order_items, customer_carts, customer_cart_items, payments, invoices, product_activities, price_history, audit_logs

### Enum Definitions

**OrderStatus** (order.py:10): pending, confirmed, counter, processing, completed, cancelled, rejected
**PaymentMethod** (order.py:20): cash, upi, credit, bank_transfer
**MovementType** (inventory.py:10): sale, purchase, adjustment, return, transfer_in, transfer_out, reserve_out, consume_out, reserve_cancelled_in
**StoreType** (store.py:10): kirana, supermart, pharmacy, electronics, clothing, restaurant, other
**CartStatus** (customer_cart.py:10): active, checkout, completed, cancelled
**POStatus** (purchase_order.py:10): draft, sent, received, cancelled
**StockTransferStatus** (inventory.py:41): pending, approved, rejected, completed
**UserRole** (user.py:10): admin, shopkeeper, customer
**ActivityType** (product_activity.py:10): 10 activity types
**NotificationType** (notification.py:10): 16 notification types

### Migration History (0001 to 0024)

| Revision | Description |
|----------|-------------|
| 0001 | Initial schema: 8 tables |
| 0002 | Full-text search on products |
| 0003 | Expiry & batch tracking |
| 0004 | Multi-store (store_id FK) |
| 0005 | Product image URL |
| 0006 | Performance indexes |
| 0007 | Stock transfers |
| 0008 | Transfer enum values |
| 0009 | Product UUID |
| 0010 | Inventory reservation |
| 0011 | **Receipt system** |
| 0012 | Store business fields |
| 0013 | Optional field relaxations |
| 0014 | B2C support (counter status) |
| 0015 | Payments table |
| 0016 | B2C orders system |
| 0017 | **Seed products table** |
| 0018 | Clerk auth support |
| 0019 | B2C order ID in receipts |
| 0020 | Pricing fields |
| 0021 | Composite unique (email, role) |
| 0022 | Receipts order_id nullable |
| 0023 | Order revision fields |
| 0024 | Notification type extensions |

### Current Migration State

All 17 core migrations (0001-0017) are applied. The DB has 15+ tables with 11,531+ seeded records.


## 6. Frontend Component Architecture

### Route Structure (20 routes)

```
src/app/
+-- page.tsx                          # / -> redirects to /khatabox
+-- khatabox/page.tsx                 # /khatabox - Landing page
+-- layout.tsx                        # Root layout (Inter font, Providers)
+-- providers.tsx                     # TanStack Query + Theme + Tooltip
|
+-- (customer)/                       # Customer-facing routes
|   +-- layout.tsx                    # Customer layout (minimal nav)
|   +-- cart/page.tsx                 # /cart - Customer shopping cart
|   +-- catalog/page.tsx              # /catalog - Product catalog
|   +-- customer/page.tsx             # /customer - Customer dashboard
|   +-- login/page.tsx                # /login - Customer login
|   +-- my-orders/page.tsx            # /my-orders - Order list
|   +-- my-orders/[id]/page.tsx       # /my-orders/[id] - Order detail
|   +-- payment-simulate/page.tsx     # /payment-simulate
|   +-- receipts/[id]/page.tsx        # /receipts/[id] - Receipt view
|   +-- register/page.tsx             # /register - Customer registration
|   +-- scan/page.tsx                 # /scan - QR code scanner
|
+-- (dashboard)/                      # Shopkeeper/Admin dashboard
    +-- layout.tsx                    # Dashboard layout (sidebar + header)
    +-- admin/users/page.tsx          # /admin/users - User management
    +-- b2c-order-history/page.tsx    # /b2c-order-history
    +-- b2c-orders/page.tsx           # /b2c-orders
    +-- billing/page.tsx              # /billing - Multi-cart billing
    +-- catalog/page.tsx              # /catalog - Shopkeeper catalog
    +-- customers/page.tsx            # /customers
    +-- customers/scan/page.tsx       # /customers/scan
    +-- dashboard/page.tsx            # /dashboard - Main dashboard
    +-- forecasting/page.tsx          # /forecasting
    +-- inventory/page.tsx            # /inventory - Product list
    +-- inventory/movements/page.tsx  # /inventory/movements
    +-- inventory/scan/page.tsx       # /inventory/scan
    +-- my-orders/page.tsx            # /my-orders (dashboard view)
    +-- notifications/page.tsx        # /notifications
    +-- order-history/page.tsx        # /order-history
    +-- orders/page.tsx               # /orders
    +-- price-analysis/page.tsx       # /price-analysis
    +-- purchase-orders/page.tsx      # /purchase-orders
    +-- qr-labels/page.tsx            # /qr-labels
    +-- reports/page.tsx              # /reports
    +-- settings/page.tsx             # /settings
    +-- setup-inventory/page.tsx      # /setup-inventory - Onboarding
    +-- stores/page.tsx               # /stores
    +-- suppliers/page.tsx            # /suppliers
    +-- suppliers/price-analysis/     # /suppliers/price-analysis
    +-- transfers/page.tsx            # /transfers
```

### Component Directory Structure

```
src/components/
+-- auth/                     # Auth-related components
+-- customers/                # Customer-specific components
+-- inventory/                # Inventory-related components
+-- layout/                   # Layout components (sidebar, header, nav)
|   +-- sidebar.tsx           # Dashboard sidebar navigation
|   +-- header.tsx            # Dashboard header with store selector
|   +-- landing-nav.tsx       # Landing page navigation
+-- products/                 # Product-related components
+-- store-selector.tsx        # Store selection dropdown
+-- ui/                       # shadcn/ui primitives
    +-- button.tsx            # Button with variants
    +-- card.tsx              # Card with Header/Content/Footer
    +-- table.tsx             # Table with Head/Body/Row/Cell
    +-- dialog.tsx            # Modal dialog
    +-- input.tsx             # Styled input
    +-- select.tsx            # Dropdown select
    +-- tabs.tsx              # Tabbed interface
    +-- badge.tsx             # Status badge
    +-- qr-scanner.tsx        # QR code scanner (html5-qrcode)
    +-- ...                   # Additional primitives
```

### API Client - Dual Implementation

#### Server-Side API (src/lib/api.ts)

Used in Server Components (Next.js async function pages):

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

async function getAuthHeaders() {
    const cookieStore = await cookies();
    const token = cookieStore.get("khatabox_token")?.value 
               || cookieStore.get("admin_token")?.value;
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}
```

#### Client-Side API (src/lib/client-api.ts)

Used in Client Components ("use client"):

```typescript
function getApiUrl(): string {
    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";
    // When the page is served over HTTPS (Vercel), upgrade API URL too
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
        return url.replace(/^http:/i, "https:");
    }
    return url;
}
```

The extractError() helper converts FastAPI array validation errors to readable strings.

### State Management Pattern

Zustand stores with persist middleware:

| Store | localStorage Key | Purpose |
|-------|-----------------|---------|
| src/store/billing.ts | khatabox-billing-store | Multi-cart billing |
| src/lib/store-context.ts | khatabox-active-store | Active store selection |

### TanStack React Query Pattern

**File:** src/lib/query-keys.ts

```typescript
export const queryKeys = {
    dashboard: { stats: (storeId?) => ['dashboard', 'stats', storeId] },
    products: { list: (filters?) => ['products', 'list', filters] },
    orders: { list: (filters?) => ['orders', 'list', filters] },
    customers: { list: (filters?) => ['customers', 'list', filters] },
    catalog: { products: (search?) => ['catalog', 'products', search] },
    suppliers: { list: (filters?) => ['suppliers', 'list', filters] },
    inventory: { movements: (filters?) => ['inventory', 'movements', filters] },
};
```

### UI Constants

**File:** src/lib/ui-constants.ts

```typescript
export const ORDER_STATUS_CONFIG = {
    pending:    { label: "Pending",    color: "bg-amber-600 hover:bg-amber-700 text-white" },
    confirmed:  { label: "Confirmed",  color: "bg-blue-600 hover:bg-blue-700 text-white" },
    counter:    { label: "Counter",    color: "bg-orange-600 hover:bg-orange-700 text-white" },
    processing: { label: "Processing", color: "bg-purple-600 hover:bg-purple-700 text-white" },
    completed:  { label: "Completed",  color: "bg-green-600 hover:bg-green-700 text-white" },
    cancelled:  { label: "Cancelled",  color: "bg-red-600 hover:bg-red-700 text-white" },
    rejected:   { label: "Rejected",   color: "bg-red-600 hover:bg-red-700 text-white" },
};
```


## 7. Inventory Management

### Stock In/Out Operations

Every stock change creates an InventoryMovement record:

| Type | Sign | Trigger |
|------|------|---------|
| SALE | Negative | Legacy sales |
| PURCHASE | Positive | Purchase order received |
| ADJUSTMENT | +/- | Manual stock adjustment |
| RETURN | Positive | Order rejected or returned |
| TRANSFER_IN | Positive | Stock received from another store |
| TRANSFER_OUT | Negative | Stock sent to another store |
| CONSUME_OUT | Negative | Order completion (current flow) |
| RESERVE_OUT | Negative | Order reservation (future use) |
| RESERVE_CANCELLED_IN | Positive | Reservation cancelled |

### Stock Deduction Flow

**File:** backend/app/services/order_service.py (lines 191-224)

```python
# 1. Check stock
if product.stock_quantity < item.quantity:
    raise HTTPException(status_code=400, 
        detail=f"Insufficient stock for {product.name}: have {product.stock_quantity}, need {item.quantity}")

# 2. Deduct
product.stock_quantity -= item.quantity

# 3. Log movement (CONSUME_OUT)
movement = InventoryMovement(
    product_id=item.product_id,
    shopkeeper_id=shopkeeper_id,
    movement_type=MovementType.CONSUME_OUT,
    quantity=-item.quantity,
    reference=f"Order #{order.order_number}",
)

# 4. Log product activity
await log_activity(
    db=db, product_id=item.product_id, shopkeeper_id=shopkeeper_id,
    activity_type=ActivityType.ORDER_CONSUMED,
    quantity=-item.quantity,
    reference=f"Order #{order.order_number}",
)

# 5. Check low stock
await check_low_stock(item.product_id, shopkeeper_id, db)
```

### Stock Transfers Between Stores

**File:** backend/app/models/inventory.py (lines 41-64)

StockTransfer tracks transfers with from_store_id -> to_store_id, status lifecycle: pending -> approved -> completed (or rejected). Transfers update stock at both stores and create corresponding TRANSFER_OUT and TRANSFER_IN movements.

### Product Activity Logging

**File:** backend/app/services/product_activity_service.py

```python
async def log_activity(db, product_id, shopkeeper_id, activity_type, 
                       previous_value=None, new_value=None, 
                       quantity=None, reference=None, notes=None):
    activity = ProductActivity(
        product_id=product_id,
        shopkeeper_id=shopkeeper_id,
        activity_type=activity_type,
        previous_value=previous_value,
        new_value=new_value,
        quantity=quantity,
        reference=reference,
        notes=notes,
    )
    db.add(activity)
```

### Price History Tracking

**File:** backend/app/models/price_history.py

Tracks changes to field_name (e.g., selling_price, cost_price) with previous_value -> new_value, recording changed_by and reason.

## 8. Seed Data System

### Architecture Overview

Two independent seeders serve different purposes:

1. **seed_india.py** - Main data seeder: 14 tables, 11,531+ records, Indian demo data
2. **seed_seed_products.py** - Product catalog seeder: 1 table, 178 products, 6 store types

### seed_india.py - Main Data Seeder

**File:** backend/seed_india.py (1,413 lines)

#### Idempotency & Truncation Logic

```python
# Check if data already exists
result = await session.execute(select(User).where(User.email == "admin@khatabox.com"))
existing_admin = result.scalar_one_or_none()
if existing_admin:
    # Disable FK checks for truncation
    await session.execute(text("SET session_replication_role = 'replica'"))
    
    # Truncate all 21 tables in any order (FK-safe)
    tables = ["audit_logs", "notifications", "stock_transfers", "inventory_movements",
              "purchase_order_items", "purchase_orders", "invoices",
              "receipt_items", "receipts", "order_items", "orders",
              "payments", "b2c_order_items", "b2c_orders",
              "customer_cart_items", "customer_carts",
              "products", "suppliers", "customers", "stores", "seed_products"]
    for t in tables:
        await session.execute(text(f"DELETE FROM {t}"))
    
    # Re-enable FK checks
    await session.execute(text("SET session_replication_role = 'origin'"))
    
    # Remove orphaned customer users
    await session.execute(text("DELETE FROM users WHERE email != 'admin@khatabox.com'"))
    await session.commit()
```

#### Seeding Sequence

| Step | Entity | Records |
|------|--------|---------|
| 1 | Users | 115 (1 admin + 15 shopkeepers + 99 customers) |
| 2 | Stores | 16 |
| 3 | Products | 300 (13 categories) |
| 4 | Suppliers | 30 |
| 5 | Customers | 100 B2B |
| 6 | Orders | 1,542 (with seasonal/festive pricing) |
| 7 | Order Items | 3,684 |
| 8 | Invoices | 1,221 |
| 9 | Purchase Orders | 60 |
| 10 | PO Items | 341 |
| 11 | Inventory Movements | 3,684 |
| 12 | Stock Transfers | 20 |
| 13 | Notifications | 12 |
| 14 | Audit Logs | ~140 |

Orders span a 90-day window with seasonal price adjustments, festive premiums (5-15% during Diwali/Holi), weighted status distribution, 70% B2B / 30% walk-in ratio, and 0-8% random discount.

### seed_seed_products.py - Product Catalog Seeder

**File:** backend/seed_seed_products.py (229 lines)

Populates seed_products with 178 products across 6 store types:

| Store Type | Products | Examples |
|------------|----------|---------|
| kirana | 36 | Rice, dal, oil, spices |
| supermart | 34 | Bulk items, branded goods |
| pharmacy | 30 | Medicines, first aid |
| electronics | 26 | Bulbs, fans, cables |
| clothing | 25 | T-shirts, sarees, jeans |
| restaurant | 27 | Bulk ingredients |

#### Neon-compatible batch insert:

```python
batch_size = 50
for i in range(0, len(all_rows), batch_size):
    batch = all_rows[i:i+batch_size]
    sql = "INSERT INTO seed_products (...) VALUES " + ",".join(batch)
    await conn.execute(text(sql))
```

### Setup Inventory Wizard

When a new shopkeeper registers, they are redirected to /setup-inventory?store_type=X. This page queries seed_products for the matching store_type and creates real Product records from the templates. The dashboard shows a permanent "Our Suggestions" card linking to this wizard.


## 9. Test Results & Known Issues

### API Endpoint Test Results

Source: docs/RUNTIME_TEST_REPORT.md

| Component | Pass | Fail | Coverage |
|-----------|------|------|----------|
| API Endpoints | 35 | 0 | All major CRUD + workflows |
| Frontend Pages | 20 | 0 | All public routes |

### Test Details (35 endpoints)

All 35 API endpoint tests pass with no failures. All 20 frontend routes build and serve successfully.

### Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| Data ownership scoping failures | FAIL (11) | Unresolved |
| Missing endpoints | FAIL (11) | Unresolved |
| MissingGreenlet (order creation) | ERROR (4) | FIXED |
| QR endpoint returns binary (not JSON) | Info | Expected |
| Customer dashboard access | Info | Intentional design |

### Key Fixes Applied

1. database.py - Strip sslmode/channel_binding from Neon DB URL
2. 0017 migration - Idempotent CREATE TABLE IF NOT EXISTS
3. seed_india.py - Extended status_weights from 5 to 6 entries
4. seed_india.py - Added missing tables to truncation list
5. client-api.ts - HTTPS upgrade for Mixed Content fix
6. orders.py - db.refresh(order, ['items']) to fix MissingGreenlet
7. orders.py - payload.customer_id to customer.id for BulkOrderCreate
8. customer.py - Removed cascade from carts relationship
9. order_service.py - Receipt generation after main db.commit()
10. billing/page.tsx - Stock validation, product_name in order payload

## 10. Internal Code Flow Examples

### Example 1: Complete Order Creation Flow

File: backend/app/services/order_service.py

```
Step 1: Validate payload - items, int32 range, qty >= 1, price >= 0
Step 2: Calculate financials - subtotal = sum(qty*price), gst = 18%, total
Step 3: Create Order - status=COMPLETED, db.add -> db.flush()
Step 4: For each item - deduct stock, InventoryMovement, log_activity
Step 5: Update Khata - customer.credit_used += order.total
Step 6: COMMIT - db.commit(), db.refresh(order, ['items'])
Step 7: Generate Receipt (AFTER commit) - Receipt + ReceiptItems
Step 8: Post-processing - Notifications, SocketIO, cache invalidation
```

### Example 2: OTP Auth Flow

```
User -> Frontend -> Backend: POST /send-otp {email}
Backend: generate 6-digit OTP, store in Redis + in-memory
Backend: send email via Resend API
User -> Frontend -> Backend: POST /register-with-otp {email, otp}
Backend: verify OTP, create User + Store, generate JWT
Frontend: set cookie, redirect
```

### Example 3: Billing Store (Zustand)

File: frontend/src/store/billing.ts

```typescript
const useBillingStore = create<BillingState>()(
  persist((set, get) => ({
    carts: [initialCart],
    activeCartId: initialCart.id,
    addNewCart: () => { /* marks current incomplete, adds new */ },
    deleteCart: (id) => { /* soft delete -> cancelled */ },
    addItemToActiveCart: (item, qty) => { /* merge or add */ },
  }), { name: 'khatabox-billing-store' })
);
```

### Example 4: HTTPS Mixed Content Fix

File: frontend/src/lib/client-api.ts

```typescript
function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return url.replace(/^http:/i, 'https:');
  }
  return url;
}
```

### Example 5: Database Neon Compatibility

File: backend/app/core/database.py

```python
parsed = urlparse(settings.DATABASE_URL)
qs = parse_qs(parsed.query, keep_blank_values=True)
for key in ('sslmode', 'channel_binding'):
    qs.pop(key, None)
clean_query = urlencode(qs, doseq=True)
db_url = urlunparse(parsed._replace(query=clean_query))
engine = create_async_engine(db_url, echo=False)
```

### Example 6: JWT Auth Guard

File: backend/app/core/dependencies.py

```python
async def get_current_user(credentials, db):
    payload = decode_token(credentials.credentials)
    user_id = payload.get('sub')
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401)
    return user
```

### Example 7: Low Stock Notification

File: backend/app/services/notifications.py

```python
async def check_low_stock(product_id, shopkeeper_id, db):
    product = await db.execute(select(Product).where(Product.id == product_id))
    if product.stock_quantity > product.reorder_threshold:
        return None
    return await create_notification(
        db=db, user_id=shopkeeper_id, type=NotificationType.LOW_STOCK,
        title='Low Stock Alert',
        message=f'{product.name} has only {product.stock_quantity} units',
    )
```

### Example 8: Frontend Providers

File: frontend/src/app/providers.tsx

```tsx
export function Providers({ children }) {
    const [queryClient] = useState(() => new QueryClient());
    return (
        <ThemeProvider attribute='class' defaultTheme='light'>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </ThemeProvider>
    );
}
```

---

*Document generated from codebase analysis. All file paths are relative to D:. PLACEMENTA. PROJECTS\KhataBox\*. PLACEMENTA. PROJECTS\KhataBox\*