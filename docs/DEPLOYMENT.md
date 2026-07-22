# KhataBox â€” Deployment Guide

Deployment guide for the KhataBox B2B retail management platform: Next.js frontend (Vercel), FastAPI backend (Railway), PostgreSQL (Neon), and Redis (Upstash).

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Local Development Setup](#local-development-setup)
- [Docker Compose (PG + Redis)](#docker-compose-pg--redis)
- [Backend Deployment (Railway)](#backend-deployment-railway)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Vercel + Neon Deployment](#vercel--neon-deployment)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Backup & Restore](#backup--restore)
- [Rollback Strategy](#rollback-strategy)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Resource | Account Required | Purpose |
|----------|-----------------|---------|
| Docker Desktop | No | Local PG + Redis |
| Railway account | Yes (GitHub OAuth) | Backend hosting |
| Vercel account | Yes (GitHub OAuth) | Frontend hosting |
| Neon account | Yes | PostgreSQL database |
| Upstash account | Yes (optional) | Redis cache/queue |
| Cloudflare account | Yes (optional) | File storage (R2) |
| Resend account | Yes (optional) | Email notifications |
| Sentry account | Yes (optional) | Error tracking |
| PostHog account | Yes (optional) | Product analytics |

---

## Architecture Overview

```
Browser â†’ Vercel (Next.js) â†’ Railway (FastAPI) â†’ Neon (PostgreSQL)
                                â†•
                            Upstash (Redis)
                                â†•
                        Cloudflare R2 (files)
```

- Frontend and backend are deployed as separate services.
- All external services (Sentry, PostHog, Resend, R2, Redis) are optional â€” features degrade gracefully if not configured.
- Docker Compose is used for local development only (PostgreSQL + Redis). Backend and frontend run natively.

---

## Local Development Setup

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd KhataBox
npm install
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r backend/requirements.txt

# 2. Start infrastructure (PG + Redis)
docker compose up -d

# 3. Configure backend environment
copy backend\.env.example backend\.env

# 4. Run migrations
cd backend
alembic upgrade head

# 5. Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

# 6. Configure frontend environment
cd frontend
copy .env.example .env.local

# 7. Start frontend (new terminal)
npm run dev -- --webpack

# 8. Seed demo data (keep backend running)
cd backend
python seed_india.py
```

The app is now available at http://localhost:3000.

---

## Docker Compose (PG + Redis)

The `docker-compose.yml` at the project root starts two services:

- **PostgreSQL 16** on port `5432` (database: `khatabox`, user: `khatabox`, password: `khatabox123`)
- **Redis 7** on port `6379`

```bash
# Start
docker compose up -d

# Verify
docker compose ps
docker compose logs postgres --tail=5
docker compose logs redis --tail=5

# Stop and destroy data
docker compose down -v
```

Note: Docker Compose does **not** include the backend or frontend â€” those run natively or on Railway/Vercel.

---

## Backend Deployment (Railway)

Railway auto-detects the Dockerfile at `backend/Dockerfile` and uses the `railway.json` config.

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ALWAYS"
  }
}
```

Note: The health check path in `railway.json` now correctly points to `/health` (the actual endpoint in `app/main.py`). Ensure Railway health checks point to `/health`.

### Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### Deployment Steps

1. Create a new Railway project from your GitHub repo with root directory `backend/`.
2. Railway auto-detects the Dockerfile.
3. Set **Health Check Path** to `/health`.
4. Enable **Public Networking** and note the domain (e.g., `khatabox-api.up.railway.app`).
5. Add all required environment variables (see below).
6. Trigger a deploy.

### Post-Deploy

```bash
# Run migrations
alembic upgrade head

# Verify
curl https://khatabox-api.up.railway.app/health
# {"status": "ok", "service": "KhataBox API"}
```

---

## Frontend Deployment (Vercel)

Vercel auto-detects Next.js. No `vercel.json` is required at the project root â€” the framework preset is auto-detected.

### Deployment Steps

1. Import your GitHub repo in Vercel (root directory: `.`).
2. Framework preset is auto-detected as Next.js.
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = your Railway backend URL
   - `AUTH_SECRET` = a random 32+ char base64 string
   - `AUTH_URL` = your Vercel deployment URL
4. Deploy.

### Post-Deploy

- Visit all frontend routes to verify 200 responses.
- Login with `admin@khatabox.com` / `Admin@123` to verify auth flow.
- The `NEXT_PUBLIC_API_URL` env var is the only connection between frontend and backend.

---

## Vercel + Neon Deployment

### Option A: Separate Services (Recommended)

Deploy the backend on Railway and the frontend on Vercel, with Neon as the database:

1. **Neon:** Create a project, copy the pooled connection string, set as `DATABASE_URL`.
2. **Railway:** Deploy `backend/` with the Dockerfile, set all env vars, run migrations after deploy.
3. **Vercel:** Import repo, set `NEXT_PUBLIC_API_URL` to the Railway domain, `AUTH_SECRET`, and `AUTH_URL`.

### Option B: All-in-One (Vercel + Neon Only)

For a simplified stack without Railway:

1. **Neon:** Create a project, copy the connection string.
2. **Backend:** Deploy as a Vercel Function or keep on Railway.
3. **Frontend:** Deploy on Vercel as normal.

The recommended approach is Option A (Railway for backend, Vercel for frontend, Neon for database) as it allows the backend to run as a long-lived server with WebSocket support and background tasks.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | â€” | PostgreSQL connection string with `+asyncpg` and `?sslmode=require` |
| `SECRET_KEY` | Yes | â€” | JWT signing secret (generate with `openssl rand -base64 32`) |
| `ALGORITHM` | No | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | JWT access token expiry |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | JWT refresh token expiry |
| `REDIS_URL` | No | â€” | Redis connection string (optional, graceful degradation) |
| `CORS_ORIGINS` | Yes | `http://localhost:3000` | Comma-separated allowed origins |
| `RESEND_API_KEY` | No | â€” | Resend API key for email (optional) |
| `SENTRY_DSN` | No | â€” | Sentry DSN for error tracking (optional) |
| `POSTHOG_API_KEY` | No | â€” | PostHog API key for analytics (optional) |
| `POSTHOG_HOST` | No | `https://us.i.posthog.com` | PostHog host URL |
| `R2_ENDPOINT_URL` | No | â€” | Cloudflare R2 endpoint (optional) |
| `R2_ACCESS_KEY_ID` | No | â€” | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | â€” | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | No | `khatabox` | Cloudflare R2 bucket name |
| `R2_PUBLIC_URL` | No | â€” | Cloudflare R2 public URL |

### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (e.g., `https://khatabox-api.up.railway.app`) |
| `AUTH_SECRET` | Yes | NextAuth encryption secret |
| `AUTH_URL` | Yes | Frontend deployment URL |

---

## Database Migrations

Migrations use Alembic with async SQLAlchemy. All migrations are in `backend/alembic/versions/`.

```bash
# Run pending migrations
cd backend
alembic upgrade head

# Create a new migration (auto-detect changes)
alembic revision --autogenerate -m "description"

# Rollback one step
alembic downgrade -1

# View migration history
alembic history
```

Current migrations (17 applied, up to 0017):

| File | Description |
|------|-------------|
| `0001_initial_schema.py` | 11 tables + 5 enums |
| `0002_fulltext_search.py` | `search_vector` TSVECTOR + GIN index |
| `0003_expiry_batch_tracking.py` | `batch_number`, `mfg_date`, `expiry_date` |
| `0004_multi_store.py` | `stores` table + `product.store_id` FK |
| `0005_product_image_url.py` | `product.image_url` column |
| `0006_performance_indexes.py` | 5 composite indexes |
| `0007_stock_transfers.py` | `stock_transfers` table + inventory_movements.store_id |
| `0008_add_transfer_enum_values.py` | `transfer_in`/`transfer_out` to MovementType enum |
| `0009_product_uuid.py` | UUID column for products |
| `0010_inventory_reservation.py` | Inventory reservation support |
| `0011_receipt_system.py` | Receipts and receipt_items tables |
| `0012_store_business_fields.py` | Store business fields (GST, etc.) |
| `0013_optional_fields.py` | Make various columns nullable |
| `0014_b2c_support.py` | B2C order support (order status counter) |
| `0015_payments_table.py` | Payments table |
| `0016_b2c_orders_system.py` | B2C orders and customer carts |
| `0017_seed_products_table.py` | Seed products lookup table |

---

## Health Checks

The backend exposes a health endpoint at `/health`:

```json
GET /health
{"status": "ok", "service": "KhataBox API"}
```

Railway should be configured to use `/health` as the health check path. The `railway.json` now correctly references `/health`. The middleware chain includes:
- CORS middleware
- Rate limiter middleware (100 req/min, Redis + in-memory fallback)
- Performance middleware (adds `X-Response-Time` header)

---

## Monitoring

### Sentry (Error Tracking)

Configured in `backend/app/main.py`. Initialized early in the startup sequence to catch all errors.

- DSN is optional â€” Sentry is only initialized if `SENTRY_DSN` is set.
- `traces_sample_rate=0.2` â€” samples 20% of transactions.
- `send_default_pii=False` â€” personal identifiable information is not sent.
- Environment tag auto-detected: `"production"` if DSN is set, `"development"` otherwise.

### PostHog (Product Analytics)

Configured in `backend/app/main.py`. API key is optional.

```python
posthog.project_api_key = settings.POSTHOG_API_KEY
posthog.host = settings.POSTHOG_HOST
```

PostHog captures anonymous API usage events. Disabled if `POSTHOG_API_KEY` is empty.

### Performance Monitoring

Every API response includes an `X-Response-Time` header (milliseconds). Dashboard stats are cached via Redis with pattern-based cache invalidation.

---

## Backup & Restore

### Export (JSON)

```http
GET /api/v1/data/backup/export
```

Returns a JSON object containing all 14 tables as key-value pairs. Each row is serialized with ISO-formatted datetimes.

### Export to R2

```http
POST /api/v1/data/backup/export-r2
```

Exports the same JSON backup to Cloudflare R2 at `backups/khatabox_backup_{timestamp}.json`. Requires R2 env vars to be configured.

### Import

```http
POST /api/v1/data/backup/import
Content-Type: application/json

{ "version": "1.0", "created_at": "...", "data": { ... } }
```

Restores data from a JSON backup. Existing `id` values are stripped so new rows are inserted with auto-generated IDs.

### Scheduled Backups

No built-in scheduler. Use an external cron job or GitHub Action to hit the export endpoint daily. If R2 is configured, the backup is automatically stored in the cloud bucket.

---

## Rollback Strategy

### Backend (Railway)

1. Navigate to Railway dashboard -> Deployments.
2. Select the previous working deployment.
3. Click **Rollback to this deployment**.
4. If a database migration caused the issue, restore the DB from the last backup before rolling back the code.

### Frontend (Vercel)

1. Navigate to Vercel dashboard -> Deployments.
2. Find the last known good deployment.
3. Click the three dots -> **Rollback to Production**.

### Database

1. Before any risky change, manually export: `GET /api/v1/data/backup/export`.
2. If R2 is configured, run `POST /api/v1/data/backup/export-r2` for cloud-stored backup.
3. To restore: `POST /api/v1/data/backup/import` with the backup JSON body.
4. For Alembic migration rollback: `alembic downgrade -1` to revert the last migration.

### Pre-Deployment Checklist

- Run `alembic upgrade head` locally to verify migrations.
- Run `python -m pytest tests/ -v` to confirm tests pass.
- Run `cd frontend && npm run build` to verify frontend builds cleanly.
- Generate fresh `AUTH_SECRET` and `SECRET_KEY` for production.
- Backup the database before applying destructive migrations.

---

## Troubleshooting

### Backend won't start

- Verify PostgreSQL is running: `docker compose ps`.
- Run migrations: `alembic upgrade head`.
- Check `DATABASE_URL` is correct (must include `+asyncpg` and `?sslmode=require` for Neon).

### Frontend can't reach backend

- Verify `NEXT_PUBLIC_API_URL` is correct in Vercel env vars.
- Check CORS: `CORS_ORIGINS` must include the Vercel frontend domain.
- Verify Railway public networking is enabled.

### Tests fail on Windows

- `Event loop is closed` errors are a known Python issue on Windows. Run tests on Linux/macOS or use WSL2 for reliable results.

### Health check fails on Railway

- Ensure the Railway health check path is set to `/health`. The `railway.json` now correctly references `/health`.
