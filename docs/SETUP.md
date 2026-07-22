---
title: KhataBox Setup Guide
description: Step-by-step setup instructions for running KhataBox locally and in production.
---

# Setup Guide

## Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | Frontend (Next.js) |
| npm | 10+ | Package manager |
| Python | 3.11+ | Backend (FastAPI) |
| Docker Desktop | Latest | PostgreSQL + Redis containers |
| Git | Latest | Version control |

---

## Step-by-Step Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd KhataBox
```

### 2. Frontend Setup

```bash
# Install Node.js dependencies from project root
npm install
```

This installs Next.js, React 19, Tailwind CSS v4, Shadcn UI, Zustand, TanStack Query, NextAuth v5, Recharts, and other frontend dependencies.

> **Important:** The frontend dev server must be started with the `--webpack` flag (not Turbopack) because the project path contains spaces:
> ```bash
> cd frontend
> npm run dev -- --webpack
> ```
> This is already configured in the `package.json` `dev` script.

### 3. Backend Setup

```bash
cd backend

# Create and activate Python virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

Key packages: FastAPI, SQLAlchemy async, Alembic, Pydantic v2, python-jose, passlib, asyncpg, redis, scikit-learn, pandas, ReportLab, Pillow, qrcode, openpyxl, sentry-sdk, posthog.

### 4. Start Database Services

From the project root:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port 5432 (database: `khatabox`, user: `khatabox`, password: `khatabox123`)
- **Redis 7** on port 6379

> **Note â€” Neon DB vs Local Docker:** For local development, the Docker Compose PostgreSQL is recommended. If you prefer using Neon (cloud PostgreSQL), set your `DATABASE_URL` to the Neon pooled connection string with `?sslmode=require`. The backend automatically handles SSL via asyncpg's built-in TLS â€” `sslmode` and `channel_binding` parameters are stripped from the connection URL before being passed to asyncpg.

### 5. Configure Environment Variables

#### Backend (`backend/.env`)

Copy the example file and update as needed:

```bash
cp config/.env.example.backend backend/.env
```

Minimal dev configuration:

```ini
DATABASE_URL=postgresql+asyncpg://khatabox:khatabox123@localhost:5432/khatabox
SECRET_KEY=dev-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000
```

#### Frontend (`.env.local`)

The frontend has sensible defaults for local development. Create `.env.local` only if you need to override:

```ini
NEXT_PUBLIC_API_URL=http://localhost:8002
AUTH_SECRET=local-dev-secret-at-least-32-chars-long
AUTH_URL=http://localhost:3000
```

If `NEXT_PUBLIC_API_URL` is not set, the frontend defaults to `http://localhost:8002`.

### 6. Run Database Migrations

```bash
cd backend
alembic upgrade head
```

This applies all 17 migrations:
- 0001: Initial schema (11 tables, 5 enums)
- 0002: Full-text search (TSVECTOR + GIN)
- 0003: Expiry/batch tracking
- 0004: Multi-store support
- 0005: Product image URL
- 0006: Performance indexes
- 0007: Stock transfers
- 0008: Transfer enum values
- 0009: Product UUID
- 0010: Inventory reservation
- 0011: Receipt system
- 0012: Store business fields
- 0013: Optional fields (nullable columns)
- 0014: B2C support (order status counter enum)
- 0015: Payments table
- 0016: B2C orders system
- 0017: Seed products table

### 7. Seed Demo Data

```bash
cd backend
python seed_india.py
```

This creates:

- 1 admin user: `admin@khatabox.com` / `Admin@123`
- 5 shopkeepers, each with a store across Indian cities (Mumbai, Delhi, Bangalore, Hyderabad, Ahmedabad, Chennai, Pune)
- Shopkeeper credentials: `{store}@khatabox.com` / `Shop@123`
- 10+ customers with realistic Indian company names
- Customer credentials: `contact.{name}@client.com` / `customer123`
- 100+ products across categories (electronics, groceries, clothing, medicines, stationery)
- 20+ suppliers
- 200+ orders with order items
- Purchase orders with line items
- Inventory movements (stock history)
- Stock transfer requests
- Notifications (low stock, expiry alerts)
- Audit log entries

Additionally, 178 seed products across 6 store types can be loaded via:

```bash
cd backend
python seed_seed_products.py
```

The seed script is idempotent: re-running it clears existing non-admin data before inserting.

### 8. Start the Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

The backend is now available at:
- API: http://localhost:8002
- Swagger docs: http://localhost:8002/docs
- Health check: http://localhost:8002/health

### 9. Start the Frontend

In a separate terminal, from the `frontend/` directory:

```bash
cd frontend
npm run dev
```

The frontend is now available at http://localhost:3000.

### 10. Using the Launcher Script (Windows)

Alternatively, use the included batch script from the project root:

```batch
scripts\start-khatabox.bat
```

This script:
1. Starts Docker containers (PostgreSQL + Redis)
2. Runs Alembic migrations
3. Seeds demo data (includes `seed_products` table)
4. Starts backend on port 8002
5. Starts frontend on port 3000

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | â€” | PostgreSQL async connection string (asyncpg) |
| `SECRET_KEY` | Yes | change-me | JWT signing secret (minimum 32 characters) |
| `ALGORITHM` | No | HS256 | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 30 | Access token lifetime in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | 7 | Refresh token lifetime in days |
| `REDIS_URL` | No | â€” | Redis connection string (optional, caching degrades gracefully) |
| `RESEND_API_KEY` | No | â€” | Resend API key for transactional emails (optional) |
| `SENTRY_DSN` | No | â€” | Sentry DSN for error tracking (optional) |
| `POSTHOG_API_KEY` | No | â€” | PostHog project API key (optional) |
| `POSTHOG_HOST` | No | https://us.i.posthog.com | PostHog API host |
| `CORS_ORIGINS` | Yes | http://localhost:3000 | Comma-separated allowed CORS origins |
| `R2_ENDPOINT_URL` | No | â€” | Cloudflare R2 S3-compatible endpoint (optional) |
| `R2_ACCESS_KEY_ID` | No | â€” | R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | No | â€” | R2 secret access key |
| `R2_BUCKET_NAME` | No | khatabox | R2 bucket name |
| `R2_PUBLIC_URL` | No | â€” | R2 public bucket URL for image access |

### Frontend (`.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | http://localhost:8002 | Backend API base URL |
| `AUTH_SECRET` | Yes | â€” | NextAuth JWT encryption secret |
| `AUTH_URL` | Yes | â€” | Frontend public URL (for NextAuth callbacks) |

---

## Running Tests

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

Runs 39+ async integration tests across 20+ endpoint groups. The test suite starts a subprocess Uvicorn server on port 18999.

**Current test results:** 29 pass, 11 fail, 4 error (pre-existing; mainly data ownership checks and missing endpoints).

### Frontend Tests

```bash
npm test
```

Runs 5 Vitest unit tests for utility functions, components, API client, and Zustand store.

---

## Stopping the Project

```bash
# Stop frontend (Ctrl+C in terminal running npm run dev in frontend/)
# Stop backend (Ctrl+C in terminal running uvicorn)

# Stop Docker containers
docker compose down
```

---

## Production Deployment

### Backend (Railway)

1. Push the `backend/` directory as a separate service or set root directory to `backend/`
2. Railway auto-detects the `Dockerfile`
3. Set health check path to `/health`
4. Add all environment variables from `backend/.env.example`
5. Set `CORS_ORIGINS` to include the Vercel frontend URL
6. Run `alembic upgrade head` as a post-deploy command
7. Run `python seed_india.py` for initial data (production: use a proper seed)

### Frontend (Vercel)

1. Connect the GitHub repository to Vercel
2. Framework preset: Next.js (auto-detected)
3. Root directory: `.` (project root)
4. Build command: `next build` (default)
5. Environment variables:
   - `NEXT_PUBLIC_API_URL` = Railway deployment URL
   - `AUTH_SECRET` = Random 32+ character string
   - `AUTH_URL` = Vercel deployment URL
