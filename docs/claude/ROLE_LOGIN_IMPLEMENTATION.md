# Role-Based Login Implementation

## Overview
Implemented separate role entry points for Customer, Shopkeeper, and Admin with clear role selection UI and security controls.

## Architecture

### Roles
- **Customer**: Shop and track orders (external buyers)
- **Shopkeeper**: Manage store inventory and orders (internal users)
- **Admin**: Access admin dashboard and analytics (system administrators)

### Data Model
User roles defined in `backend/app/models/user.py`:
```python
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SHOPKEEPER = "shopkeeper"
    CUSTOMER = "customer"
```

## Implementation Details

### 1. Login Page (`src/app/login/page.tsx`)
- Role selection with 3 cards (Customer, Shopkeeper, Admin)
- Each card shows role name, icon, and description with distinct colors:
  - Customer: Green theme
  - Shopkeeper: Blue theme
  - Admin: Purple theme
- Login form appears after role selection
- Role validation on login submit

### 2. Register Page (`src/app/register/page.tsx`)
- Role from URL query param (`?role=customer` or `?role=shopkeeper`)
- Admin registration blocked (redirects to /login)
- Customer: Simplified form (name, phone, email, password)
- Shopkeeper: Extended form (name, phone, store_name, email, password)

### 3. Authentication (`src/lib/auth.ts`)
- Credentials provider accepts `role` parameter
- Validates user role matches selected role:
  - Customer login requires user.role === "customer"
  - Shopkeeper login requires user.role === "shopkeeper"
  - Admin login passes through (admins can access everything)
- Stores role in JWT token and session

### 4. Backend Protection (`backend/app/api/v1/auth.py`)
- Public registration blocks admin role:
```python
if payload.role == "admin":
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin registration is restricted"
    )
```

## Security Controls

### Role Isolation
1. Customer cannot become shopkeeper or admin
2. Shopkeeper cannot become admin
3. Admin registration is restricted (no public endpoint)

### Backend Enforcement
- `/api/v1/auth/register` blocks admin role
- Role validation happens in NextAuth credentials provider
- JWT token contains role for server-side validation

## Existing Seeded Users

All seeded users continue to work:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@khatabox.com | Admin@123 |
| Shopkeeper | {store}@khatabox.com | Shop@123 |
| Customer | contact.{name}@client.com | customer123 |

Example shopkeepers seeded:
- cityelectronics@khatabox.com
- megamart@khatabox.com
- trendsfashion@khatabox.com
- medlife@khatabox.com
- stationeryhub@khatabox.com
- (and 10 more)

## Dashboard Routing

| Role | Destination |
|------|--------------|
| Customer | /customer |
| Shopkeeper | /dashboard |
| Admin | /dashboard |

## Files Modified

1. `src/app/login/page.tsx` - Role selection UI
2. `src/app/register/page.tsx` - Role-aware registration
3. `src/lib/auth.ts` - Role validation in credentials provider
4. `backend/app/api/v1/auth.py` - Admin registration blocked

## Files Unchanged

- Dashboard functionality (all routes work)
- Business workflows (orders, inventory, etc.)
- API contracts (customers, products, orders, etc.)
- Database schema