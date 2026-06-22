# KhataBox — Inventory & Billing System

A full-stack inventory management and billing platform for Indian small businesses. Built with **Next.js 15 (App Router)**, **FastAPI**, **PostgreSQL**, and **Redis**.

## Quick Start

```bash
# Prerequisites: Docker, Python 3.11+, Node.js 20+, npm
npm install
pip install -r backend/requirements.txt
docker compose up -d
cd backend && alembic upgrade head && python seed_india.py && cd ..
npm run dev
```

Open **http://localhost:3000** — login with `admin@khatabox.com` / `Admin@123`.

## Docs

| Guide | Description |
|-------|-------------|
| [Deployment Guide](docs/DEPLOYMENT.md) | Full setup, local run, production deploy, troubleshooting |
| [API Docs](http://localhost:8002/docs) | Swagger UI (when backend is running) |
| [Project Structure](docs/PROJECT_STRUCTURE.md) | Architecture overview |
| [Env Setup](docs/ENV_SETUP.md) | All environment variables explained |

## Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS v4, Shadcn UI, React Query, Zustand, NextAuth v5
- **Backend:** FastAPI, SQLAlchemy (async), Alembic, Pydantic v2
- **Infra:** PostgreSQL 16, Redis 7, Docker

## Architecture

```
Route handlers (api/v1/) → Services (services/) → Models (models/)
                              ↕
                          Cache (Redis)
                              ↕
                          Socket.IO
```

Route handlers are thin wrappers. All business logic lives in `services/`.
