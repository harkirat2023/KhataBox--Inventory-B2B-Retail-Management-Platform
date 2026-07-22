# KhataBox — Security Overview

Security features, practices, and configuration for the KhataBox platform.

---

## Authentication

### JWT Tokens

- **Access tokens**: Short-lived (default 30 minutes), signed with HS256 algorithm using a configurable `SECRET_KEY`.
- **Refresh tokens**: Longer-lived (default 7 days), same signing mechanism.
- Token generation in `backend/app/core/security.py`:
  - `create_access_token(data)` — encodes user ID (`sub`) with expiry.
  - `create_refresh_token(data)` — same with longer expiry.
  - `decode_token(token)` — returns payload or `None` on invalid/expired token.
- Tokens are generated on successful login (`POST /api/v1/auth/login`).
- Token validation happens on every protected request via `get_current_user()` dependency.

### Password Hashing

- **Algorithm**: bcrypt via `passlib` library with `CryptContext`.
- Implemented in `backend/app/core/security.py`:
  - `hash_password(password)` — returns bcrypt hash.
  - `verify_password(plain, hashed)` — returns boolean.
- No plain-text passwords are stored or transmitted.

### NextAuth Session Management

- **Strategy**: JWT (stateless, no database sessions).
- Session is stored as an encrypted cookie (encrypted with `AUTH_SECRET`).
- The JWT callback extends the token with `id`, `role`, `access_token`, `refresh_token`.
- The session callback makes tokens available to client components via `useSession()`.
- Configuration in `src/lib/auth.ts`.

---

## Authorization

### Role-Based Access Control (RBAC)

Three roles with hierarchical permissions:

| Role | Description |
|------|-------------|
| `admin` | Full system access, user management, cross-store analytics |
| `shopkeeper` | Store-level access: inventory, orders, billing, customers, suppliers, reports |
| `customer` | Limited to catalog browsing, own orders, own invoices |

### Enforcement Points

| Layer | Mechanism | Location |
|-------|-----------|----------|
| API | `require_role("admin", "shopkeeper")` dependency | `backend/app/core/dependencies.py:30` |
| Server Component | `requireAuth(["admin"])` | `src/lib/auth-guard.ts:6` |
| Client Component | `<RoleGuard allowedRoles={["admin"]}>` | `src/components/auth/role-guard.tsx` |
| Navigation | Sidebar filters menu items by role | `src/components/layout/sidebar.tsx` |

### API Protection (Dependencies)

```python
# backend/app/core/dependencies.py
async def get_current_user(credentials, db):
    payload = decode_token(credentials.credentials)
    # Validate token → fetch user → return user or 401

def require_role(*roles):
    async def role_checker(current_user):
        if current_user.role not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return current_user
    return role_checker
```

---

## Input Validation

### Backend (Pydantic v2)

- All request bodies are validated by Pydantic schemas in `backend/app/schemas/`.
- Schemas enforce types, string lengths, numeric ranges, and optional fields.
- Invalid requests return 422 with field-level error details.

### Frontend

- TypeScript interfaces in `src/types/` provide compile-time type checking.
- Zod schemas (available in the dependency tree) are available for runtime validation.

---

## SQL Injection Prevention

- All database queries use SQLAlchemy ORM with parameterized queries.
- Raw SQL is limited to:
  - Full-text search (`search_vector @@ plainto_tsquery(...)`) — uses ORM query builder.
  - Backup export (`SELECT * FROM {table}`) — table name is from a whitelist (`TABLES` list in `backup.py`), not user input.
  - Backup import — uses parameterized `:key` syntax for values.
- No raw string interpolation in SQL queries.

---

## CORS Configuration

- Configurable via `CORS_ORIGINS` environment variable (comma-separated list).
- Default: `http://localhost:3000`.
- Production: set to the Vercel frontend domain.
- Middleware configured in `backend/app/main.py:40-46`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.CORS_ORIGINS.split(","),
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

---

## Rate Limiting

- **Limit**: 100 requests per minute per IP address.
- **Algorithm**: Sliding window (per-minute bucket).
- **Backend**: Redis (primary) with in-memory fallback.
- **Excluded paths**: `/ws`, `/health`, `/docs`, `/redoc`, `/openapi.json`.
- **Response**: HTTP 429 with `Rate limit exceeded` message when exceeded.
- Implementation in `backend/app/services/rate_limiter.py`.

---

## Audit Logging

- All entity changes (create, update, delete) are logged to the `audit_logs` table.
- Audit log fields: `user_id`, `entity` (table name), `entity_id`, `action` (create/update/delete), `details` (JSON), `timestamp`.
- Logs are paginated and accessible via `GET /api/v1/audit/logs`.
- No automatic deletion policy — logs accumulate indefinitely.

---

## Secret Management

- All secrets are stored in environment variables, never in the codebase.
- Backend secrets (in `backend/.env` or Railway env vars):
  - `DATABASE_URL` — PostgreSQL connection string with credentials.
  - `SECRET_KEY` — JWT signing secret.
  - `REDIS_URL` — Redis connection string.
  - `RESEND_API_KEY` — Email API key.
  - `SENTRY_DSN` — Error tracking DSN.
  - `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — Cloudflare R2 credentials.
- Frontend secrets (in `.env.local` or Vercel env vars):
  - `AUTH_SECRET` — NextAuth encryption secret.
  - `AUTH_URL` — Deployment URL.
- `.env` files are in `.gitignore` and never committed.
- Production secrets use Vercel's encrypted environment variables and Railway's secret store.

---

## Session Management

- **Stateless JWT**: No server-side session store.
- Session is managed by NextAuth via encrypted JWT cookies.
- Cookie is HTTP-only, same-site protection is applied by NextAuth defaults.
- Session expiry is tied to JWT access token expiry (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).
- User receives `refresh_token` for obtaining new access tokens.

---

## Additional Security Measures

| Measure | Status | Details |
|---------|--------|---------|
| HTTPS | Enabled | Enforced by Railway and Vercel at edge |
| Sentry PII | Disabled | `send_default_pii=False` |
| Input sanitization | Not implemented | No XSS-specific sanitization on user-generated content |
| CSRF protection | Not needed | NextAuth + JWT Bearer tokens are CSRF-safe by design |
| Security headers | Not configured | No custom Content-Security-Policy or HSTS headers beyond platform defaults |
| Dependency scanning | Manual | No automated CVE scanning in CI/CD |

---

## Security Checklist for Production

- [ ] Generate unique `SECRET_KEY` with `openssl rand -base64 32`.
- [ ] Generate unique `AUTH_SECRET` with `openssl rand -base64 32`.
- [ ] Set `CORS_ORIGINS` to only the frontend domain.
- [ ] Verify `SENTRY_DSN` has `send_default_pii=False`.
- [ ] Set `ACCESS_TOKEN_EXPIRE_MINUTES` to 15 or lower for production.
- [ ] Set `REFRESH_TOKEN_EXPIRE_DAYS` to 7 or lower.
- [ ] Enable HTTPS on all endpoints (enforced by Railway/Vercel).
- [ ] Verify rate limiting is active (test 101 rapid requests → 429).
- [ ] Review audit logs for unexpected access patterns.
- [ ] Keep dependencies updated (`npm audit`, `pip audit`).
