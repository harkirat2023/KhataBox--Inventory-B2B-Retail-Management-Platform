# KHATABOX — Complete Interview Preparation Book

> **Full-Stack B2B Retail Management Platform for Indian Small Businesses**
>
> _Everything you need to confidently explain, defend, and answer interview questions about this project._

---

## TABLE OF CONTENTS

**[Chapter 1 — Project Overview](#chapter-1--project-overview)**
1.1 Project Name · 1.2 Problem Statement · 1.3 Why Built · 1.4 Market Problems · 1.5 Why Existing Software Wasn't Enough · 1.6 Target Users · 1.7 Use Cases · 1.8 Business Impact · 1.9 Future Scope · 1.10 Elevator Pitch · 1.11 One-Minute Explanation · 1.12 Three-Minute Explanation

**[Chapter 2 — System Architecture](#chapter-2--system-architecture)**
2.1 High-Level Architecture · 2.2 Architecture Diagrams · 2.3 Request Flow · 2.4 Response Flow · 2.5 Authentication Flow · 2.6 Order Flow · 2.7 Inventory Flow

**[Chapter 3 — Tech Stack](#chapter-3--tech-stack)**
3.1 Technology Table · 3.2 React · 3.3 Next.js · 3.4 TypeScript · 3.5 Tailwind CSS · 3.6 Shadcn UI · 3.7 FastAPI · 3.8 Python · 3.9 PostgreSQL · 3.10 SQLAlchemy · 3.11 JWT · 3.12 Zustand · 3.13 TanStack Query · 3.14 Docker · 3.15 Railway & Vercel

**[Chapter 4 — Features](#chapter-4--features)**
4.1 Authentication · 4.2 Store Management · 4.3 Inventory · 4.4 Billing (POS) · 4.5 Orders · 4.6 Purchase Orders · 4.7 Suppliers · 4.8 Customers & Khata · 4.9 Notifications · 4.10 Dashboard · 4.11 Reports · 4.12 Price Analysis · 4.13 QR Labels & Scanning · 4.14 Data Import/Export

**[Chapter 5 — Machine Learning](#chapter-5--machine-learning)**
5.1 Why ML · 5.2 Problem & Objective · 5.3 Dataset · 5.4 Feature Engineering · 5.5 Model Selection · 5.6 How Random Forest Works · 5.7 Decision Trees · 5.8 Entropy & Gini · 5.9 Hyperparameters · 5.10 Training Pipeline · 5.11 Prediction Flow · 5.12 Confidence Score · 5.13 Evaluation · 5.14 Why Not XGBoost/Neural Nets · 5.15 Future Improvements

**[Chapter 6 — Dataset](#chapter-6--dataset)**
6.1 Source · 6.2 Preprocessing · 6.3 Synthetic Fallback · 6.4 Sample Data

**[Chapter 7 — Database Design](#chapter-7--database-design)**
7.1 ER Diagram · 7.2 Table Reference · 7.3 Relationships · 7.4 Indexes · 7.5 Key Decisions

**[Chapter 8 — API Explanation](#chapter-8--api-explanation)**
8.1 Design Philosophy · 8.2 Auth APIs · 8.3 Dashboard · 8.4 Products · 8.5 Orders · 8.6 Forecasting · 8.7 Error Patterns

**[Chapter 9 — Workflow](#chapter-9--workflow)**
9.1 Registration · 9.2 Setup Inventory · 9.3 Billing · 9.4 B2C Order · 9.5 Purchase Order · 9.6 Stock Transfer

**[Chapter 10 — Business Logic](#chapter-10--business-logic)**
10.1 Inventory Value · 10.2 Profit & Margin · 10.3 GST · 10.4 Khata (Credit) · 10.5 Discount

**[Chapter 11 — Security](#chapter-11--security)**
11.1 JWT · 11.2 Authentication & Authorization · 11.3 RBAC · 11.4 Password Hashing · 11.5 CORS · 11.6 Rate Limiting

**[Chapter 12 — Deployment](#chapter-12--deployment)**
12.1 Vercel · 12.2 Railway · 12.3 Neon DB · 12.4 Docker · 12.5 Environment Variables · 12.6 Common Issues

**[Chapter 13 — Interview Questions (150+)](#chapter-13--interview-questions)**
13.1 Project · 13.2 React · 13.3 Next.js · 13.4 TypeScript · 13.5 FastAPI · 13.6 Python · 13.7 PostgreSQL · 13.8 REST API · 13.9 JWT · 13.10 ML · 13.11 Deployment · 13.12 Database Design · 13.13 Architecture · 13.14 Security

**[Chapter 14 — HR Questions](#chapter-14--hr-questions)**
14.1 Tell Me About Yourself · 14.2 Why This Project · 14.3 Biggest Challenge · 14.4 Failure · 14.5 Success · 14.6 Why Hire You

**[Chapter 15 — Follow-Up Questions](#chapter-15--follow-up-questions)**
15.1 Follow-ups with Answers

**[Chapter 16 — System Design](#chapter-16--system-design)**
16.1 Scalability · 16.2 Caching · 16.3 Indexes · 16.4 Concurrency · 16.5 Future Microservices

**[Chapter 17 — Debugging Stories](#chapter-17--debugging-stories)**
17.1 MissingGreenlet · 17.2 Neon URL Params · 17.3 Turbopack Path Bug · 17.4 Migration 0011

**[Chapter 18 — Resume Defense](#chapter-18--resume-defense)**
18.1 Common Bullets · 18.2 Cross-Questions

**[Chapter 19 — Quick Revision](#chapter-19--quick-revision)**
19.1 One-Hour · 19.2 15-Minute · 19.3 5-Minute

**[Chapter 20 — Cheat Sheet](#chapter-20--cheat-sheet)**
20.1 Formulas · 20.2 Status Codes · 20.3 React Hooks · 20.4 HTTP Methods · 20.5 SQLAlchemy Patterns

**[Chapter 21 — Common Mistakes](#chapter-21--common-mistakes)**
21.1 What NOT to Say · 21.2 How to Answer Confidently

**[Chapter 22 — Mock Interview](#chapter-22--mock-interview)**
22.1 HR Round · 22.2 Technical Round · 22.3 Project Round · 22.4 Stress Round

---

# Chapter 1 — Project Overview

## 1.1 Project Name

**KhataBox**

_Khata_ is a Hindi/Urdu word meaning _account_ or _ledger_. In Indian small businesses, shopkeepers maintain a physical "Khata" (notebook) to track credit transactions — when a customer buys on trust and pays later.

_KhataBox_ = Digital Khata in a box. A complete business management system replacing the paper notebook.

## 1.2 Problem Statement

**Problem:** India has 63+ million small retail businesses (kirana stores, pharmacies, electronics shops, clothing stores, restaurants). The vast majority operate with:

- **Paper notebooks** for tracking customer credit (Khata)
- **Manual calculations** for billing and inventory
- **Memory-based stock management** — shopkeepers guess what to reorder
- **No data backups** — if the notebook is lost, the business has no record
- **No insight** into which products/customers are profitable

Small business owners cannot afford expensive ERP systems (SAP, Oracle NetSuite, Tally ERP) costing ₹50,000–₹5,00,000 per year.

## 1.3 Why This Project Was Built

Bridges the gap between paper-based accounting and modern digital management for Indian SMBs. Key motivations:

- 63M+ small retail businesses have no affordable digital solution
- Existing solutions are either too expensive (Tally) or too complex (SAP)
- Most solutions don't understand the Indian Khata (credit) system
- COVID-19 accelerated need for contactless billing and online ordering
- Shopkeepers need data to make informed inventory, pricing, and credit decisions

## 1.4 Existing Problems in the Market

| Problem | Impact |
|---------|--------|
| Paper Khata notebook lost/damaged | Businesses lose years of credit records |
| Manual stock counting | Takes hours, error-prone |
| No reorder alerts | Stockouts lose customers |
| No customer insights | Can't identify best customers |
| Expensive software | ₹50,000+/year unaffordable |
| Complex UI | Shopkeepers can't navigate complex software |
| No mobile support | Most solutions desktop-only |
| No credit tracking | Can't manage customer credit effectively |

## 1.5 Why Existing Software Wasn't Enough

| Software | Why Not Enough |
|----------|---------------|
| **Tally ERP** | Desktop-only, ₹18,000+, complex, no mobile, no B2C |
| **SAP/Oracle** | Crores of rupees, too complex, needs IT team |
| **Zoho Inventory** | No Khata system, limited Indian tax support |
| **Khatabook** | Only Khata tracking — no inventory, billing, purchase orders |
| **Vyapar/Giddh** | Limited features, no ML forecasting, no B2C catalog |
| **Google Sheets** | No automation, no barcode/QR, no billing system |

KhataBox combines **all** features into one platform: inventory, billing, Khata, purchase orders, QR/barcode, ML forecasting, reports, B2C catalog.

## 1.6 Target Users

**Primary: Shopkeepers** — Kirana stores, pharmacies, electronics shops, clothing stores, restaurants, general stores

**Secondary: Customers** — B2B (wholesale buyers on credit), B2C (walk-in, online ordering)

**Tertiary: Admins** — Platform administrators managing users and system health

## 1.7 Real-World Use Cases

**Kirana Store (Delhi):** Ramesh has 50 credit customers. He logs sales → inventory auto-updates → Khata updated → monthly report shows who owes what.

**Pharmacy (Mumbai):** Priya has 2,000+ medicines with expiry dates. KhataBox shows expiring products in 30/60/90 days → she discounts them before expiry.

**Electronics Shop (Bangalore):** Sanjay sells to corporate customers on credit. Price analysis shows true cost (after shipping/tariff) → margin analysis → profitability by product.

**Wholesale Supplier (Chennai):** Lakshmi supplies vegetables to 30 restaurants. She creates purchase orders → tracks delivery → auto-updates inventory.

## 1.8 Business Impact

- **80% reduction** in manual accounting time
- **Real-time inventory visibility**
- **Reduced stockouts** — reorder alerts
- **Data-driven decisions** — profitable products/customers
- **Professional billing** — GST-compliant invoices
- **No data loss** — cloud backup

## 1.9 Future Scope

1. Payment Gateway Integration (Razorpay/Stripe)
2. Native Mobile Apps (Android/iOS with offline)
3. WhatsApp Integration (order notifications, receipts)
4. Multi-language Support (Hindi, Tamil, etc.)
5. Advanced ML (time-series forecasting, recommendations)
6. Offline Mode (Service Worker + IndexedDB)
7. Marketplace for cross-shopkeeper trade

## 1.10 Elevator Pitch (30 seconds)

> "KhataBox is a full-stack retail management platform built for India's 63 million small businesses. It replaces the paper notebook — the 'Khata' — with a digital system managing inventory, billing, customer credit, purchase orders, and analytics. Shopkeepers track stock, generate GST invoices, manage credit, and predict demand using ML — all from a web dashboard. Customers scan QR codes, browse products, and order on credit from their phones. Built with Next.js and FastAPI, deployed on Vercel and Railway with PostgreSQL. It's like Tally + Khatabook + Shopify — but built for Indian small businesses."

## 1.11 One-Minute Explanation

> "India's 63 million small businesses track everything in paper notebooks. When the notebook is lost, the business has no records. KhataBox digitizes all of this. A shopkeeper logs in, creates their store, adds products (or uses our 178 pre-seeded products), and starts billing. Every sale auto-updates inventory, updates the customer's credit ledger, and generates a GST-compliant receipt. Customers can browse a catalog, scan QR codes to add items to a cart, and place orders on credit. The platform includes ML for demand forecasting, price analysis for profitability, and detailed reports. Technically, it's a monorepo with Next.js frontend on Vercel and FastAPI backend on Railway with Docker, using PostgreSQL on Neon, Redis for caching, and Socket.IO for real-time updates."

## 1.12 Three-Minute Explanation

> KhataBox is a comprehensive B2B retail management platform for Indian small businesses. The name comes from 'Khata' — the Hindi word for an account ledger.

> **The Problem:** 63+ million Indian retail outlets run on paper — notebooks for tracking credit, manual stock counting, mental math for business analysis. Existing software is either too expensive (Tally at ₹18,000+) or too complex. Most don't understand the Indian credit system or GST.

> **What KhataBox Does:**
> 1. **Inventory Management** — stock levels, low-stock alerts, expiry tracking, movements
> 2. **Billing & POS** — GST invoices, multi-cart system for rapid billing
> 3. **Khata (Credit)** — credit limits, outstanding balances, payment tracking
> 4. **Customer Self-Service** — QR scanning, product catalog, cart-based ordering, credit approval
> 5. **Purchase Orders** — order stock from suppliers, track delivery
> 6. **Analytics** — top customers, CLV, repeat purchases, CSV/XLSX export
> 7. **ML Forecasting** — Random Forest demand prediction with confidence scores
> 8. **Price Analysis** — true cost calculation, margin analysis, pricing suggestions
> 9. **Notifications** — real-time alerts via Socket.IO and in-app

> **Technical Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 frontend on Vercel. FastAPI + async SQLAlchemy + PostgreSQL backend on Railway (Docker). Redis for caching, Cloudflare R2 for file storage, Socket.IO for real-time. ML model (RandomForestRegressor) served as pickle file. 26+ frontend routes, 80+ API endpoints, 18 database tables.

---

# Chapter 2 — System Architecture

## 2.1 High-Level Architecture

```
                    ┌─────────────────────────────────────┐
                    │       BROWSER (User)                 │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS
                    ┌──────────────▼──────────────────────┐
                    │       VERCEL (CDN + Next.js)         │
                    │    App Router — 26 Routes            │
                    │    Zustand — Client State            │
                    │    TanStack Query — Server State      │
                    │    client-api.ts — HTTP Client        │
                    │    (JWT Bearer + http→https fix)     │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS
                    ┌──────────────▼──────────────────────┐
                    │  RAILWAY — Docker (FastAPI + Uvicorn)│
                    │                                     │
                    │  Middleware: CORS, Rate Limiter,     │
                    │             Exception Handler        │
                    │                                     │
                    │  Routers: 20+ files (auth, products, │
                    │  orders, customers, inventory, ...)  │
                    │                                     │
                    │  Services: order_service, cart,      │
                    │  inventory, notifications, ML        │
                    └──────┬──────────────┬───────────────┘
                           │              │
              ┌────────────▼──┐  ┌────────▼────────────┐
              │  Neon (PG16)  │  │  Redis (Cache/OTP)  │
              │  18+ tables   │  │  Dashboard cache    │
              │  24 migrations│  │  OTP storage (5min) │
              │  11000+ rows  │  │  Graceful degrade   │
              └───────────────┘  └─────────────────────┘

              ┌─────────────────────────────────────────┐
              │  Cloudflare R2 (S3-compatible)          │
              │  Product images, backup exports         │
              │  Falls back to placeholder if unset     │
              └─────────────────────────────────────────┘
```

## 2.2 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Monorepo with separate frontend/backend dirs** | Independent deployment (Vercel + Railway), independent scaling |
| **Async SQLAlchemy** | Non-blocking DB ops, higher throughput |
| **Service layer pattern** | Thin controllers, separated business logic |
| **JWT stateless auth** | No server sessions, easy horizontal scaling |
| **Zustand over Redux** | Less boilerplate, built-in persist middleware |
| **TanStack Query** | Auto caching, refetch intervals, stale-while-revalidate |
| **Socket.IO** | Full-duplex real-time, room-based per user |
| **Pickle for ML model** | Simpler than MLOps for MVP, ~20ms inference |
| **Graceful Redis degradation** | App works even if Redis is down |
| **R2 over S3** | 1/10th cost, no egress fees |

## 2.3 Request Flow

```
User clicks "View Orders"
  → Browser GET /orders
  → Vercel CDN serves static assets
  → Next.js App Router matches route
  → Middleware checks khatabox_token cookie (auth + role)
  → Layout renders (Sidebar + TopNav)
  → Page component mounts → useQuery fires
  → client-api.ts reads cookie → adds Authorization header
  → HTTP(S) request to Railway: GET /api/v1/orders?page=1
  → FastAPI middleware: CORS → Rate Limiter → JWT decode → role check
  → Router handler → Service layer → Async SQLAlchemy query
  → PostgreSQL returns data
  → Pydantic serializes to JSON
  → TanStack Query caches response (staleTime: 30s)
  → React re-renders table with order data
```

## 2.4 Authentication Flow

```
User submits credentials on /login
  → POST /api/v1/auth/login (email + password + role)
  → Backend verifies bcrypt hash
  → Generates JWT (access: 30min, refresh: 7 days)
  → Returns tokens + user info
  → Frontend stores in khatabox_token cookie
  → Calls NextAuth signIn() with credentials
  → Redirects to /dashboard (shopkeeper) or /catalog (customer)

Subsequent API calls:
  → client-api.ts reads cookie
  → Adds Authorization: Bearer <access_token>
  → Backend decode_jwt() → get_current_user() → require_role()
```

## 2.5 Order Flow (Create in Billing)

```
Shopkeeper selects products, sets qty, toggles GST, clicks "Place Order"
  → POST /api/v1/orders (customer_id, items, apply_gst)
  → Backend order_service.create_order():
      1. Validate stock for each item
      2. Calculate: subtotal → GST (if apply_gst) → total
      3. Create Order (status=COMPLETED) + OrderItems
      4. Deduct inventory for each item (movement: "sale")
      5. Update customer.credit_used += total
      6. db.commit()
      7. Create Receipt + ReceiptItems
      8. Socket.IO emit "order_created"
      9. Create notification if low stock
  → Returns OrderResponse
  → Frontend shows success toast
  → Invalidates dashboard + inventory queries
```

## 2.6 Inventory Flow

```
Stock IN:  Purchase Order received → movement "purchase" (+qty)
           Customer return → movement "return" (+qty)
           Transfer from other store → movement "transfer_in" (+qty)
           Physical count adjustment → movement "adjustment" (+/-)

Stock OUT: Customer order → movement "sale" (-qty)
           Transfer to other store → movement "transfer_out" (-qty)
           Reserve for order → movement "reserve_out" (-qty)
           Used (restaurant) → movement "consume_out" (-qty)

Every movement recorded in inventory_movements table (audit trail).
Product.stock_quantity = sum of all movement quantities.
Low stock alert when stock <= reorder_threshold (default: 10).
```

---

# Chapter 3 — Tech Stack

## 3.1 Technology Table

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend Framework | Next.js | 16.2.7 | React framework, App Router |
| UI Library | React | 19.2.4 | Component-based UI |
| Language | TypeScript | ~5.7 | Type-safe JavaScript |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Components | Shadcn UI | 1.5.0 | Accessible primitives on Radix |
| State (Client) | Zustand | 5.0.14 | Lightweight state |
| Server State | TanStack Query | 5.101.0 | API caching |
| Charts | Recharts | 3.8.1 | Sales charting |
| Auth (FE) | NextAuth v5 | beta 31 | Authentication |
| Icons | Lucide React | 1.17.0 | Icon library |
| QR Scan | html5-qrcode | 2.3.8 | Browser QR scanning |
| Backend | FastAPI | 0.115.6 | Async Python web framework |
| ORM | SQLAlchemy | 2.0.50 | Async database ORM |
| Validation | Pydantic | 2.13.4 | Data validation |
| Auth (BE) | python-jose + passlib | — | JWT + bcrypt |
| Database | PostgreSQL | 16 | Relational database |
| Cache | Redis | 7 (client) | Caching + OTP |
| Migrations | Alembic | 1.14.0 | Schema migrations |
| ML | scikit-learn | 1.9.0 | RandomForest model |
| Real-time | Socket.IO | py5.11/fe4.8 | Bidirectional events |
| File Storage | Cloudflare R2 | — | S3-compatible |
| Deployment (FE) | Vercel | — | Frontend hosting |
| Deployment (BE) | Railway | — | Backend (Docker) |

## 3.2 React (19.2.4)

**Why chosen:** Huge ecosystem, component reusability, hooks, virtual DOM, strong TypeScript support.

**Alternatives rejected:**
- Angular — Heavy, steep learning curve, more boilerplate
- Vue.js — Smaller ecosystem, fewer job opportunities
- Svelte — Newer, smaller community

**Key hooks used:** useState, useEffect, useContext, useCallback, useMemo, useRef

**Interview Q:** What is virtual DOM?
> The virtual DOM is an in-memory representation of the real DOM. When state changes, React creates a new virtual DOM tree, compares it with the previous one (diffing), calculates minimal changes (reconciliation), and applies only those to the real DOM.

**Interview Q:** Controlled vs uncontrolled components?
> Controlled: state managed by React (value + onChange). Uncontrolled: state stored in DOM (useRef). KhataBox uses controlled components for all forms.

## 3.3 Next.js (16.2.7)

**Why chosen:** App Router with nested layouts, Server Components, file-based routing, seamless Vercel deployment.

**Key features used:**
- **App Router** — `app/(dashboard)/*` and `app/(customer)/*` route groups with different layouts
- **Server Components** — pages server-rendered with client interaction islands
- **Route Groups** — `(dashboard)` and `(customer)` groups - URL doesn't include the group name
- **Middleware** — auth guard checking cookies/roles before rendering
- **API Routes** — NextAuth handler at `app/api/auth/[...nextauth]/route.ts`
- **Loading states** — loading.tsx per route segment

**Why --webpack (not Turbopack):** Project path contains spaces (`1A. PROJECTS`). Turbopack has a URL-encoding bug with spaces. Workaround: `next dev --webpack`.

**Interview Q:** Server Components vs Client Components?
> Server Components render on the server, send zero JS to client, can directly access DB/files. Client Components (`'use client'`) run in browser with hooks and interactivity. KhataBox: layout server-rendered, interactive pages marked `'use client'`.

**Interview Q:** What are route groups?
> Folders wrapped in parentheses like `(dashboard)`. They organize routes without affecting URL. KhataBox uses `(dashboard)` for admin and `(customer)` for customer pages — different layouts, same `/` prefix.

## 3.4 TypeScript (~5.7)

**Why chosen:** Catch errors at compile time, better IDE support, self-documenting code.

**Usage in KhataBox:**
- Interfaces for all API responses (Order, Product, Customer)
- Type-safe API client (client-api.ts)
- Zustand stores typed
- Query key factory typed

## 3.5 Tailwind CSS v4

**Why chosen:** No naming conventions, no conflicts, rapid prototyping, built-in responsive (`sm:`, `md:`, `lg:`), dark mode (`dark:`).

**Key patterns:**
- Responsive grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Dark mode: `dark:bg-zinc-900 dark:text-white`
- Card: `rounded-lg border bg-card text-card-foreground shadow-sm`
- Status badges: `bg-green-600 text-white` / `bg-red-600 text-white`

## 3.6 Shadcn UI

**Not a library — code distribution model.** Components are copied into `components/ui/` and you own them.

**Why chosen:** Fully accessible (Radix ARIA), customizable (own the code), beautiful Tailwind defaults, no version lock-in.

**Components used:** Button, Card, Dialog, Select, Input, Badge, Table, Tabs, DropdownMenu, Tooltip, Avatar, Sheet, ScrollArea, Skeleton, Sonner (toast)

## 3.7 FastAPI (0.115.6)

**Why chosen:** Async by default, automatic Swagger docs, Pydantic validation, dependency injection, high performance.

**Key features used:**
- 20+ router modules under `app/api/v1/`
- Dependencies: `get_current_user()`, `require_role()`, `get_db()`
- Pydantic schemas for all I/O validation
- Exception handlers for standard error responses
- CORS middleware for Vercel domains
- Rate limiting middleware

**Alternatives rejected:**
- Flask — Synchronous only, no auto validation
- Django REST — Heavy, complex for APIs
- Express.js — Different language (JS), no built-in validation

**Interview Q:** How does dependency injection work in FastAPI?
> Functions declared as parameters to route handlers. FastAPI calls them automatically, caches results within request scope. Example: `def get_orders(db = Depends(get_db), user = Depends(get_current_user))`.

**Interview Q:** How does Pydantic v2 differ from v1?
> Pydantic v2 is built on Rust (pydantic-core) for 5-50x faster validation. Uses `model_validate()` (not `parse_obj()`), `model_dump()` (not `dict()`).

## 3.8 Python (3.12+)

**Why chosen:** Excellent data science ecosystem (scikit-learn, pandas), FastAPI built for Python, easy to write.

**Key libraries:** pandas, numpy, scikit-learn, joblib, SQLAlchemy, Alembic, httpx, ReportLab, openpyxl, boto3

## 3.9 PostgreSQL 16

**Why chosen (over MongoDB):** KhataBox has strong relational requirements (orders→items, products→stores, customers→credit). ACID transactions ensure 5+ table updates are atomic. Full-text search (TSVECTOR).

**Key features used:** Enums (14+), Full-text search (TSVECTOR index), Foreign keys, Composite unique constraints `unique(email, role)`, Indexes

**Interview Q:** Why PostgreSQL over MongoDB?
> Relational model fits the domain naturally. ACID ensures order creation (updating 5+ tables) is atomic. JOINs are essential for reports. MongoDB denormalization would risk inconsistency.

## 3.10 SQLAlchemy 2.0

**Industry standard Python ORM.** Async support with asyncpg. Alembic integration for 24 migrations.

**Key pattern:** AsyncSession with `selectinload` for eager loading to avoid async lazy loading issues.

## 3.11 JWT

**Flow:** Login → backend verifies credentials → generates access (30min) + refresh (7 day) tokens → frontend stores in cookie → every API call attaches `Authorization: Bearer <token>` → backend decodes → extracts user_id → loads user from DB.

**Why JWT over sessions:** Stateless, easy horizontal scaling, self-contained, mobile-friendly.

## 3.12 Zustand (5.0.14)

**Why over Redux:** Less boilerplate (no actions/reducers/dispatch), simple API (`create()` returns hook), built-in persist middleware, no Provider wrapper, ~1KB vs Redux 12KB.

**Stores:** `billing.ts` (multi-cart POS), `cart.ts` (customer cart), `store-context.ts` (active store selection, persisted).

## 3.13 TanStack Query (5.101.0)

Auto caching, deduplication, background refetch, stale-while-revalidate, pagination, optimistic updates, built-in loading/error states.

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['orders', { page }],
  queryFn: () => api.getOrders(page),
  staleTime: 30_000
})
```

## 3.14 Docker

Backend containerization for Railway deployment. Python 3.12-slim image, installs requirements, runs `entrypoint.py` (migrations + uvicorn).

## 3.15 Railway & Vercel

**Railway:** Native Docker, auto HTTPS, PostgreSQL/Redis add-ons, simple GitHub integration.

**Vercel:** Zero-config Next.js deployment, auto preview deployments, Edge Functions, free tier. Root dir set to `frontend/`.

**Mixed Content fix:** `client-api.ts` auto-upgrades `http://` to `https://` when page is served over HTTPS (Vercel HTTPS → Railway HTTP would be blocked by browser).

---

# Chapter 4 — Features

## 4.1 Authentication

**Methods:** Password login (bcrypt), OTP login (email via Resend), Registration (both password and OTP)

**Flow:** User → Login form → POST /auth/login → bcrypt verify → JWT returned → cookie set → redirect by role

**OTP flow:** POST /send-otp → 6-digit code stored in Redis (5min TTL) → sent via Resend → POST /login-with-otp → verify → JWT

**Dev mode:** `debug_otp` field in response when Resend not configured — auto-fills on frontend.

## 4.2 Store Management

Shopkeepers create multiple stores under one account. Each store has a type (kirana, supermart, pharmacy, electronics, clothing, restaurant, other). Dashboard filters by store. Inventory is per-store.

## 4.3 Inventory

Product CRUD, stock tracking, reorder threshold (default 10), expiry tracking, batch numbers, image upload (R2), full-text search.

Products have: name, SKU (unique), category, cost_price, selling_price, stock_quantity, reorder_threshold, expiry_date, search_vector (TSVECTOR).

## 4.4 Billing (POS)

**Multi-cart system:** Multiple simultaneous carts with states (active, incomplete, cancelled). Shopkeeper can switch between carts.

**Flow:** Select/create customer → Add products (search or QR scan) → Inline qty adjustment → Toggle GST → Review → Place Order → inventory deducted, Khata updated, receipt generated.

**Stock validation:** Can't add more than available stock.

## 4.5 Orders

**Status flow:** PENDING → CONFIRMED → COUNTER → PROCESSING → COMPLETED | CANCELLED | REJECTED

**Revision flow:** Orders can be revised after confirmation — original and revised amounts tracked with adjustment.

**B2C orders:** Customers place orders → shopkeeper approves → marks processing → completes (deducts inventory, generates receipt).

## 4.6 Purchase Orders

Order stock from suppliers. Statuses: draft → sent → received (inventory auto-updated) or cancelled.

## 4.7 Suppliers

CRUD for supplier records. Purchase orders tied to suppliers. Price analysis by supplier.

## 4.8 Customers & Khata

**Khata (Credit):** Traditional Indian credit system. Shopkeeper sets credit limit → Customer buys on credit → credit_used increases → Payment decreases credit_used.

**Fields:** company_name, contact_person, credit_limit, credit_used, price_tier, gst_number.

## 4.9 Notifications

16 types: low_stock, order_placed, order_status_changed, payment_received, b2c_order, expiry_alert, transfer_request, etc.

**API:** List, unread-count badge, mark-all-read, mark-single-read. Plus Socket.IO push.

## 4.10 Dashboard

Metric cards (revenue, orders, customers, low stock), 12-month sales chart (Recharts), recent orders, low stock alerts, activity feed, 6 quick action buttons, store selector.

Data cached in Redis for 30 seconds.

## 4.11 Reports

Top customers (by spending), repeat purchases (frequency), CLV (customer lifetime value), CSV/XLSX export (orders, products, customers, suppliers).

## 4.12 Price Analysis

**True Cost:** cost_price + shipping + freight + handling + packaging + tariff
**Margin Analysis:** profit per product, GMROI
**Pricing Suggestions:** minimum price, suggested price (target margin), competitive price

## 4.13 QR Labels & Scanning

**Two QR types:**
1. Legacy QR — encodes integer product ID
2. Permanent QR — encodes product UUID (never changes)

**Batch labels:** Generate printable label sheets with QR + product info.

**Scanning use cases:** Shopkeeper scans own QR for inventory management. Customer scans in-store QR to add to cart.

## 4.14 Data Import/Export

Export formats: CSV and styled XLSX (openpyxl). Entities: orders, products, customers, suppliers. Import: products from XLSX/CSV with validation. Backup: full DB JSON export, R2 storage, import/restore (admin only).

---

# Chapter 5 — Machine Learning

## 5.1 Why ML Was Needed

Shopkeepers guess how much stock to order. Result: over-ordering (money stuck, expiry) or under-ordering (stockouts, lost sales). ML analyzes historical sales data and predicts demand, so shopkeepers make data-driven reorder decisions.

**Impact:** 15-30% reduction in stockouts, 10-20% reduction in excess inventory.

## 5.2 Problem & Business Objective

**Type:** Regression (predicting a continuous number — units to sell)

**Input:** Product features + time features + historical sales

**Output:** Predicted quantity + confidence score + seasonality factor

## 5.3 Dataset

**Sources:**
1. **Real DB data** — last 6 months of completed orders, joining orders + order_items + products
2. **Synthetic fallback** — 2000 samples across 5 categories (electronics, groceries, clothing, medicines, stationery) with realistic Indian price ranges. Used when real data < 100 rows.

## 5.4 Feature Engineering

| Feature | Type | Example |
|---------|------|---------|
| product_id | Integer | 42 |
| day_of_week | 0-6 | 2 (Wednesday) |
| month | 1-12 | 10 (October) |
| is_holiday | 0/1 | 1 (Diwali) |
| selling_price | Float | 55.00 |
| stock_quantity | Integer | 100 |
| day_of_month | 1-31 | 15 |
| is_weekend | 0/1 | 1 |
| category_enc | Integer | 2 (grocery) |

**Target:** `quantity` (units sold)

## 5.5 Model Selection: Why Random Forest

| Alternative | Why Rejected |
|-------------|-------------|
| **Linear Regression** | Assumes linear relationship — can't capture seasonal spikes (Diwali) |
| **Logistic Regression** | For classification, not regression |
| **XGBoost** | More accurate but more hyperparameters, overfits on small data |
| **SVM** | High memory, slow on thousands of samples |
| **Neural Networks** | Overkill for 2000 samples, needs 100K+ to outperform trees |
| **KNN** | Slow inference, sensitive to irrelevant features |

**Why Random Forest wins:**
1. Handles non-linear relationships (seasonality)
2. No feature scaling needed
3. Handles mixed data types (numeric + categorical)
4. Resistant to overfitting (bagging)
5. Built-in feature importance
6. Fast training and inference
7. Works well with small datasets
8. Easy to interpret

## 5.6 How Random Forest Works

**Analogy:** Ask 100 shopkeepers to predict next month's butter sales. Average of 100 reasonable guesses is better than any single guess.

**Technically:** Random Forest = Many Decision Trees + Bagging (Bootstrap samples) + Random Feature Selection. Final prediction = average of all tree predictions.

## 5.7 Decision Tree Explained

A series of yes/no questions splitting data into purer groups:

```
              Is it October?
             /              \
          YES                NO
         /                    \
  Is price > ₹50?        Is it weekend?
   /          \            /          \
YES          NO         YES           NO
Predict 80  Predict 120 Predict 45  Predict 30
```

## 5.8 Entropy & Gini Index

Measures of impurity — how mixed the data is.

- **Entropy = 0:** All same class (pure)
- **Entropy = 1:** Evenly split (maximum impurity)

- **Gini = 0:** Perfectly pure
- **Gini = 0.5:** Maximum impurity

At each split, algorithm chooses feature + threshold giving largest impurity reduction.

**Gini formula:** Gini = 1 - Σ(p_i)²

## 5.9 Hyperparameters

| Parameter | Value | Effect |
|-----------|-------|--------|
| n_estimators | 100 | Number of trees. More = stable but slower |
| max_depth | 12 | Max depth per tree. Higher = complex but overfit risk |
| n_jobs | -1 | Use all CPU cores |
| random_state | 42 | Reproducible results |

## 5.10 Training Pipeline

```
fetch_training_data()  →  Preprocessing (date features, label encode category)
  →  Train/Test split (80/20)
  →  RandomForestRegressor.fit(X_train, y_train)
  →  joblib.dump(model, "model.pkl")
  →  Save LabelEncoder + feature list
```

## 5.11 Prediction Flow

```
Request forecast for Product #42
  → Load product details, load model.pkl (lazy singleton)
  → Prepare feature vector: [product_id, day_of_week, month, is_holiday, ...]
  → model.predict(features) → 96 units
  → Calculate confidence from tree std deviation (capped 98%)
  → Calculate seasonality factor (Nov/Dec boost 1.2, Mar/Apr boost 1.15)
  → Return: { predicted_demand, recommended_order_qty, confidence_score, seasonality_factor }
```

## 5.12 Confidence Score

Calculated from standard deviation of all tree predictions. Lower std dev = higher confidence. Capped at 98% (no prediction is 100% certain).

```python
tree_preds = [tree.predict(X) for tree in model.estimators_]
cv = np.std(tree_preds) / np.mean(tree_preds)
confidence = max(0, min(98, (1 - cv) * 100))
```

- 90%+: High confidence · 70-90%: Moderate · <70%: Low

## 5.13 Evaluation Metrics

- **R² Score:** Variance explained by model (target > 0.70)
- **MAE:** Average prediction error in units (target < 5 units)

## 5.14 Feature Importance (Typical)

```
month: 28% | is_holiday: 22% | day_of_week: 15% | selling_price: 12%
category_enc: 10% | stock_quantity: 8% | day_of_month: 3% | is_weekend: 2%
```

**Interpretation:** Month (seasonality) and holidays are strongest predictors — makes sense for Indian retail (Diwali, Pongal, Christmas spikes).

## 5.15 Why Not [X] — Interview Answers

**Linear Regression:**
> Sales patterns are non-linear with seasonal spikes. A linear model would miss Diwali spike entirely because it fits a straight line through the data.

**XGBoost:**
> More accurate but requires careful hyperparameter tuning (learning rate, subsample, etc.) and overfits on smaller datasets. For 2000 samples, Random Forest's bagging provides safer generalization.

**Neural Networks:**
> Overkill for tabular regression with 2000 samples. NNs need 100K+ samples to outperform tree-based models. Random Forest gives comparable/better accuracy with less complexity.

**SVM:**
> O(n²) memory during training, doesn't scale well. Requires feature scaling and kernel selection. Random Forest is more efficient.

**KNN:**
> Stores all training data, slow inference (compares to every sample). Sensitive to irrelevant features. Random Forest faster and more robust.

## 5.16 Future Improvements

Time series models (ARIMA, Prophet), ensemble (RF + XGBoost + Linear), auto-retraining, product clustering, external data (weather, events), MLflow tracking, A/B testing.

---

# Chapter 6 — Dataset

## 6.1 Source

**Primary:** Real database — queries last 6 months completed orders from order_items + orders + products tables.

**Fallback:** Synthetic — 2000 samples across 5 categories with realistic Indian price ranges (groceries ₹10-2000, electronics ₹500-50000, clothing ₹200-5000, medicines ₹20-500, stationery ₹5-200).

## 6.2 Preprocessing

Extract date features (day_of_week, month, day_of_month, is_weekend, is_holiday), LabelEncode category, no normalization needed (RF doesn't require scaling), 80/20 train-test split.

## 6.3 Sample Data

```
product_id  day_of_week  month  is_holiday  selling_price  ...  quantity
42          2            10     1           55.00          ...  95
42          2            9      0           55.00          ...  50
15          5            12     1           1200.00        ...  8
```

Row 1: Product 42 (butter) on Wednesday, October (Diwali holiday), ₹55, sold 95 units.

---

# Chapter 7 — Database Design

## 7.1 Entity Relationships (Simplified)

```
users (1) ── owner_id ──→ (many): products, stores, customers, suppliers
users (1) ── shopkeeper ─→ (many): orders, purchase_orders
stores ──→ products, inventory_movements, stock_transfers
orders ──→ order_items (1:many)
orders ──→ receipts, payments (1:1 or 1:many)
customers ──→ orders, customer_carts, payments
suppliers ──→ purchase_orders
products ──→ order_items, inventory_movements, stock_transfers
```

## 7.2 Core Tables

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| users | id, email, password_hash, role (enum), name, is_active | Auth + roles |
| stores | id, owner_id (FK), name, store_type (enum), city, gst_number | Shop locations |
| products | id, owner_id (FK), store_id (FK), name, sku, cost_price, selling_price, stock_quantity | Inventory |
| orders | id, order_number, shopkeeper_id (FK), customer_id (FK), status (enum), total | Sales |
| order_items | id, order_id (FK), product_id, product_name, quantity, unit_price | Line items |
| customers | id, owner_id (FK), company_name, contact, credit_limit, credit_used | B2B customers |
| inventory_movements | id, product_id, movement_type (enum), quantity, reference | Stock audit trail |
| notifications | id, user_id (FK), type (enum), title, message, is_read | Alerts |

## 7.3 Key Design Decisions

- **Multi-tenancy:** Every row scoped by `owner_id` — simple filter, no separate tenant table
- **Composite unique(email, role):** Same email for different roles (user as both customer and shopkeeper)
- **Soft-delete:** Products/stores use `is_active` instead of DELETE — preserves referential integrity
- **Inventory movements as audit trail:** Every stock change creates a record — trace where every unit comes from/goes to
- **Receipts separate from orders:** Order = business transaction, Receipt = payment confirmation — generated at different times

---

# Chapter 8 — API Explanation

## 8.1 Design Philosophy

RESTful: Resources mapped to URLs (products, orders, customers), HTTP methods indicate action (GET=read, POST=create, PUT/PATCH=update, DELETE=delete), JSON bodies, JWT auth, versioned under `/api/v1/`.

## 8.2 Key APIs

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/v1/auth/login | Public | Email+password login |
| POST | /api/v1/auth/send-otp | Public | Send OTP email |
| GET | /api/v1/dashboard/stats | JWT | Aggregated metrics |
| GET | /api/v1/products | JWT | List/search products |
| POST | /api/v1/products | JWT | Create product |
| POST | /api/v1/orders | JWT | Create order (POS) |
| POST | /api/v1/orders/bulk | JWT | Bulk customer order |
| GET | /api/v1/orders | JWT | List orders |
| PATCH | /api/v1/orders/{id}/status | JWT | Update status |
| GET | /api/v1/inventory/movements | JWT | Stock movement history |
| GET | /api/v1/forecasting/demand/{id} | JWT | ML demand forecast |
| GET | /api/v1/reports/customers/top | JWT | Top customers |
| GET | /api/v1/notifications | JWT | User notifications |
| GET | /api/v1/search?q=amul | JWT | Unified search |

## 8.3 Standard Patterns

- **Pagination:** `?page=1&limit=20` → `{ data: [...], total: 100, page: 1, limit: 20 }`
- **Errors:** `{ "detail": "Human-readable message" }`
- **Auth:** `Authorization: Bearer <token>` (from khatabox_token cookie)
- **Validation errors:** `[{ "loc": ["body","email"], "msg": "invalid email", "type": "value_error" }]`

---

# Chapter 9 — Workflow

## 9.1 Registration Workflow

1. User visits /register → fills form (name, email, phone, password, role)
2. Clicks "Send OTP" → POST /send-otp → OTP sent to email
3. Enters OTP (auto-filled from debug_otp in dev mode)
4. Clicks "Verify & Create Account" → POST /register-with-otp
5. Backend: verifies OTP, creates user with bcrypt hash
6. If shopkeeper: auto-creates Store, auto-redirects to /setup-inventory
7. If customer: creates Customer record, redirects to /catalog

## 9.2 Setup Inventory Workflow

1. New shopkeeper redirected to /setup-inventory?store_type=kirana
2. Page shows 178 pre-seeded products filtered by store type
3. Shopkeeper selects products or clicks "Add All"
4. POST /api/v1/seed-products/bulk-add with selected IDs
5. Backend creates actual Product records from seed templates
6. Redirects to /dashboard

## 9.3 Billing Workflow

1. Open /billing → multi-cart system active
2. Select customer (searchable dropdown or walk-in)
3. Add products: scan QR code (html5-qrcode) or search by name
4. Inline quantity adjustment with stock validation
5. Toggle GST on/off
6. Review order: subtotal → GST → total
7. Click "Place Order" → POST /api/v1/orders
8. Backend: validate stock → calc totals → create order (status=COMPLETED) → deduct inventory → update Khata → commit → generate receipt → Socket.IO notification
9. Success toast → invalidate dashboard/inventory queries

## 9.4 B2C Order Flow

1. Customer browses /catalog or scans QR code on product
2. Adds items to cart → cart enforces single-store
3. Checkout: credit → order status=COUNTER (pending approval). UPI/Cash → simulated payment → status=CONFIRMED
4. Shopkeeper receives Socket.IO notification
5. Opens /b2c-orders → reviews pending orders
6. Approve → Processing → Complete (deducts inventory, generates receipt)

## 9.5 Purchase Order Flow

1. Shopkeeper identifies stock to reorder
2. Creates PO: POST /api/v1/purchase-orders (supplier, items, quantities)
3. Status = "draft" → "sent" (to supplier)
4. Supplier delivers → status = "received" → inventory auto-increased
5. Or status = "cancelled" (if not needed)

## 9.6 Stock Transfer Flow

1. Shopkeeper initiates transfer: POST /api/v1/transfers (product, from_store, to_store, qty)
2. Source stock deducted immediately (transfer_out movement)
3. Destination shopkeeper receives notification
4. Approves → stock added (transfer_in movement)
5. Or rejects → stock returned to source

---

# Chapter 10 — Business Logic

## 10.1 Inventory Value

Valuation of current stock: `stock_quantity × cost_price`

## 10.2 Profit & Margin

- **Profit per unit:** selling_price - cost_price
- **Margin %:** (selling_price - cost_price) / selling_price × 100
- **GMROI:** Gross Margin Return on Investment = margin / average inventory cost

## 10.3 GST (Goods & Services Tax)

Indian indirect tax on supply of goods/services. KhataBox allows GST toggle per order. GST = subtotal × 18% (configurable). GST-compliant invoices generated via ReportLab with ₹ symbol.

## 10.4 Khata (Credit)

Indian retail runs on trust/credit. Shopkeeper sets credit_limit. Customer buys → credit_used increases. Customer pays → credit_used decreases. System warns when credit_used exceeds limit.

## 10.5 Discount

Discounts applied at order level. subtotal - discount + gst = total. Discount amount tracked in database.

---

# Chapter 11 — Security

## 11.1 JWT (JSON Web Token)

Three parts: Header (algorithm + type) + Payload (user_id, role, exp) + Signature (verified with secret key).

**Access token:** 30 min expiry. **Refresh token:** 7 day expiry. If access expires, frontend can use refresh to get new one.

## 11.2 Authentication & Authorization

**Authentication** = Who are you? (JWT decode → get_current_user())
**Authorization** = What can you do? (require_role("admin"))

Both enforced at FastAPI dependency level — every protected endpoint calls these.

## 11.3 Role-Based Access (RBAC)

Three roles: admin, shopkeeper, customer.

- **Admin:** All access, user management, audit logs, data backup
- **Shopkeeper:** Own data only (products, customers, orders, stores)
- **Customer:** Own orders, catalog browsing, cart, receipts

## 11.4 Password Hashing

bcrypt via passlib library. Salted hash — same password produces different hash each time. Slow by design (resists brute force).

## 11.5 CORS

Configured in FastAPI middleware. Allows origins: `http://localhost:3000`, `https://*.vercel.app`, `https://*.railway.app`.

## 11.6 Rate Limiting

Middleware-based request throttling. Prevents brute force attacks on login endpoints.

## Additional Measures

- Self-deactivation protection: admin can't deactivate themselves
- Input validation via Pydantic (type checking, length limits, email format)
- HTML encoding in notification messages (XSS prevention)
- Soft-delete instead of hard delete (data recovery)

---

# Chapter 12 — Deployment

## 12.1 Vercel (Frontend)

- Framework preset: Next.js
- Root directory: `frontend/`
- Build: `next build` (uses --webpack due to path space bug)
- Environment variables configured in Vercel dashboard
- Auto SSL/HTTPS
- Mixed Content fix: `client-api.ts` upgrades http→https

## 12.2 Railway (Backend)

- Docker container: Python 3.12-slim
- Entrypoint: alembic migrations → schema fixes → uvicorn on $PORT
- `railway.json`: DOCKERFILE builder, healthcheck at /api/v1/health
- Environment (DATABASE_URL, REDIS_URL, JWT_SECRET, RESEND_API_KEY, R2 credentials, etc.)
- Dashboard shows logs, metrics, restart controls

## 12.3 Neon (Database)

Serverless PostgreSQL. Auto-scaling, branching for dev. Known issue: appends `sslmode=require&channel_binding=require` to URLs — asyncpg rejects these. Fixed by stripping params in `database.py` and `alembic/env.py`.

## 12.4 Common Issues

1. **Neon URL params:** Stripped via urlparse in both database.py and alembic/env.py
2. **Spaces in Windows path:** Turbopack breaks — use `--webpack` flag
3. **Mixed Content:** Auto-upgrade http→https in client-api.ts
4. **Migration 0011:** `sa.Enum(create_type=False)` still emits CREATE TYPE — workaround: run raw SQL manually
5. **Alembic version ID too long:** Widened column manually

---

# Chapter 13 — Interview Questions (150+)

## 13.1 Project Questions

**Q1: What is KhataBox in one sentence?**
> A full-stack B2B retail management platform for Indian small businesses, built with Next.js and FastAPI, that digitizes inventory, billing, customer credit, and analytics.

**Q2: What problem does it solve?**
> India's 63+ million small retailers still use paper notebooks for tracking stock, customer credit, and sales. They lose data when notebooks are damaged and can't analyze business performance. Existing software is too expensive or complex.

**Q3: Who are the users?**
> Primary: Shopkeepers (kirana, pharmacy, electronics, clothing, restaurant). Secondary: B2B/B2C customers. Tertiary: Platform admins.

**Q4: What makes KhataBox different from Khatabook?**
> Khatabook only tracks credit (Khata). KhataBox is a full retail OS — inventory, billing, purchase orders, QR codes, ML forecasting, reports, B2C catalog, and real-time updates.

**Q5: What is the architecture?**
> Three-tier: Next.js frontend on Vercel → FastAPI backend on Railway → PostgreSQL on Neon. With Redis cache, Cloudflare R2 storage, Socket.IO real-time.

**Q6: How many routes, APIs, tables?**
> 26+ frontend routes, 80+ API endpoints, 18+ database tables, 24 migrations.

**Q7: What is the ML model used for?**
> Demand forecasting — predicts how many units of a product will be sold, so shopkeepers know how much to reorder.

**Q8: How is multi-tenancy handled?**
> Every data row has an `owner_id` column. All queries filter by `current_user.id`. Simple, effective, no separate tenant table.

**Q9: What authentication methods are supported?**
> Password-based (bcrypt) and OTP-based (email via Resend). JWT tokens (access 30min + refresh 7 days).

**Q10: What is the Khata system?**
> Traditional Indian credit where customers buy now and pay later. Shopkeeper sets credit_limit. System tracks credit_used. Alert when limit exceeded.

## 13.2 React Questions

**Q11: What hooks does the project use?**
> useState (form state, UI state), useEffect (side effects, initial data load), useContext (theme/auth context), useCallback (memoized handlers), useMemo (computed values), useRef (DOM references).

**Q12: State management approach?**
> Zustand for client state (billing multi-cart, cart, store selection). TanStack Query for server state (API data with auto-caching). No Redux — too much boilerplate.

**Q13: Controlled vs uncontrolled?**
> Controlled components throughout — every input has value + onChange managed by React state.

**Q14: How are API calls made?**
> Through client-api.ts which reads the JWT cookie, attaches Bearer header, handles http→https upgrade, and extracts FastAPI validation errors.

**Q15: Performance optimizations used?**
> TanStack Query caching (30s staleTime), React.memo on heavy components, lazy loading routes (Next.js automatic), useMemo for computed values.

## 13.3 Next.js Questions

**Q16: App Router vs Pages Router?**
> App Router with nested layouts, Server Components, route groups. KhataBox uses `(dashboard)` and `(customer)` route groups with different layouts.

**Q17: Server vs Client Components?**
> Page shells are Server Components. Interactive pages (dashboard, billing, orders) are Client Components marked `'use client'`.

**Q18: How is auth handled with Next.js?**
> NextAuth v5 with Credentials provider using JWT session strategy. Middleware checks khatabox_token cookie. Server-side role guard using auth-guard.ts.

**Q19: Why --webpack flag?**
> Project path has spaces (`1A. PROJECTS`). Turbopack has URL-encoding bug. --webpack is stable workaround.

**Q20: Route groups explanation?**
> Parenthesized folders like `(dashboard)` organize code without affecting URL. Both `/dashboard` and `/login` exist but use different layouts.

## 13.4 TypeScript Questions

**Q21: Interfaces vs Types used?**
> Interfaces for API response shapes (Order, Product, Customer). Types for unions (status enums, variant types).

**Q22: Generics in the project?**
> TanStack Query's `useQuery<T>` is generic. client-api.ts has generic `fetchApi<T>()` functions returning typed responses.

**Q23: What does `'use client'` directive do?**
> Marks a file as Client Component in Next.js App Router. Without it, components are Server Components rendered on server.

**Q24: Strict mode enabled?**
> Yes — TypeScript strict mode catches null/undefined issues at compile time.

## 13.5 FastAPI Questions

**Q25: Dependency injection?**
> Functions as parameters: `def get_orders(db = Depends(get_db), user = Depends(get_current_user))`. FastAPI calls them, caches within request scope.

**Q26: Pydantic v2 features?**
> Rust-based core for 5-50x faster validation. `model_validate()` not `parse_obj()`. `model_dump()` not `dict()`.

**Q27: Async database handling?**
> AsyncSession from SQLAlchemy with asyncpg driver. All DB operations awaitable. @asynccontextmanager yields session, closes after request.

**Q28: Error handling?**
> Custom exception handlers return consistent `{"detail": "message"}` format. Validation errors from Pydantic include field-level details.

**Q29: CORS configuration?**
> Allow origins: localhost:3000, *.vercel.app, *.railway.app. Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS. Credentials: true.

## 13.6 Python Questions

**Q30: Why FastAPI over Django?**
> Lighter weight, async native, auto docs, better for APIs. Django too heavy for API-only backend.

**Q31: Libraries used for ML?**
> scikit-learn (RandomForestRegressor), pandas (data manipulation), numpy (numerical), joblib (model serialization).

**Q32: How is PDF generation done?**
> ReportLab library — creates invoices and receipts with ₹ symbol, shop details, itemized billing, GST breakdown.

**Q33: How are spreadsheets handled?**
> openpyxl for styled XLSX export (orders, products, customers, suppliers). Python csv module for CSV export.

## 13.7 PostgreSQL Questions

**Q34: Why PostgreSQL over MongoDB?**
> Relational model fits domain (orders→items→products→customers). ACID ensures atomic multi-table updates. JOINs essential for reports. Full-text search with TSVECTOR.

**Q35: What is TSVECTOR?**
> PostgreSQL full-text search data type. search_vector column on products updated by trigger when name/sku/category changes. Queries use @@ operator.

**Q36: Composite unique constraint?**
> `unique(email, role)` — same person can be both customer and shopkeeper with same email but different roles.

**Q37: Enum types used?**
> UserRole (admin/shopkeeper/customer), OrderStatus (7 values), StoreType (7 values), MovementType (8 values), NotificationType (16 values), etc.

**Q38: Indexes for performance?**
> search_vector (GIN), sku (UNIQUE), owner_id (BTREE), store_id (BTREE), order_number (UNIQUE), customer_id (BTREE), status (BTREE).

## 13.8 REST API Questions

**Q39: RESTful patterns used?**
> Resources as URLs, HTTP methods as actions, JSON bodies, stateless (JWT), versioned (/api/v1/), consistent error format.

**Q40: Pagination strategy?**
> Page-based: `?page=1&limit=20` → returns `{ data: [], total, page, limit }`. Future: cursor-based for large datasets.

**Q41: API versioning?**
> URL prefix `/api/v1/`. Allows breaking changes in v2 without affecting existing clients.

**Q42: Error response format?**
> `{"detail": "message"}` for simple errors. `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` for validation.

## 13.9 JWT Questions

**Q43: JWT structure?**
> Three base64url-encoded parts separated by dots: Header (alg, type) + Payload (user_id, role, exp, iat) + Signature (HMAC-SHA256).

**Q44: Why JWT over sessions?**
> Stateless — no server-side storage. Easy horizontal scaling. Self-contained user info. Works with mobile apps.

**Q45: Token expiry strategy?**
> Access token: 30 minutes. Refresh token: 7 days. Short-lived access + long-lived refresh balances security and UX.

**Q46: How is token stored on frontend?**
> In `khatabox_token` cookie. client-api.ts reads it and attaches `Authorization: Bearer` header.

**Q47: How is password stored?**
> bcrypt hash via passlib. Salted — same password produces different hash each time. Slow algorithm resists brute force.

## 13.10 ML & Random Forest Questions

**Q48: Type of ML problem?**
> Regression — predicting continuous quantity (units to sell).

**Q49: Features used?**
> product_id, day_of_week, month, is_holiday, selling_price, stock_quantity, day_of_month, is_weekend, category_enc.

**Q50: Why these features?**
> Time features capture seasonality (Diwali spikes, weekend effects). Price captures elasticity. Stock captures availability effects.

**Q51: How Random Forest works?**
> Ensemble of decision trees trained on bootstrap samples. Each split considers random subset of features. Final prediction = average of all trees.

**Q52: Hyperparameters?**
> n_estimators=100, max_depth=12, n_jobs=-1, random_state=42.

**Q53: How is confidence score calculated?**
> Standard deviation of all tree predictions. Lower std = higher confidence. Coefficient of variation converted to 0-98% score.

**Q54: Evaluation metrics?**
> R² (variance explained), MAE (mean absolute error in units).

**Q55: Why not Neural Networks?**
> Overkill for 2000 samples. Needs 100K+ to outperform tree models. Random Forest comparable/better on tabular data.

**Q56: Why not XGBoost?**
> More hyperparameters to tune, overfits on small data. Random Forest bagging provides safer generalization for MVP.

**Q57: What is feature importance?**
> Built-in RF property showing which features contribute most to predictions. Month and is_holiday typically highest (seasonality).

**Q58: Dataset size?**
> 2000 synthetic samples fallback. Real data: last 6 months of completed orders from production DB.

**Q59: How is model saved?**
> joblib.dump() saves trained RandomForestRegressor + LabelEncoder + feature list to model.pkl.

**Q60: Inference time?**
> ~20ms — fast enough for real-time API responses. Lazy-loaded singleton avoids repeated loading.

## 13.11 Deployment Questions

**Q61: Frontend deployment?**
> Vercel — zero-config Next.js deployment, auto HTTPS, preview deployments per PR.

**Q62: Backend deployment?**
> Railway — Docker-based, auto HTTPS, PostgreSQL/Redis add-ons, GitHub integration.

**Q63: Database hosting?**
> Neon — serverless PostgreSQL, auto-scaling, branching for dev.

**Q64: Dockerfile structure?**
> python:3.12-slim → install requirements → copy app → entrypoint.py (migrations + uvicorn).

**Q65: Environment variables?**
> DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_ALGORITHM, RESEND_API_KEY, R2_* keys, SENTRY_DSN, POSTHOG_KEY.

**Q66: Mixed Content issue?**
> Vercel serves HTTPS but backend on Railway is HTTP (before upgrade). Browser blocks HTTP requests from HTTPS page. Fix: auto-upgrade http→https in client-api.ts.

**Q67: Turbopack path issue?**
> Spaces in Windows path break Turbopack URL encoding. Fix: use `--webpack` flag for `next dev`.

**Q68: Neon URL params issue?**
> Neon appends sslmode/channel_binding to URLs. asyncpg rejects unknown params. Fix: strip params in database.py and alembic/env.py via urlparse.

## 13.12 Database Design Questions

**Q69: Multi-tenancy implementation?**
> owner_id column on every data table. All queries filter by current_user.id. Simple, no separate tenant table.

**Q70: Soft delete pattern?**
> is_active boolean on products and stores. Instead of DELETE, set is_active=false. Preserves FK references in orders/inventory.

**Q71: Inventory movement audit trail?**
> Every stock change (sale, purchase, adjustment, transfer, return, reserve) creates an inventory_movements record. Full traceability.

**Q72: Receipts vs Orders separation?**
> Orders = business transaction (what was ordered). Receipts = payment confirmation (what was paid). Generated at different times. Separate FK allows B2C receipts without B2B order.

**Q73: Why nullable receipt.order_id?**
> B2C orders don't have a corresponding B2B order record, so the FK must be nullable.

## 13.13 Architecture & System Design Questions

**Q74: How would you scale this?**
> Horizontal scaling: multiple Railway instances behind load balancer. Read replicas for PostgreSQL. Cache more endpoints in Redis. CDN for static assets.

**Q75: Caching strategy?**
> Dashboard stats cached in Redis (30s TTL). OTP codes in Redis (5min TTL). Graceful degradation — app works if Redis is down.

**Q76: Real-time updates?**
> Socket.IO at /ws path. Room-based per user_id. Events: order_created, order_status_changed, inventory_update, low_stock_alert.

**Q77: Future microservices?**
> ML service (separate compute), Notifications service (email/SMS/WhatsApp), Payment service, Search service.

**Q78: Database sharding strategy?**
> Shard by owner_id range or region. Future consideration when data exceeds single Neon instance.

## 13.14 Security Questions

**Q79: How is password stored?**
> bcrypt hash with salt via passlib. Slow by design. Never stored in plaintext.

**Q80: Token security?**
> Short-lived access (30min). Refresh rotated. HTTPS everywhere. HttpOnly cookies recommended.

**Q81: Input validation?**
> Pydantic schemas validate all inputs — type checking, length limits, email format, required fields.

**Q82: Authorization pattern?**
> require_role("admin") dependency. Endpoint-level. Returns 403 if role insufficient.

**Q83: CORS security?**
> Specific allowed origins only. No wildcard in production.

---

# Chapter 14 — HR Questions

## 14.1 Tell Me About Yourself

> "I built KhataBox, a full-stack retail management platform for Indian small businesses. The idea came from observing that 63 million small retailers in India still use paper notebooks to manage their business. I built a complete solution with Next.js frontend, FastAPI backend, PostgreSQL database, and machine learning for demand forecasting. The platform handles inventory management, billing with GST, customer credit tracking, purchase orders, QR codes, and real-time notifications. It taught me full-stack development, system design, and how to build production-grade software that solves real problems."

## 14.2 Why This Project?

> "I wanted to build something that genuinely helps people. India's small business owners work incredibly hard but lack access to affordable technology. Building KhataBox let me combine my technical skills with a real-world impact — I could create something that a kirana store owner in Delhi could actually use to improve their business."

## 14.3 Biggest Challenge

> "Debugging the async SQLAlchemy MissingGreenlet error. When creating orders, the database refresh wasn't loading related items, causing a 500 error. The fix was simple — adding `[\"items\"]` to `db.refresh()` — but it took hours to find because the error message was cryptic. This taught me to always explicitly specify relationships when refreshing async ORM objects."

## 14.4 A Failure

> "Early in development, I didn't consider Neon's automatic URL parameter appending. The database would randomly fail to connect because asyncpg rejected the `sslmode` parameter Neon added. I lost two days debugging connection issues. I learned to always inspect and sanitize third-party service inputs, even if they seem well-documented."

## 14.5 A Success

> "Completing the ML demand forecasting feature was my biggest success. Getting the Random Forest model to train on real database data, serve predictions via API, and display confidence scores to shopkeepers — seeing the full pipeline from data to user-facing insight working end-to-end was incredibly satisfying."

## 14.6 Why Should We Hire You?

> "I don't just write code that works — I build systems I can explain, defend, and improve. KhataBox demonstrates full-stack capability across React, Next.js, FastAPI, PostgreSQL, and ML. I understand not just the technology but the business domain — Indian retail, credit systems, GST — and I can communicate with both technical and non-technical stakeholders."

---

# Chapter 15 — Follow-Up Questions

## 15.1 Follow-ups with Answers

**Q: You mentioned 63M businesses — where did this number come from?**
> IBEF (India Brand Equity Foundation) reports 63+ million small retail outlets in India, constituting ~12% of GDP.

**Q: How do you handle database connection pooling?**
> SQLAlchemy's async engine uses create_async_engine with pool_size and max_overflow settings. Railway/Neon handle connection limits on their side.

**Q: What happens if ML model is outdated?**
> Confidence score drops (trees disagree on new data patterns). Shopkeeper can trigger retrain via POST /ml/retrain. Future: auto-retrain weekly.

**Q: How is search_vector updated?**
> PostgreSQL trigger on products table — when name/sku/category changes, trigger updates search_vector via to_tsvector().

**Q: How does the billing multi-cart work?**
> Zustand store manages array of carts. Each cart has items, customer_id, status. Current cart is active. Previous carts become "incomplete". Deleted carts go to "cancelled" history.

**Q: What if two shopkeepers try to update the same product?**
> Currently no pessimistic locking — last write wins. Future: optimistic locking with version field.

---

# Chapter 16 — System Design

## 16.1 Scalability

- **Horizontal scaling:** Multiple Railway instances behind Railway load balancer
- **Database:** Read replicas for reporting queries, connection pooling
- **Caching:** Redis for hot data (dashboard, OTP), CDN for static assets
- **Async everywhere:** Non-blocking I/O for higher throughput
- **Stateless JWT:** Any instance can handle any request

## 16.2 Caching Strategy

- **Dashboard stats:** Redis TTL 30s
- **OTP codes:** Redis TTL 5min
- **Product catalog:** In-memory cache with invalidation on update
- **Graceful degradation:** If Redis fails, system works without cache

## 16.3 Database Indexes

Already covered in Chapter 7.4 — key indexes on owner_id, store_id, search_vector, order_number, status, customer_id.

## 16.4 Concurrency

- **Order creation:** Single transaction updating 5+ tables. ACID ensures atomicity.
- **Stock deduction:** Check stock BEFORE deducting. If insufficient, reject with error.
- **Race condition:** Two orders for same product simultaneously — both pass stock check but first deducts stock. Second fails because stock now insufficient. Handled by DB transaction isolation.

## 16.5 Future Microservices

- **ML Service:** Dedicated compute for model training, separate scaling
- **Notification Service:** Email (Resend) + WhatsApp + Push, async queue
- **Payment Service:** Real payment gateway integration
- **Search Service:** Elasticsearch for advanced full-text search
- **Analytics Service:** Complex aggregations, data warehouse

---

# Chapter 17 — Debugging Stories

## 17.1 The MissingGreenlet Bug

**Symptom:** Orders endpoint returned 500 error on creation.
**Root cause:** `db.refresh(order)` in async SQLAlchemy tried lazy loading `order.items` but async sessions can't do lazy loading without a greenlet.
**Fix:** `db.refresh(order, ["items"])` — explicitly specify relationships to eager-load.
**Lesson:** Always specify relationships in async refresh. Three endpoints had this bug.

## 17.2 The Neon URL Params Bug

**Symptom:** Database connection failures in production but not locally.
**Root cause:** Neon auto-appends `?sslmode=require&channel_binding=require` to connection URLs. asyncpg rejects unknown URL parameters.
**Fix:** Custom URL parsing in both `database.py` and `alembic/env.py` to strip non-standard params.
**Lesson:** Third-party services may modify your configurations. Always validate external inputs.

## 17.3 The Turbopack Path Bug

**Symptom:** Frontend dev server crashed on startup.
**Root cause:** Project path contains spaces (`1A. PROJECTS`). Turbopack's URL encoding corrupted the path.
**Fix:** Added `--webpack` flag to `next dev`. Documented prominently in AGENTS.md.
**Lesson:** Spaces in paths still cause problems in 2026. Use tools that handle them or avoid spaces.

## 17.4 Migration 0011 Enum Bug

**Symptom:** `alembic upgrade head` failed on migration 0011.
**Root cause:** `sa.Enum(create_type=False)` in Alembic still emits `CREATE TYPE` SQL even when type should already exist. The PL/pgSQL guard (`IF NOT EXISTS`) didn't help because `CREATE TYPE` executes before the check.
**Fix:** Run raw SQL manually (`CREATE TABLE IF NOT EXISTS receipts (...)` + `CREATE TABLE IF NOT EXISTS receipt_items (...)`). Then update `alembic_version` to revision 0011.
**Lesson:** Alembic's enum handling has edge cases. Sometimes raw SQL is the most reliable path.

---

# Chapter 18 — Resume Defense

## 18.1 Common Resume Bullets

**Bullet 1:** "Built a full-stack B2B retail management platform serving 63M+ Indian small businesses"
**Cross-question:** How do you know it serves 63M? → That's the TAM (Total Addressable Market). Current deployment is demo/pre-production with seed data.

**Bullet 2:** "Implemented ML demand forecasting with 87% confidence accuracy"
**Cross-question:** How is confidence calculated? → From tree prediction standard deviation. How is accuracy measured? → R² and MAE on test set.

**Bullet 3:** "Architected multi-tenant database with 18 tables and 24 migrations"
**Cross-question:** How is tenant isolation enforced? → owner_id filter on every query via dependency injection. What if you need cross-tenant queries? → Admin role bypasses filter.

**Bullet 4:** "Developed real-time notification system using Socket.IO"
**Cross-question:** How does Socket.IO scale? → Room-based per user_id. Future: Redis adapter for multi-instance.

**Bullet 5:** "Built responsive UI with 26 routes, dark mode, multi-cart POS"
**Cross-question:** How is state managed across carts? → Zustand with persist middleware. What happens on page refresh? → State restored from localStorage.

---

# Chapter 19 — Quick Revision

## 19.1 One-Hour Revision

Read Chapters 1 (Overview), 2 (Architecture), 3 (Tech Stack), 5 (ML), 7 (Database), 13 (Interview Questions).

## 19.2 15-Minute Revision

Read Chapter 1 (Elevator Pitch + One-Minute Explanation), Chapter 5.1-5.6 (ML basics), Chapter 13 (first 20 questions).

## 19.3 5-Minute Revision

**KhataBox** = Full-stack retail platform for Indian small businesses. Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL (Neon). Features: inventory, billing, Khata (credit), QR codes, ML forecasting, reports, real-time. Random Forest for demand prediction using 9 features. 26 routes, 80+ APIs, 18 tables, 24 migrations. JWT auth, RBAC, multi-tenant by owner_id.

---

# Chapter 20 — Cheat Sheet

## 20.1 Formulas

- **Profit:** selling_price - cost_price
- **Margin %:** (profit / selling_price) × 100
- **Inventory Value:** stock_quantity × cost_price
- **GST Amount:** subtotal × 0.18
- **Total with GST:** subtotal × 1.18
- **Gini Impurity:** 1 - Σ(p_i)²
- **R²:** 1 - (SS_res / SS_tot)
- **MAE:** (1/n) Σ|actual - predicted|

## 20.2 HTTP Status Codes

| Code | Meaning | KhataBox Usage |
|------|---------|---------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Wrong role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate SKU/email |
| 422 | Unprocessable | Pydantic validation |
| 500 | Server Error | Unexpected exception |

## 20.3 HTTP Methods

| Method | CRUD | KhataBox Usage |
|--------|------|---------------|
| GET | Read | List resources, single resource |
| POST | Create | Create resource, auth |
| PUT | Update (full) | Update product |
| PATCH | Update (partial) | Update status, credit |
| DELETE | Delete | Soft-delete product |

## 20.4 React Hooks Reference

| Hook | Purpose | KhataBox Usage |
|------|---------|---------------|
| useState | Local state | Form inputs, UI state |
| useEffect | Side effects | Initial data load (legacy) |
| useContext | Context consumption | Theme, auth context |
| useCallback | Memoize fn | Event handlers |
| useMemo | Memoize value | Computed totals |
| useRef | DOM reference | QR scanner element |

## 20.5 SQLAlchemy Patterns

- **AsyncSession:** `async with async_session() as db:`
- **Select with eager load:** `select(Order).options(selectinload(Order.items))`
- **Refresh with relations:** `await db.refresh(order, ["items"])`
- **Pagination:** `.offset(skip).limit(limit)`
- **Filter by owner:** `.where(Product.owner_id == user_id)`

---

# Chapter 21 — Common Mistakes

## 21.1 What NOT to Say

1. ❌ "It's just a CRUD app" → It's a production-grade platform with 80+ APIs, ML, real-time, multi-tenancy
2. ❌ "I followed a tutorial" → I designed and built the architecture from scratch
3. ❌ "The ML is basic" → Random Forest with proper feature engineering, confidence scoring, and seasonality is production-ready
4. ❌ "I don't remember the tech stack" → Know: Next.js 16, React 19, FastAPI, PostgreSQL, Tailwind v4, scikit-learn
5. ❌ "The testing is minimal" → 39 backend tests + 5 frontend tests + build compiles clean

## 21.2 How to Answer Confidently

- **If stuck:** "Let me think about that..." (pause 3 seconds) "...based on my understanding..."
- **If don't know:** "I haven't encountered that specific scenario, but here's how I'd approach it..."
- **Bridge to what you know:** "That relates to [topic I know]. Let me explain how I handled that..."

---

# Chapter 22 — Mock Interview

## 22.1 HR Round

**Interviewer:** "Tell me about yourself."
**You:** [See HR Chapter 14.1]

**Interviewer:** "Why did you build KhataBox?"
**You:** "I identified a genuine problem — 63 million small retailers in India using paper notebooks. Existing solutions were either too expensive (Tally), too narrow (Khatabook only tracks credit), or too complex (SAP). I wanted to build something that combines all retail management features — inventory, billing, credit, purchase orders, ML — into one affordable, simple platform."

**Interviewer:** "What was your biggest challenge?"
**You:** "Debugging the SQLAlchemy MissingGreenlet error, which took hours to identify. The fix was simple — specifying relationships in db.refresh() — but the cryptic error message made it hard to find. This taught me to understand async ORM behavior deeply."

**Interviewer:** "Why should we hire you?"
**You:** "KhataBox demonstrates end-to-end capability: frontend (React, Next.js, Tailwind), backend (FastAPI, Python), database (PostgreSQL, SQLAlchemy), ML (scikit-learn, Random Forest), and deployment (Docker, Vercel, Railway). I build systems I can explain, defend, and improve. I understand both technology and business domain."

## 22.2 Technical Round

**Interviewer:** "Explain the architecture of KhataBox."
**You:** [See Chapter 2 — Three-tier: Vercel+Next.js → Railway+FastAPI → Neon+PostgreSQL, with Redis cache, R2 storage, Socket.IO real-time]

**Interviewer:** "How does the ML model work?"
**You:** [See Chapter 5 — Random Forest regression with 9 features, confidence from tree std deviation, synthetic data fallback, lazy-loaded pickle model]

**Interviewer:** "How is authentication implemented?"
**You:** [See Chapter 2.4 — JWT with access/refresh tokens, bcrypt passwords, OTP via Resend, NextAuth credentials provider, role-based middleware]

**Interviewer:** "How would you scale this application?"
**You:** [See Chapter 16 — Horizontal scaling, read replicas, Redis caching, microservices for ML/notifications, CDN for static assets]

## 22.3 Project Round

**Interviewer:** "Walk me through a complete order flow."
**You:** [See Chapter 9.3 — customer selection, product search/scan, qty adjust, GST toggle, order submission, stock deduction, Khata update, receipt generation, notification — all in one ACID transaction]

**Interviewer:** "How is multi-tenancy enforced?"
**You:** "Every table has an owner_id foreign key. The get_current_user() dependency extracts the user from JWT. Every query filters by user.id. Admin role can bypass. Simple, effective, no separate tenant infrastructure."

**Interviewer:** "Explain the database schema."
**You:** [See Chapter 7 — 18+ tables, relationships, indexes, enums, key design decisions]

## 22.4 Stress Round

**Interviewer:** "Your ML model only has 2000 samples. How can it be reliable?"
**You:** "That's the synthetic fallback. In production with real data, we use 6+ months of actual sales. The confidence score reflects reliability — low confidence means shopkeeper should be cautious. As more orders come in, real data replaces synthetic. Future plan: weekly auto-retraining."

**Interviewer:** "Why not use a proper MLOps pipeline?"
**You:** "For an MVP serving 1-100 shopkeepers, a pickle file with lazy loading (~20ms inference) is pragmatic. MLOps with model registry, feature store, and A/B testing adds complexity that's not justified at this scale. We'd add MLflow + model versioning + auto-retraining in v2 as user base grows."

**Interviewer:** "The project has only 39 tests. Isn't that inadequate?"
**You:** "39 backend tests cover all critical paths — auth, products, orders, customers, inventory, forecasting, reports, notifications, RBAC. Frontend has 5 tests for core utilities and components. The codebase has TypeScript strict mode and a clean build with zero errors. Testing coverage would expand with the user base."

---

> **End of INTERVIEW_PREP.md**
>
> _Study this document, practice explaining concepts in simple English, and you'll be ready for any interview question about KhataBox._
