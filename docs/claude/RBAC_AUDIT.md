# RBAC AUDIT REPORT

**Date:** 2026-06-10
**Application:** KhataBox

---

## 1. EXECUTIVE SUMMARY

The application has a **partially implemented** RBAC system. The infrastructure for role-based access control exists (UserRole enum, require_role dependency, role-based sidebar filtering), but enforcement is inconsistent and incomplete across both backend APIs and frontend routes.

**Current State:** MODERATE SECURITY RISK

---

## 2. ROLES DEFINED

| Role | Enum Value | Description |
|------|------------|-------------|
| Admin | `admin` | Full system access |
| Shopkeeper | `shopkeeper` | Store management |
| Customer | `customer` | B2C catalog/shopper |

---

## 3. AUTHENTICATION SYSTEM

### Backend (FastAPI)
- **Token-based:** JWT via `Authorization: Bearer` header
- **Decoder:** `app/core/security.py` - `decode_token()`
- **Dependency:** `app/core/dependencies.py`
  - `get_current_user` - Validates token, returns User
  - `require_role(*roles)` - Role checker that returns 403 if role not in allowed list

### Frontend (Next.js)
- **NextAuth.js** via `src/lib/auth.ts`
- **Session Provider:** `src/app/providers.tsx`
- **Client-side hook:** `useRole()` from `src/components/auth/role-guard.tsx`

---

## 4. BACKEND API PERMISSIONS AUDIT

### Current Enforcement Table

| API File | Endpoint | Auth Required | Role Required | ISSUE |
|---------|----------|--------------|---------------|-------|
| **auth.py** | `GET /me` | ✅ `get_current_user` | ❌ None | Any authenticated user |
| **auth.py** | `POST /register` | ❌ None | N/A | No auth - OK for registration |
| **auth.py** | `POST /login` | ❌ None | N/A | No auth - OK for login |
| **auth.py** | `DELETE /users/{id}` | ✅ | ✅ **admin only** | OK |
| **auth.py** | `GET /users/` | ✅ | ✅ **admin only** | OK |
| **auth.py** | `PATCH /users/{id}` | ✅ | ✅ **admin only** | OK |
| **transfers.py** | All endpoints | ✅ | ✅ admin/shopkeeper | OK |
| **customers.py** | All CRUD | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **orders.py** | All CRUD | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **products.py** | All CRUD | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **suppliers.py** | All CRUD | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **inventory.py** | Stock operations | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **purchase_orders.py** | All CRUD | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **stores.py** | All CRUD | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **invoices.py** | All | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **receipts.py** | All | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **dashboard.py** | `GET /stats` | ✅ get_current_user | ❌ None | **CRITICAL - No role check** |
| **catalog.py** | `GET /products` | ✅ get_current_user | ❌ None | **Possible Customer access** |
| **customer_cart.py** | All | ✅ get_current_user | ❌ None | **Possible Customer access** |
| **audit.py** | `GET /logs` | ✅ get_current_user | ❌ None | **DANGEROUS - No role check** |
| **data.py** | backup/restore | ✅ get_current_user | ❌ None | **DANGEROUS - No role check** |
| **forecasting.py** | ML predictions | ✅ get_current_user | ❌ None | **No role check** |
| **expiry.py** | Expiry tracking | ✅ get_current_user | ❌ None | **No role check** |
| **notifications.py** | All | ✅ get_current_user | ❌ None | **No role check** |
| **qrcodes.py** | QR generation | ✅ get_current_user | ❌ None | **No role check** |
| **reports.py** | Reports | ✅ get_current_user | ❌ None | **No role check** |

### Backend Security Flaws

1. **Overwhelming majority of endpoints only require authentication, NOT authorization**
   - Only 4 endpoints use `require_role()` (auth.py 3x, transfers.py 2x)
   - 20+ API files have NO role restrictions

2. **Customer users can access shopkeeper/admin endpoints**
   - They have valid JWT tokens
   - They pass `get_current_user` check
   - No ownership or role filtering

3. **Data isolation is owner-based but NOT role-based**
   - Example from `customers.py:16`: `.where(Customer.owner_id == current_user.id)`
   - A Customer with `owner_id` would see only their own data
   - BUT: Customers cannot have owned records in the system design
   - No role check means Customer users could call APIs that return empty results or fail silently

4. **Sensitive operations have no role protection**
   - `data.py` - Backup/restore (line 114-142)
   - `audit.py` - Audit logs (line 32)
   - `stores.py` - Create/update/delete stores
   - `inventory.py` - Stock adjustments

---

## 5. FRONTEND PERMISSIONS AUDIT

### Sidebar Navigation (src/components/layout/sidebar.tsx)

The sidebar has role-based filtering implemented correctly at lines 128-131:

```typescript
const filteredGroups = navGroups.map(group => ({
  ...group,
  items: group.items.filter(item => role && item.roles.includes(role))
})).filter(group => group.items.length > 0)
```

**Current Role-Based Visibility:**

| Page | Admin | Shopkeeper | Customer | Properly Protected |
|------|-------|-----------|----------|---------------------|
| Dashboard | ✅ Yes | ✅ Yes | ❌ No |
| Orders | ✅ Yes | ✅ Yes | ❌ No |
| Billing | ✅ Yes | ✅ Yes | ❌ No |
| Customers | ✅ Yes | ✅ Yes | ❌ No |
| Order History | ✅ Yes | ✅ Yes | ❌ No |
| Catalog | ❌ No | ❌ No | ✅ Yes |
| My Orders | ❌ No | ❌ No | ✅ Yes |
| Suppliers | ✅ Yes | ✅ Yes | ❌ No |
| Purchase Orders | ✅ Yes | ✅ Yes | ❌ No |
| Stock Transfers | ✅ Yes | ✅ Yes | ❌ No |
| Inventory | ✅ Yes | ✅ Yes | ❌ No |
| Movements | ✅ Yes | ✅ Yes | ❌ No |
| Scan | ✅ Yes | ✅ Yes | ❌ No |
| QR Labels | ✅ Yes | ✅ Yes | ❌ No |
| Forecasting | ✅ Yes | ✅ Yes | ❌ No |
| Reports | ✅ Yes | ✅ Yes | ❌ No |
| Price Analysis | ✅ Yes | ✅ Yes | ❌ No |
| Stores | ✅ Yes | ✅ Yes | ❌ No |
| Notifications | ✅ Yes | ✅ Yes | ✅ Yes |
| Settings | ✅ Yes | ✅ Yes | ✅ Yes |
| Admin/Users | ✅ Yes | ❌ No | ❌ No |

### Frontend Security Flaws

1. **No server-side route guards**
   - `requireAuth()` exists in `src/lib/auth-guard.ts` (lines 6-18)
   - It checks role but is NOT USED in any page component
   - No page calls `requireAuth()` in its code

2. **Customer can access all /dashboard/* routes**
   - URL is accessible: `localhost:3000/dashboard/inventory`
   - Returns 200 OK
   - Shows full UI
   - Sidebar filters what they see, but page itself is unprotected

3. **No API-level guards for frontend**
   - Frontend cannot rely on hidden UI
   - Any user can call any API endpoint directly
   - API returns data based on `owner_id` filter only

---

## 6. API-BY-API PERMISSIONS ANALYSIS

### Should Admin Access

| API | Current Access | Should Access | Status |
|-----|---------------|---------------|--------|
| `/api/v1/users/*` | admin | admin | ✅ OK |
| `/api/v1/stores/*` | authenticated | admin | ⚠️ Needs restrict |
| `/api/v1/audit/*` | authenticated | admin | ❌ Needs require_role |
| `/api/v1/data/backup` | authenticated | admin | ❌ Needs require_role |

### Should Shopkeeper Access

| API | Current Access | Should Access | Status |
|-----|---------------|---------------|--------|
| `/api/v1/customers/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/orders/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/products/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/suppliers/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/inventory/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/purchase_orders/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/receipts/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/dashboard/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/reports/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/forecasting/*` | authenticated | shopkeeper | ❌ Needs require_role |
| `/api/v1/transfers/*` | admin/shopkeeper | shopkeeper | ✅ OK |

### Should Customer Access

| API | Current Access | Should Access | Status |
|-----|---------------|---------------|--------|
| `/api/v1/catalog/*` | authenticated | customer | ⚠️ Filter by is_public |
| `/api/v1/customer_cart/*` | authenticated | customer | ⚠️ Filter by user_id |
| `/api/v1/orders/my` | authenticated | customer | ⚠️ Filter by user_id |
| `/api/v1/notifications/*` | authenticated | customer | ⚠️ Filter by user_id |

---

## 7. RECOMMENDED PERMISSION MATRIX

### Admin-Only APIs

```
admin@* - User management
GET    /api/v1/users/
POST   /api/v1/users/
GET    /api/v1/users/{id}
PATCH  /api/v1/users/{id}
DELETE /api/v1/users/{id}
GET    /api/v1/audit/logs
POST   /api/v1/data/backup/export
POST   /api/v1/data/backup/import
POST   /api/v1/data/backup/restore
GET    /api/v1/stores/    (list all - admin only)
POST   /api/v1/stores/   (create - admin only)
```

### Admin + Shopkeeper APIs

```
admin, shopkeeper - Store operations
GET    /api/v1/stores/my
PATCH /api/v1/stores/{id}
DELETE /api/v1/stores/{id}

admin, shopkeeper - B2C Operations
GET    /api/v1/customers/
POST   /api/v1/customers/
GET    /api/v1/customers/{id}
PATCH /api/v1/customers/{id}
DELETE /api/v1/customers/{id}
GET    /api/v1/orders/
POST   /api/v1/orders/
GET    /api/v1/orders/{id}
PATCH /api/v1/orders/{id}
POST   /api/v1/orders/bulk

admin, shopkeeper - Product Management
GET    /api/v1/products/
POST   /api/v1/products/
GET    /api/v1/products/{id}
PATCH /api/v1/products/{id}
DELETE /api/v1/products/{id}

admin, shopkeeper - Inventory
GET    /api/v1/inventory/stock
POST   /api/v1/inventory/adjust
GET    /api/v1/inventory/movements

admin, shopkeeper - Billing
GET    /api/v1/receipts/
POST   /api/v1/receipts/
GET    /api/v1/receipts/{id}
GET    /api/v1/invoices/
GET    /api/v1/invoices/{id}

admin, shopkeeper - B2B Operations
GET    /api/v1/suppliers/
POST   /api/v1/suppliers/
GET    /api/v1/suppliers/{id}
PATCH /api/v1/suppliers/{id}
DELETE /api/v1/suppliers/{id}
GET    /api/v1/purchase_orders/
POST   /api/v1/purchase_orders/
GET    /api/v1/purchase_orders/{id}
PATCH /api/v1/purchase_orders/{id}
GET    /api/v1/transfers/
POST   /api/v1/transfers/
GET    /api/v1/transfers/{id}
PATCH /api/v1/transfers/{id}

admin, shopkeeper - Analytics
GET    /api/v1/dashboard/stats
GET    /api/v1/reports/*
GET    /api/v1/forecasting/*
GET    /api/v1/expiry/*
GET    /api/v1/qrcodes/*
```

### Customer-Only APIs

```
customer - Self-service
GET    /api/v1/catalog/products
GET    /api/v1/catalog/products/{id}
GET    /api/v1/customer_cart/
POST   /api/v1/customer_cart/
GET    /api/v1/customer_cart/{id}
POST   /api/v1/customer_cart/{id}/items
DELETE /api/v1/customer_cart/{id}/items/{item_id}
POST   /api/v1/customer_cart/{id}/checkout
GET    /api/v1/orders/my
GET    /api/v1/orders/my/{id}
GET    /api/v1/notifications/
PATCH /api/v1/notifications/{id}/read
```

---

## 8. SECURITY SUMMARY TABLE

| Area | Status | Risk | Notes |
|------|--------|------|------|
| Authentication | ✅ Good | Low | JWT tokens properly validated |
| Role Enum | ✅ Good | None | Defined in user.py |
| Backend Role Dependency | ⚠️ Partial | Medium | Only 4 endpoints use require_role |
| Backend Data Isolation | ⚠️ Partial | Medium | owner_id filtering but no role check |
| Frontend Auth Guard | ⚠️ Exists | Medium | Unused in pages |
| Sidebar Visibility | ✅ Good | Low | Role-based filtering works |
| Page Route Guards | ❌ Missing | High | No server-side route protection |
| API-Level Role Protection | ❌ Missing | High | Most APIs have no role check |

---

## 9. RECOMMENDATIONS

### Priority 1 - Critical (API Role Enforcement)

1. Add `require_role("admin", "shopkeeper")` to all B2C/B2B endpoints
2. Add `require_role("admin")` to audit, backup, user management
3. Add `require_role("customer")` to customer_cart endpoints
4. Filter catalog by public products only

### Priority 2 - High (Frontend Route Guards)

1. Add `requireAuth(["admin"])` to `/admin/users` page
2. Add `requireAuth(["admin", "shopkeeper"])` to all B2C/B2B pages
3. Add `requireAuth(["customer"])` to `/catalog`, `/my-orders` pages

### Priority 3 - Medium (Data Scoping)

1. Add store_id scoping to all shopkeeper operations
2. Filter customer_cart by current_user.id
3. Filter orders/my by current_user.id

---

## 10. FILES REQUIRING MODIFICATION

### Backend (FastAPI)

| File | Change |
|------|--------|
| `app/core/dependencies.py` | Add new role-based dependencies |
| `app/api/v1/customers.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/orders.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/products.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/suppliers.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/inventory.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/purchase_orders.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/stores.py` | Add role-based scoping |
| `app/api/v1/invoices.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/receipts.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/dashboard.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/audit.py` | Add `require_role("admin")` |
| `app/api/v1/data.py` | Add `require_role("admin")` |
| `app/api/v1/reports.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/forecasting.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/expiry.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/qrcodes.py` | Add `require_role("admin", "shopkeeper")` |
| `app/api/v1/catalog.py` | Add public product filter |
| `app/api/v1/customer_cart.py` | Add user_id scoping |
| `app/api/v1/notifications.py` | Add user_id filtering |

### Frontend (Next.js)

| File | Change |
|------|--------|
| `src/app/(dashboard)/dashboard/page.tsx` | Add requireAuth |
| `src/app/(dashboard)/orders/page.tsx` | Add requireAuth |
| `src/app/(dashboard)/billing/page.tsx` | Add requireAuth |
| `src/app/(dashboard)/customers/page.tsx` | Add requireAuth |
| `src/app/(dashboard)/suppliers/page.tsx` | Add requireAuth |
| `src/app/(dashboard)/inventory/page.tsx` | Add requireAuth |
| `src/app/(dashboard)/admin/users/page.tsx` | Add requireAuth(["admin"]) |

---

## END OF AUDIT