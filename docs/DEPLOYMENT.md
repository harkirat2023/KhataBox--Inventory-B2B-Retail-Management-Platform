# KhataBox — Deployment & Local Run Guide

A full-stack inventory & billing system with a **Next.js (App Router)** frontend and **FastAPI** backend, backed by **PostgreSQL** and **Redis**.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
  - [1. Clone & Install](#1-clone--install)
  - [2. Start Infrastructure (Docker)](#2-start-infrastructure-docker)
  - [3. Backend Setup](#3-backend-setup)
  - [4. Frontend Setup](#4-frontend-setup)
  - [5. Seed Demo Data](#5-seed-demo-data)
  - [6. Verify Everything Works](#6-verify-everything-works)
- [Project Architecture](#project-architecture)
- [Available Accounts](#available-accounts)
- [Production Deployment](#production-deployment)
  - [Backend (Railway / Fly.io)](#backend-railway--flyio)
  - [Frontend (Vercel)](#frontend-vercel)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Run PostgreSQL + Redis locally |
| [Python](https://www.python.org/downloads/) | 3.11+ | Backend runtime |
| [Node.js](https://nodejs.org/) | 20+ | Frontend runtime |
| [Git](https://git-scm.com/) | Any | Version control |

Verify installations:

```bash
docker --version
python --version
node --version
npm --version
```

---

## Local Development Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd KhataBox

# Frontend dependencies
npm install

# Backend dependencies (recommended: use a virtual environment)
python -m venv .venv
.venv\Scripts\activate    # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r backend/requirements.txt
```

### 2. Start Infrastructure (Docker)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432` (database: `khatabox`, user: `khatabox`, password: `khatabox123`)
- **Redis 7** on `localhost:6379`

Verify both are running:

```bash
docker compose ps
docker compose logs postgres --tail=5
docker compose logs redis --tail=5
```

### 3. Backend Setup

**Configure environment:**

```bash
# Backend .env (copy example and edit if needed)
copy backend\.env.example backend\.env
# The defaults work for local Docker — no changes required
```

The `backend\.env` should look like this for local dev:

```env
DATABASE_URL=postgresql+asyncpg://khatabox:khatabox123@localhost:5432/khatabox
SECRET_KEY=khatabox-dev-secret-change-in-prod
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:3000
```

**Run database migrations:**

```bash
cd backend
alembic upgrade head
```

**Start the backend server:**

```bash
# From the backend/ directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

The API will be available at **http://localhost:8002**.

- API docs (Swagger UI): http://localhost:8002/docs
- API docs (ReDoc): http://localhost:8002/redoc
- Health check: http://localhost:8002/health

### 4. Frontend Setup

**Configure environment:**

```bash
# Frontend .env.local (copy example)
copy .env.example .env.local
```

The `.env.local` should look like:

```env
NEXT_PUBLIC_API_URL=http://localhost:8002
AUTH_SECRET=khatabox-dev-secret-change-in-prod
AUTH_URL=http://localhost:3000
```

> **Note:** `AUTH_SECRET` is used by NextAuth to encrypt JWT tokens. Generate a production one with `openssl rand -base64 32`.

**Start the frontend dev server:**

```bash
# From the project root
npm run dev
```

The frontend will be available at **http://localhost:3000**.

### 5. Seed Demo Data

Open a **second terminal** (keep backend running) and run:

```bash
cd backend
python seed_india.py
```

This creates:
- **Admin** account (`admin@khatabox.com`)
- **Shopkeeper** accounts for each store
- **Customer** accounts with order history
- Products, inventory movements, and purchase orders
- ~10,000+ records for realistic testing

### 6. Verify Everything Works

Run the API test suite:

```bash
cd backend
python -m pytest tests/ -v --tb=short
```

Expected: **35 tests pass** (covering auth, products, orders, inventory, dashboard, etc.).

---

## Project Architecture

```
KhataBox/
├── backend/                    # FastAPI Python backend
│   └── app/
│       ├── api/v1/             # Route handlers (thin wrappers)
│       ├── core/               # DB engine, auth, security, dependencies
│       ├── models/             # SQLAlchemy ORM models
│       ├── schemas/            # Pydantic request/response schemas
│       ├── services/           # Business logic layer
│       ├── ml/                 # Forecasting ML module
│       └── tests/              # pytest test suite
├── src/                        # Next.js frontend
│   ├── app/                    # App Router pages
│   │   ├── (dashboard)/        # Protected dashboard routes (layout guards auth)
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── customer/           # Customer portal
│   │   └── catalog/            # Product catalog
│   ├── components/             # Shared React components
│   │   ├── ui/                 # Shadcn UI primitives
│   │   ├── auth/               # RoleGuard, useRole
│   │   └── layout/             # Sidebar, TopNav, BottomNav
│   ├── lib/                    # Utilities (clientApi, auth, store-context)
│   ├── store/                  # Zustand stores (cart, customer-cart)
│   └── types/                  # TypeScript interfaces
├── docker-compose.yml          # PostgreSQL + Redis
├── docs/                       # Documentation
└── logs/                       # Runtime logs (gitignored)
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Layer | Service pattern | Route handlers are thin; business logic lives in `services/` |
| Auth | NextAuth v5 + JWT | Server-side session validation, client-side hooks |
| Styling | Tailwind CSS v4 + Shadcn | Utility-first, CSS-first configuration |
| State | Zustand | Lightweight, no boilerplate |
| Data Fetching | React Query | Automatic caching, background refetch, query key factory |
| DB | PostgreSQL + SQLAlchemy async | Production-ready, async for high concurrency |
| Caching | Redis (via `cache.py`) | Graceful degradation if unavailable |

---

## Available Accounts

After seeding, these accounts are available:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | `admin@khatabox.com` | `Admin@123` | Full access, user management |
| **Shopkeeper** | `{store}@khatabox.com` | `Shop@123` | e.g., `patel@khatabox.com` |
| **Customer** | `contact.{name}@client.com` | `customer123` | Tied to shopkeeper accounts |

---

## Production Deployment

A production deployment requires **5 cloud services**. Below is exactly where to sign up and how to configure each.

---

### 1. Database — Neon (PostgreSQL)

[Neon](https://neon.tech) offers a free-tier PostgreSQL with automatic scaling and branching.

| Step | Action | Link |
|------|--------|------|
| 1 | Sign up with GitHub or Google | https://console.neon.tech/signup |
| 2 | Create a project (choose any region) | https://console.neon.tech/projects |
| 3 | Click **"Connect"** → copy the **connection string** | Looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/khatabox?sslmode=require` |
| 4 | Append `+asyncpg` after `postgresql` and set DB name to `khatabox` | Final: `postgresql+asyncpg://user:pass@ep-xxx.us-east-2.aws.neon.tech/khatabox?sslmode=require` |

> **Note:** The `+asyncpg` driver suffix and `?sslmode=require` are critical — the app won't connect without them.

---

### 2. Cache — Upstash (Redis)

[Upstash](https://upstash.com) provides serverless Redis with a generous free tier.

| Step | Action | Link |
|------|--------|------|
| 1 | Sign up with GitHub or Google | https://console.upstash.com/login |
| 2 | Click **"Create Database"** | https://console.upstash.com/redis |
| 3 | Choose **Global** or a region, name it `khatabox-redis` | — |
| 4 | After creation, copy the **REST URL** or **Connection String** | Looks like: `rediss://default:password@us1-kind-redis-12345.upstash.io:6379` |

---

### 3. Backend Hosting — Railway

[Railway](https://railway.app) is a PaaS optimized for full-stack apps. The free tier includes $5/month credit.

| Step | Action | Link |
|------|--------|------|
| 1 | Sign up with GitHub | https://railway.app/login |
| 2 | Click **"New Project"** → **"Deploy from GitHub repo"** | https://railway.app/new |
| 3 | Select your `KhataBox` repo, set root directory to `backend/` | — |
| 4 | Railway auto-detects Python. Add a **Start Command**: | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| 5 | Go to **Variables** tab and add every env var below | https://railway.app/project/{id}/variables |

**Alternative: Fly.io**

[Fly.io](https://fly.io) offers a generous free tier with global edge deployment.

```bash
# Install flyctl
flyctl launch
# Follow the interactive prompts, set region, deploy
flyctl secrets set DATABASE_URL="..." SECRET_KEY="..." REDIS_URL="..." CORS_ORIGINS="..."
flyctl deploy
```

---

### 4. Frontend Hosting — Vercel

[Vercel](https://vercel.com) is the recommended platform for Next.js (created by the Next.js team).

| Step | Action | Link |
|------|--------|------|
| 1 | Sign up with GitHub | https://vercel.com/login |
| 2 | Click **"Add New"** → **"Project"** | https://vercel.com/new |
| 3 | Import your `KhataBox` repo | — |
| 4 | Vercel auto-detects Next.js. Keep all defaults. | — |
| 5 | Open **Environment Variables** section and add the frontend vars | — |
| 6 | Click **"Deploy"** | — |

---

### 5. Environment Variables Reference

#### Backend (set on Railway / Fly.io)

```env
# ── REQUIRED ──────────────────────────────────────────────
# From Neon (step 1 above)
DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxx.us-east-2.aws.neon.tech/khatabox?sslmode=require

# Generate with: openssl rand -base64 32
SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# From Upstash (step 2 above)
REDIS_URL=rediss://default:password@us1-kind-redis-12345.upstash.io:6379

# Your production domain + localhost for dev
CORS_ORIGINS=https://khatabox.vercel.app,http://localhost:3000

# ── OPTIONAL (skip these — features degrade gracefully) ──

# Email notifications — sign up at https://resend.com → go to API Keys → copy key
RESEND_API_KEY=re_xxxxxxxxxxxx

# Error tracking — sign up at https://sentry.io → create project → get DSN
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o123456.ingest.sentry.io/654321

# Product analytics — sign up at https://us.posthog.com/signup → project → copy API key
POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com

# File storage — sign up at https://dash.cloudflare.com/sign-up → R2 → create bucket
# Under R2 → Buckets → Create → name it "khatabox"
# Then go to R2 → API Tokens → Create token with "Edit" permission
R2_ENDPOINT_URL=https://xxxxxxxxxxxxxxxxxxxxxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=khatabox
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
```

#### Frontend (set on Vercel)

```env
# Your Railway backend URL (or Fly.io)
NEXT_PUBLIC_API_URL=https://khatabox-api.up.railway.app

# Generate with: openssl rand -base64 32 (can be different from backend)
AUTH_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# Your Vercel deployment URL
AUTH_URL=https://khatabox.vercel.app
```

---

### 6. Final Deployment Steps

**After setting all variables:**

```bash
# On Railway — trigger a manual deploy from the dashboard
# Or push to your main branch (auto-deploy if connected)

# SSH into the backend or use Railway's web terminal, then:
alembic upgrade head

# Optional: seed demo data
python seed_india.py

# Verify the health endpoint returns 200
curl https://khatabox-api.up.railway.app/health
# {"status": "ok", "service": "KhataBox API"}
```

**Verify the frontend can reach the backend:**
- Open the Vercel deployment URL
- Login with `admin@khatabox.com` / `Admin@123`
- Dashboard stats should load (or show zeros if no seed data)

---

## Troubleshooting

### Backend won't start

```
# Check if PostgreSQL is running
docker compose ps

# Check if the DB exists
docker compose exec postgres psql -U khatabox -d khatabox -c "\l"

# Run migrations
cd backend && alembic upgrade head

# Check backend logs
cat logs/backend.log
```

### Frontend can't reach backend

```
# Verify backend is running
curl http://localhost:8002/health
# Expected: {"status": "ok", "service": "KhataBox API"}

# Check CORS in backend .env
CORS_ORIGINS should include http://localhost:3000
```

### Tests are failing

```
# All "Event loop is closed" errors → known Windows Python 3.14 issue
# Run on Linux/macOS or use WSL2 for reliable test execution

# Run specific test class
python -m pytest tests/test_api.py::TestAuth -v
```

### Reset everything

```bash
# Stop and destroy all containers (data loss!)
docker compose down -v

# Start fresh
docker compose up -d
cd backend && alembic upgrade head && python seed_india.py
```

---

## Quick Start (TL;DR)

```bash
# 1. Install dependencies
npm install
pip install -r backend/requirements.txt

# 2. Start DB + Redis
docker compose up -d

# 3. Run backend
cd backend
alembic upgrade head
uvicorn app.main:app --reload --port 8002 &
cd ..

# 4. Seed data
cd backend && python seed_india.py && cd ..

# 5. Start frontend
npm run dev

# 6. Open http://localhost:3000 → login with admin@khatabox.com / Admin@123
```
