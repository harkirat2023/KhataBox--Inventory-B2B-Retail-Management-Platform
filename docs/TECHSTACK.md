# KhataBox - Technology Stack

## Overview

KhataBox is an AI-powered Inventory & B2B Retail Management Platform.

## Frontend

### Next.js 16 + React 19 + TypeScript
- Server Components and Server Actions
- Better SEO and faster page loads
- Type-safe development

### UI Framework: Tailwind CSS v4
- Rapid development
- Consistent design system

### Component Library: shadcn/ui (using @base-ui/react)
Note: Uses @base-ui/react instead of Radix UI

### Charts & Analytics: Recharts
### State Management: TanStack Query + Zustand

## Backend

### FastAPI (Python)
- Native AI/ML integration
- Automatic API documentation
- Async support

### ORM: SQLAlchemy 2.0 (async)
Note: Uses SQLAlchemy with asyncpg driver, NOT Prisma

### Authentication: Auth.js (NextAuth v5)
- JWT support
- Role-based access control

## Database

### PostgreSQL
- ACID compliance
- Full-text search (tsvector with GIN index)

## Caching & Queue

### Redis
- Dashboard caching
- Session storage
- Notification queues
- Simple task queue (via task_queue.py)


## Real-Time: Socket.IO

## Background Jobs

### Simple Redis Queue
Note: Not using BullMQ - uses a simple Redis-based queue

## Machine Learning

- Scikit-learn (Random Forest)
- Pandas, NumPy

## Search

### PostgreSQL Full-Text Search
- Uses tsvector with GIN indexes

## Deployment

### Frontend: Vercel
### Backend: Railway (Docker)
### Database: Neon PostgreSQL
### Redis: Upstash Redis
### Storage: Cloudflare R2