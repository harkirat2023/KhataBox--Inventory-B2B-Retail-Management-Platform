---
title: KhataBox Architecture
description: System architecture, stack, data flow, and deployment.
---

# Architecture

## Tech Stack

### Backend
- Framework: FastAPI (Python 3.11+)
- ORM: SQLAlchemy 2.0 (async with asyncpg)
- Database: PostgreSQL 15+ (Neon cloud or local Docker)
- Cache: Redis 7+ (30s dashboard cache, 300s catalog cache)
- Auth: JWT (access + refresh tokens), OTP support
- File Storage: Cloudflare R2 (product images, backups)
- Background: Uvicorn with asyncio
- PDF: ReportLab for invoices/receipts
- ML: scikit-learn for demand forecasting

### Frontend
- Framework: Next.js 15+ (App Router)
- Language: TypeScript
- UI: Tailwind CSS, shadcn/ui components
- State: Zustand (persist + multi-cart stores)
- Forms: React Hook Form (login/register)
- Charts: Recharts (dashboard, reports)
- QR: qrcode library + html-to-image
- PDF viewing: react-pdf
- Dev server: next dev --webpack (avoids path encoding bug with spaces)

### Infrastructure
- Container: Docker (PostgreSQL, Redis optional)
- Deployment: Vercel (frontend) + Railway (backend/DB)
- Database: Neon (PostgreSQL serverless)
- Async: Uvicorn workers

---

## Project Structure
KhataBox/
  backend/           - FastAPI Python backend
    app/
      api/v1/        - 31 route modules
      models/        - 20 SQLAlchemy models
      schemas/       - 17 Pydantic schemas
      services/      - Business logic layer
      core/          - Config, auth, database, cache
    alembic/         - 25 migration versions
    scripts/         - Seeding (seed_india.py, seed_seed_products.py)
  frontend/          - Next.js TypeScript app
    src/
      app/           - 36+ page.tsx files (dashboard + customer)
      components/    - 22 shared UI + 5 layout components
      lib/           - 8 utility modules
      stores/        - 4 Zustand stores
      types/         - 6 type definition files
  docs/              - 6 documentation files
  scripts/           - start-khatabox.bat, maintenance scripts

---

## Authentication Flow
1. User registers via OTP (phone) or email/password
2. Server returns JWT access token (15min) + refresh token (7 days)
3. Frontend stores tokens in localStorage (Zustand persist)
4. Each API call includes Authorization: Bearer <token>
5. On 401, frontend calls /auth/refresh for new tokens
6. OTP mode: send-otp (public) -> register-with-otp or login-with-otp

## Order Flow
1. Customer selects products (QR scan or catalog)
2. Order created with status=completed, auto-deducts inventory
3. Receipt generated with receipt_items
4. Khata credit updated if applicable
5. PDF invoice generated on request
6. B2C orders follow approval lifecycle: pending -> approved -> processing -> completed

## Inventory Movement Types
- add: Stock increase (purchase, correction)
- remove: Stock decrease (damage, correction)
- adjust: Manual stock adjustment
- reserve_out: Order confirmed, stock reserved
- reserve_cancelled_in: Cancelled order restores stock
- consume_out: Order completed, stock consumed

## Caching Strategy
- Dashboard stats: Redis 30s TTL
- Catalog listings: Redis 300s TTL
- Demand forecasts: Computed on request with DB aggregation
- Price analysis: Computed on request

## Deployment Architecture
- Vercel hosts the Next.js frontend (serverless)
- Railway hosts FastAPI backend + PostgreSQL + Redis
- Cloudflare R2 stores static assets and backups
- Neon cloud can replace local PostgreSQL for serverless
- .env files configure DB URLs, Redis URLs, JWT secrets, R2 keys