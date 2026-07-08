# KhataBox — B2B Retail Management Platform

KhataBox is a full-stack B2B retail management platform for Indian small-to-medium businesses. It enables shopkeepers to manage inventory, customers, orders, suppliers, and stores from a single dashboard. Customers can browse a product catalog, scan QR codes, place bulk orders with credit limits, and track their order history.

## Architecture

```mermaid
graph TB
    subgraph Frontend
        NEXT[Next.js 16<br/>Port 3000]
        NEXTAUTH[NextAuth v5<br/>Credentials Provider]
        ZUSTAND[Zustand<br/>Cart + Store]
        RQ[TanStack Query<br/>Caching]
        SHADCN[Shadcn UI<br/>@base-ui/react]
    end

    subgraph Backend
        API[FastAPI<br/>Port 8002]
        JWT[JWT Auth<br/>Access + Refresh]
        SIO[Socket.IO<br/>Real-time]
        ML[ML Pipeline<br/>RandomForest]
        CACHE[Redis Cache]
    end

    subgraph DB
        PG[PostgreSQL 16<br/>18 Tables]
        FTS[Full-Text Search<br/>TSVECTOR]
    end

    subgraph External
        R2[Cloudflare R2<br/>Image Storage]
        RESEND[Resend<br/>Email]
        SENTRY[Sentry<br/>Error Tracking]
        PH[PostHog<br/>Analytics]
    end

    NEXT -->|HTTP / Bearer| API
    NEXT --> NEXTAUTH
    API -->|SQLAlchemy Async| PG
    API --> CACHE
    API --> SIO
    API --> ML
    API --> R2
    API --> RESEND
    API --> SENTRY
    API --> PH
    PG --> FTS
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 16.2.7 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Component Library | Shadcn UI (on @base-ui/react) | 1.5.0 |
| State Management | Zustand | 5.0.14 |
| Server State | TanStack Query | 5.101.0 |
| Auth (Frontend) | NextAuth | v5 (beta.31) |
| Charts | Recharts | 3.8.1 |
| Backend Framework | FastAPI | 0.115.6 |
| ORM | SQLAlchemy (async) | 2.0.50 |
| Validation | Pydantic | 2.13.4 |
| Auth (Backend) | python-jose + passlib (bcrypt) | — |
| Database | PostgreSQL | 16 |
| Cache / Queue | Redis | 7 |
| ML | scikit-learn (RandomForest) | 1.9.0 |
| QR Code | qrcode + Pillow | 8.2 / 12.2 |
| PDF Generation | ReportLab | 4.5.1 |
| Spreadsheet | openpyxl | 3.1.5 |
| Real-time | python-socketio / socket.io-client | 5.11.0 / 4.8.3 |
| File Storage | Cloudflare R2 (S3-compatible) | — |
| Email | Resend | — |
| Error Tracking | Sentry | — |
| Analytics | PostHog | — |
| Deployment (Backend) | Railway (Docker) | — |
| Deployment (Frontend) | Vercel | — |

## Folder Structure

```
KhataBox/
├── src/                # Next.js frontend
│   ├── app/            # App Router pages + layouts
│   │   ├── (dashboard)/  # Admin/shopkeeper routes (20 pages)
│   │   ├── (customer)/   # Customer route group
│   │   ├── api/auth/     # NextAuth route handler
│   │   ├── cart/         # Cart page
│   │   ├── catalog/      # Public catalog page
│   │   ├── customer/     # Customer landing page
│   │   ├── login/        # Login page
│   │   ├── my-orders/    # Customer order history
│   │   ├── receipts/     # Receipt view
│   │   ├── register/     # Registration page
│   │   └── scan/         # QR scanner page
│   ├── components/     # Reusable components
│   │   ├── ui/         # Shadcn primitives (15 files)
│   │   ├── layout/     # Sidebar, top-nav, bottom-nav
│   │   ├── auth/       # RoleGuard + useRole
│   │   ├── customers/  # Customer cart components
│   │   └── products/   # Product form dialogs
│   ├── lib/            # API clients, auth config, utils
│   ├── store/          # Zustand stores (cart, customer-cart)
│   ├── types/          # TypeScript interfaces (7 files)
│   └── test/           # Vitest unit tests (5 files)
├── backend/            # FastAPI backend
│   ├── app/
│   │   ├── api/v1/     # 22 route modules
│   │   ├── core/       # Database, security, dependencies
│   │   ├── ml/         # model.pkl, predict.py, train.py
│   │   ├── models/     # 18 SQLAlchemy model tables
│   │   ├── schemas/    # 11 Pydantic schema files
│   │   ├── services/   # 10 service modules
│   │   ├── config.py   # Pydantic settings
│   │   └── main.py     # FastAPI app entrypoint
│   ├── alembic/        # 17 database migrations
│   ├── tests/          # 3 test files (39+ endpoint tests)
│   └── seed_india.py   # Demo data seeder
├── config/             # .env.example files
├── docs/               # Documentation
└── scripts/            # Start/stop scripts
```

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Docker Desktop** (for local PostgreSQL + Redis)
- **npm**

## Quick Start (One Command)

```powershell
# From repo root:
scripts\start-khatabox.bat
```

This handles everything: checks Docker, runs PostgreSQL + Redis, applies 17 migrations, seeds demo data (1500+ orders, 178 seed products), and starts both servers.

## Manual Setup

### 1. Clone and Configure Environment

```bash
git clone <repo-url> && cd KhataBox

# Backend environment
copy backend\.env.example backend\.env
# Edit backend\.env — set DATABASE_URL to your local PostgreSQL:
# DATABASE_URL=postgresql+asyncpg://khatabox:khatabox123@localhost:5432/khatabox

# Frontend environment
copy .env.example frontend\.env.local
```

### 2. Start Database Services

```bash
docker compose up -d
# Starts PostgreSQL on :5432, Redis on :6379
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (creates 18 tables)
alembic upgrade head

# Seed demo data
python seed_india.py
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

### 5. Run Both Servers

```powershell
# Terminal 1 — Backend (from backend/)
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 2 — Frontend (from frontend/)
npm run dev -- --webpack
```

Open http://localhost:3000

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL async connection string |
| `SECRET_KEY` | Yes | change-me | JWT signing secret |
| `ALGORITHM` | No | HS256 | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 30 | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | 7 | Refresh token TTL |
| `REDIS_URL` | No | — | Redis connection string |
| `RESEND_API_KEY` | No | — | Resend transactional email key |
| `SENTRY_DSN` | No | — | Sentry error tracking DSN |
| `POSTHOG_API_KEY` | No | — | PostHog analytics key |
| `POSTHOG_HOST` | No | https://us.i.posthog.com | PostHog host |
| `CORS_ORIGINS` | Yes | http://localhost:3000 | Comma-separated allowed origins |
| `R2_ENDPOINT_URL` | No | — | Cloudflare R2 S3 endpoint |
| `R2_ACCESS_KEY_ID` | No | — | R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | — | R2 secret key |
| `R2_BUCKET_NAME` | No | khatabox | R2 bucket name |
| `R2_PUBLIC_URL` | No | — | R2 public bucket URL |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (default: http://localhost:8000) |
| `AUTH_SECRET` | Yes | NextAuth JWT encryption secret |
| `AUTH_URL` | Yes | Frontend public URL |

### Local Development Values

- **PostgreSQL:** `postgresql+asyncpg://khatabox:khatabox123@localhost:5432/khatabox`
- **Redis:** `redis://localhost:6379/0`
- **CORS Origins:** `http://localhost:3000,http://localhost:8002`

## Running Locally

### Via the Start Script (Recommended)

```powershell
scripts\start-khatabox.bat
```

This auto-detects whether you're using a local Docker database or a remote Neon database. It checks Docker, applies migrations, seeds data if empty, and starts both servers with one command.

### Manual Start

| Service | Command | URL |
|---------|---------|-----|
| Backend | `cd backend; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8002` | http://localhost:8002 |
| Backend Docs | (auto) | http://localhost:8002/docs |
| Frontend | `cd frontend; npm run dev -- --webpack` | http://localhost:3000 |
| Health Check | (auto) | http://localhost:8002/health |

**Note:** Use `--webpack` flag (not Turbopack) to avoid a path-encoding bug with spaces in Windows project paths.

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@khatabox.com | Admin@123 |
| Shopkeeper | {shop_name}@khatabox.com | Shop@123 |
| Customer | contact.{...}@client.com | customer123 |

## Development Workflow

### Local → Git → Deploy

```
┌─────────────────────────────────────────────────────────┐
│  1. Make changes locally                                 │
│  2. Test with: scripts\start-khatabox.bat               │
│  3. Run backend tests: cd backend; pytest tests/ -v     │
│  4. Build frontend: cd frontend; npm run build          │
│  5. Commit and push to GitHub                            │
│  6. Railway auto-deploys backend (Dockerfile)            │
│  7. Vercel auto-deploys frontend (root dir detected)     │
│  8. Verify on production URLs                            │
└─────────────────────────────────────────────────────────┘
```

## Deployment

### Backend (Railway)

The backend is deployed via Docker. Railway auto-detects the `Dockerfile` at the project root.

**Steps:**
1. Push to GitHub
2. Create a Railway project linked to your repo
3. Set these environment variables in Railway dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/db` (Neon/SUPABASE) |
| `SECRET_KEY` | (generate a random string) |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` |
| `REDIS_URL` | `redis://...` (Upstash or Redis Cloud) |
| `RESEND_API_KEY` | (your Resend API key) |

4. Railway builds and deploys — health check endpoint: `/health`

### Frontend (Vercel)

**Steps:**
1. In Vercel, import the same GitHub repo
2. Framework preset: **Next.js** (auto-detected)
3. Root directory: `frontend/` (set in Vercel project settings)
4. Environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.railway.app` |
| `AUTH_SECRET` | (same as NextAuth secret) |
| `AUTH_URL` | `https://your-frontend.vercel.app` |

5. Deploy — Vercel auto-detects Next.js 16

### Database (Neon)

1. Create a Neon project
2. Get the connection string (asyncpg format):
   ```
   postgresql+asyncpg://user:pass@ep-xxx.us-east-2.aws.neon.tech/khatabox
   ```
3. **Important:** Neon adds `?sslmode=require&channel_binding=require` to the URL automatically. The backend strips these parameters before connecting (asyncpg rejects them; SSL is auto-enabled).
4. Run migrations against Neon:
   ```bash
   cd backend
   $env:DATABASE_URL="postgresql+asyncpg://..."  # Windows
   alembic upgrade head
   python seed_india.py
   ```

### Verifying Deployed Version

After deployment:

1. Backend: `https://your-backend.railway.app/docs` — should load Swagger UI
2. Frontend: `https://your-frontend.vercel.app` — should load login page
3. Health: `https://your-backend.railway.app/health` — should return `{"status":"healthy"}`
4. Login with demo credentials
5. Test key flows:
   - Register a new shopkeeper → auto-redirect to `/setup-inventory`
   - Browse catalog → add to cart → checkout
   - Create orders, manage inventory

## Known Deployment Notes

- **Neon DB URL:** The auto-added `sslmode=require` and `channel_binding=require` query params are stripped by both `backend/app/core/database.py` and `backend/alembic/env.py` before engine creation.
- **Migrations are idempotent:** Migration `0017_seed_products_table.py` uses `CREATE TABLE IF NOT EXISTS` — safe to re-run.
- **Redis on Railway:** Use Upstash Redis or Redis Cloud. Set `REDIS_URL` in Railway env vars.
- **Start script auto-detection:** `scripts/start-khatabox.bat` checks if `backend/.env` contains `localhost:5432` — if yes, uses local Docker; if not, skips Docker checks and uses remote DB directly.

## Authentication Flow

1. User submits credentials on the login page (role selected: admin/shopkeeper/customer).
2. NextAuth `authorize` callback sends a POST to `/api/v1/auth/login` on the FastAPI backend.
3. Backend validates credentials, returns JWT access token (30 min) and refresh token (7 days).
4. NextAuth stores tokens in the JWT session strategy.
5. Subsequent API calls use `client-api.ts` which attaches the access token as a Bearer header.
6. Backend `get_current_user` dependency decodes the JWT and loads the user from the database.
7. `require_role` dependency enforces role-based access at the endpoint level.

## API Summary

The backend exposes 22 route modules under `/api/v1/`:

| Module | Prefix | Auth | Roles |
|--------|--------|------|-------|
| Authentication | `/auth` | Public + JWT | all |
| Dashboard | `/dashboard` | JWT | admin, shopkeeper |
| Catalog | `/catalog` | JWT | all |
| Products | `/products` | JWT | admin, shopkeeper |
| Orders | `/orders` | JWT | admin, shopkeeper, customer |
| Suppliers | `/suppliers` | JWT | admin, shopkeeper |
| Customers | `/customers` | JWT | admin, shopkeeper |
| Forecasting | `/forecasting` | JWT | admin, shopkeeper |
| Inventory | `/inventory` | JWT | admin, shopkeeper |
| Invoices | `/invoices` | JWT | admin, shopkeeper |
| Receipts | `/receipts` | JWT | admin, shopkeeper |
| Purchase Orders | `/purchase-orders` | JWT | admin, shopkeeper |
| QR Codes | `/qrcodes` | JWT | admin, shopkeeper |
| Expiry | `/expiry` | JWT | admin, shopkeeper |
| Audit | `/audit` | JWT | admin |
| Notifications | `/notifications` | JWT | all |
| Reports | `/reports` | JWT | admin, shopkeeper |
| Stores | `/stores` | JWT | admin, shopkeeper |
| Stock Transfers | `/transfers` | JWT | admin, shopkeeper |
| Customer Cart | `/cart` | JWT | customer |
| Data Management | `/data` | JWT | admin |

## Testing

### Backend

```bash
cd backend
pytest tests/ -v
```

39+ async tests across 20 endpoint groups using a subprocess Uvicorn server on port 18999.

### Frontend

```bash
cd frontend
npm test
```

5 Vitest unit tests (utils, components, API client, store).

## License

MIT
