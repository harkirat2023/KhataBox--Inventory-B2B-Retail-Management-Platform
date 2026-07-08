# KhataBox — Production Setup Guide

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables Overview](#2-environment-variables-overview)
3. [Local Development Setup](#3-local-development-setup)
4. [Production Deployment](#4-production-deployment)
5. [Post-Deployment](#5-post-deployment)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | ≥3.11 | Backend runtime |
| Node.js | ≥18 | Frontend runtime |
| PostgreSQL | 15+ | Primary database (local dev) or Neon (cloud) |
| Redis | 7+ | Caching & rate limiting |
| Docker | optional | Run PostgreSQL & Redis locally |
| Git | — | Version control |

### Cloud Accounts

| Service | Sign Up | Purpose |
|---------|---------|---------|
| [Neon](https://neon.tech) | Free | Serverless PostgreSQL (production DB) |
| [Redis Cloud](https://redis.com) | Free (30 MB) | Serverless Redis (production cache) |
| [Railway](https://railway.app) | Free tier | Backend deployment |
| [Vercel](https://vercel.com) | Free | Frontend deployment (Hobby plan) |
| [Clerk](https://dashboard.clerk.com) | Free | Customer/Shopkeeper email OTP auth |

---

## 2. Environment Variables Overview

### 2.1 Backend (`backend/.env`)

Create `backend/.env` from the table below.

| Variable | Where to Get It | Example |
|----------|----------------|---------|
| `DATABASE_URL` | **Neon Dashboard** → Connection Details → "Pooled connection" (psql string). Replace `postgresql://` with `postgresql+asyncpg://` and remove `?sslmode=require&channel_binding=require` — asyncpg handles SSL automatically. | `postgresql+asyncpg://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb` |
| `SECRET_KEY` | Generate locally: run `python -c "import secrets; print(secrets.token_urlsafe(48))"` in a terminal. | (random 64-char string) |
| `ALGORITHM` | Fixed value | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long JWT tokens live (default: 30) | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | How long refresh tokens live (default: 7) | `7` |
| `REDIS_URL` | **Redis Cloud** → Database → "Endpoint" + "Default User Password". Format: `redis://default:<password>@<endpoint>:<port>` | `redis://default:pass@redis-123.c345.us-east-1-1.ec2.cloud.redislabs.com:12345` |
| `CORS_ORIGINS` | Comma-separated list of frontend URLs allowed to call the API. | `http://localhost:3000,https://khatabox.vercel.app` |
| `CLERK_PUBLISHABLE_KEY` | **Clerk Dashboard** → API Keys → "Publishable Key" (`pk_test_***` or `pk_live_***`) | `pk_test_***` |
| `CLERK_SECRET_KEY` | **Clerk Dashboard** → API Keys → "Secret Key" (`sk_test_***` or `sk_live_***`) | `sk_test_***` |
| `CLERK_JWKS_URL` | **Clerk Dashboard** → API Keys → "JWKS URL" | `https://<your-app>.clerk.accounts.dev/.well-known/jwks.json` |

### 2.2 Frontend (`frontend/.env`)

Create `frontend/.env` from the table below.

> **Important:** In production, these are set in **Vercel Project Settings → Environment Variables**, NOT in a `.env` file.

| Variable | Where to Get It | Example |
|----------|----------------|---------|
| `NEXT_PUBLIC_API_URL` | Your **Railway backend URL**. Dev: `http://localhost:8002`, Prod: your Railway deployment domain | `https://khatabox-api.up.railway.app` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Clerk Dashboard** → API Keys → "Publishable Key" | `pk_test_***` |
| `CLERK_SECRET_KEY` | **Clerk Dashboard** → API Keys → "Secret Key" | `sk_test_***` |
| `CLERK_WEBHOOK_SECRET` | **Clerk Dashboard** → Webhooks → Create Endpoint → "Signing Secret" | `whsec_***` |

---

## 3. Local Development Setup

### 3.1 Clone & Prepare

```bash
git clone <repo-url> khatabox
cd khatabox
```

### 3.2 Start Local Services (PostgreSQL + Redis)

**Option A: Docker (recommended)**

```bash
docker run -d --name khatabox-db -e POSTGRES_USER=khatabox -e POSTGRES_PASSWORD=khatabox123 -e POSTGRES_DB=khatabox -p 5432:5432 postgres:15
docker run -d --name khatabox-redis -p 6379:6379 redis:7-alpine
```

**Option B: Native install**

Install PostgreSQL and Redis on your system. Default ports (5432, 6379) are expected.

### 3.3 Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
# .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and edit environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local PostgreSQL
# DATABASE_URL=postgresql+asyncpg://khatabox:khatabox123@localhost:5432/khatabox

# Run database migrations
alembic upgrade head

# Seed the database with demo data
python scripts/seed_india.py

# Start the backend server
uvicorn app.main:app --reload --port 8002
```

Backend runs at `http://localhost:8002`. API docs at `http://localhost:8002/docs`.

### 3.4 Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and edit environment
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8002
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
#   CLERK_SECRET_KEY=sk_test_***

# Start development server (use --webpack to avoid path-encoding bug with spaces)
npm run dev -- --webpack
```

Frontend runs at `http://localhost:3000`.

### 3.5 Clerk Webhook (Local Testing)

Run a tunnel (e.g., `ngrok`) to expose your local backend:

```bash
ngrok http 8002
```

Then add the ngrok URL as a webhook endpoint in Clerk Dashboard → Webhooks → Add Endpoint:

```
https://<ngrok-id>.ngrok-free.app/api/v1/auth/clerk-webhook
```

Subscribe to: `user.created`, `user.updated`, `user.deleted`.

---

## 4. Production Deployment

### 4.1 Database — Neon (Serverless PostgreSQL)

1. Create a **Neon** account at https://neon.tech
2. Create a new project → copy the **Pooled connection string**
3. Replace `postgresql://` with `postgresql+asyncpg://`
4. Remove query params (`?sslmode=require&channel_binding=require`)
5. Save this as `DATABASE_URL` in Railway

### 4.2 Cache — Redis Cloud

1. Create a **Redis Cloud** account at https://redis.com
2. Create a **Free 30 MB** database
3. Copy the **Public endpoint** and **Default user password**
4. Format: `redis://default:<password>@<endpoint>:<port>`
5. Save this as `REDIS_URL` in Railway

### 4.3 Clerk — Application

1. Go to https://dashboard.clerk.com
2. Click **"Add Application"**
3. Name: `KhataBox`
4. Choose **Email** as sign-in method (disable Google/GitHub if not needed)
5. After creation, go to **API Keys** tab
6. Copy these values for Railway + Vercel:

   | Key | Value |
   |-----|-------|
   | `CLERK_PUBLISHABLE_KEY` | `pk_live_***` (switch to Live mode!) |
   | `CLERK_SECRET_KEY` | `sk_live_***` (switch to Live mode!) |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Same publishable key |
   | `CLERK_JWKS_URL` | `https://<app>.clerk.accounts.dev/.well-known/jwks.json` |

7. **Switch to Live mode** (top-right toggle in Clerk dashboard) before production deployment

### 4.4 Webhook — Clerk → Backend

In Clerk Dashboard → **Webhooks**:

1. Click **"Add Endpoint"**
2. Endpoint URL: `https://<your-railway-domain>/api/v1/auth/clerk-webhook`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Click **Create**
5. Copy the **Signing Secret** (`whsec_***`) → set as `CLERK_WEBHOOK_SECRET` in Railway

### 4.5 Backend — Railway

1. Go to https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Select your repo → set **Root Directory** to `backend`
4. Railway auto-detects `requirements.txt` → Python
5. Add all environment variables from the [Backend table](#21-backend-backendenv):

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Neon pooled URL (with `+asyncpg`, without `?sslmode=...`) |
   | `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `ALGORITHM` | `HS256` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
   | `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |
   | `REDIS_URL` | Your Redis Cloud URL |
   | `CORS_ORIGINS` | `https://khatabox.vercel.app` |
   | `CLERK_PUBLISHABLE_KEY` | From Clerk (Live mode) |
   | `CLERK_SECRET_KEY` | From Clerk (Live mode) |
   | `CLERK_JWKS_URL` | From Clerk |

6. **Build Command** (if not auto-detected):

   ```bash
   pip install -r requirements.txt
   ```

7. **Start Command**:

   ```bash
   alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

8. After deployment, Railway gives you a URL like `https://khatabox-api.up.railway.app`

### 4.6 Run Migrations + Seed on Railway

If the `alembic upgrade head` in the start command fails, run manually:

```bash
# Connect via Railway CLI
railway run

# Inside the Railway shell
alembic upgrade head
python scripts/seed_india.py
```

### 4.7 Frontend — Vercel

1. Go to https://vercel.com
2. **Add New Project** → Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Framework Preset: **Next.js**
5. Add environment variables:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | Your Railway URL (e.g., `https://khatabox-api.up.railway.app`) |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From Clerk (Live mode publishable key) |
   | `CLERK_SECRET_KEY` | From Clerk (Live mode secret key) |
   | `CLERK_WEBHOOK_SECRET` | From Clerk webhook |

6. **Build Command**: `npm run build`
7. **Output Directory**: `.next` (default)
8. Click **Deploy**
9. Vercel gives you a URL like `https://khatabox.vercel.app`

### 4.8 Update Clerk Allowed Origins

In Clerk Dashboard → **Sessions** → **Allowed origins**:

```
http://localhost:3000
https://khatabox.vercel.app
```

### 4.9 Update CORS in Railway

Update `CORS_ORIGINS` in Railway to include both local and production:

```
http://localhost:3000,https://khatabox.vercel.app
```

---

## 5. Post-Deployment

### 5.1 Verify Everything

| Check | URL / Action | Expected Result |
|-------|-------------|-----------------|
| Landing page | `https://khatabox.vercel.app/` | Redirects to `/khatabox` |
| Public landing | `https://khatabox.vercel.app/khatabox` | Shows landing page, no Clerk UI |
| Role selection → Login | Click "Get Started" → pick a role | Goes to `/login?role=shopkeeper` |
| Clerk OTP login | Enter email → click "Send OTP" | OTP sent to email |
| Clerk OTP verify | Enter 6-digit code | Logged in, redirected to dashboard |
| Password login (admin) | Visit `/login?role=admin` | Shows email + password form |
| Backend API | `GET https://khatabox-api.up.railway.app/health` | `{"status": "ok"}` |
| API Docs | `https://khatabox-api.up.railway.app/docs` | Swagger UI loads |

### 5.2 Default Credentials (Dev)

After running `seed_india.py`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@khatabox.com` | `Admin@123` |
| Shopkeeper | `{storename}@khatabox.com` | `Shop@123` |
| Customer | `contact.{id}@client.com` | `customer123` |

### 5.3 Monitoring

- **Vercel Analytics**: Built-in → Project Dashboard → Analytics
- **Railway Monitoring**: Built-in → Deployment → Metrics
- **Sentry** (optional): Set `SENTRY_DSN` in Railway for error tracking
- **Neon Monitoring**: Database dashboard → Query insights

---

## 6. Troubleshooting

### 6.1 "Clerk session already exists" on Login

**Cause**: Clerk `signIn.create()` fails when a previous sign-in attempt is still active.

**Fix**: The login page now handles this — it checks `signIn.status` and calls `prepareFirstFactor()` with the existing `emailAddressId` from `supportedFirstFactors`.

### 6.2 "401 Unauthorized" on API Calls After Login

**Cause**: The frontend `clientApi` calls don't have a Bearer token.

**Fix**: After Clerk OTP login, the `exchangeClerkToken()` function POSTs the Clerk JWT to `/api/v1/auth/clerk-token` and stores the returned backend JWT as a `clerk_jwt` cookie. The `client-api.ts` auto-reads this cookie. Make sure `NEXT_PUBLIC_API_URL` points to the correct backend.

### 6.3 404 on `/khatabox-inventory-...railway.app/api/v1/auth/me`

**Cause**: `NEXT_PUBLIC_API_URL` is not set in Vercel environment variables, OR the URL is missing `https://` prefix (e.g., set to `khatabox-api.up.railway.app` instead of `https://khatabox-api.up.railway.app`).

**Fix**: Go to Vercel → Project → Settings → Environment Variables → add `NEXT_PUBLIC_API_URL` with value `https://khatabox-api.up.railway.app` (include `https://` prefix).

### 6.4 Build Fails on Vercel

**Common causes**:
- Missing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` env var → Add it in Vercel env settings
- TypeScript errors → Fix locally, commit, redeploy
- Node version mismatch → Set in Vercel: Project Settings → Node.js Version → 20.x

### 6.5 Database Migration Fails

**If `alembic upgrade head` fails on revision 0011**:

The `0011_receipt_system` migration has a known issue with `sa.Enum(create_type=False)` still emitting `CREATE TYPE`. Workaround:

```sql
-- Run this directly in your database (Neon SQL Editor or psql)
CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  total_amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  payment_method VARCHAR(20) DEFAULT 'cash',
  payment_status VARCHAR(20) DEFAULT 'paid',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER NOT NULL REFERENCES receipts(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

UPDATE alembic_version SET version_num = '0011_receipt_system' WHERE version_num = '0010_seed_config';
```

### 6.6 Clerk Webhook Not Working

- Ensure webhook endpoint URL in Clerk Dashboard points to your Railway backend
- Verify `CLERK_WEBHOOK_SECRET` is set correctly in Railway
- Check Railway logs: `railway logs`

---

## Quick Reference: Where to Get Each Key

| Key | Where | Step |
|-----|-------|------|
| `DATABASE_URL` (Neon) | Neon Dashboard → Connection Details → Pooled | 4.1 |
| `REDIS_URL` | Redis Cloud → Database → Endpoint + Password | 4.2 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys | 4.3 |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys | 4.3 |
| `CLERK_JWKS_URL` | Clerk Dashboard → API Keys | 4.5 |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → after creating endpoint | 4.4 |
| `SECRET_KEY` | Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` | 4.5 |
| Railway URL | Railway → Deployment → Settings → Domain | 4.5 |
| Vercel URL | Vercel → Project → Domains | 4.7 |
