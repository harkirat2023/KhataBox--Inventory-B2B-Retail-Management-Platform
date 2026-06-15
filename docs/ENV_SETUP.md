# KhataBox — Environment Setup Guide

> Guides for provisioning and configuring all 8 external services required for production.
> Each section below is independent — skip services whose features you don't need.

---

## 1. Neon PostgreSQL (Database)

**Pricing:** Free tier (0.5 GB, 1 project)
**URL:** https://console.neon.tech

### Steps

1. Create a Neon account and project named `khatabox`.
2. Copy the connection string from **Dashboard → Connection Details → Pooled**.
3. Replace the placeholders:
   ```
   postgresql+asyncpg://user:password@ep-xxxx.us-east-2.aws.neon.tech/khatabox?sslmode=require
   ```
4. Set as `DATABASE_URL` in backend `.env`.

### Post-Setup

After deployment, run from the backend directory:
```bash
alembic upgrade head
python seed.py
```

---

## 2. Upstash Redis (Caching + Task Queue)

**Pricing:** Free tier (10 MB, 1000 commands/day)
**URL:** https://console.upstash.com

### Steps

1. Create a Redis database named `khatabox-cache` (global, TLS enabled).
2. Copy the **UPSTASH_REDIS_REST_URL** from the **REST API** section.
3. Convert to connection string format:
   ```
   rediss://default:<UPSTASH_REDIS_REST_TOKEN>@<endpoint>.upstash.io:6379
   ```
4. Set as `REDIS_URL` in backend `.env`.

### Verification

The app degrades gracefully without Redis — caching and task queue become no-ops.

---

## 3. Cloudflare R2 (File Storage)

**Pricing:** Free tier (10 GB storage, 1M Class A ops/month)
**URL:** https://console.cloudflare.com → R2

### Steps

1. Create an R2 bucket named `khatabox`.
2. **Settings → Public Access** → Enable public access, note the public URL.
3. **Manage R2 API Tokens** → Create token with Admin Read+Write permissions.
4. Fill in the 5 R2 env vars:

| Variable | From |
|----------|------|
| `R2_ENDPOINT_URL` | Bucket → Settings → S3 API → `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Token details |
| `R2_SECRET_ACCESS_KEY` | Token details |
| `R2_BUCKET_NAME` | `khatabox` |
| `R2_PUBLIC_URL` | Bucket → Settings → Public URL → `https://pub-xxxx.r2.dev` |

---

## 4. Resend (Email)

**Pricing:** Free tier (100 emails/day)
**URL:** https://resend.com

### Steps

1. Sign up, verify a domain (e.g., `khatabox.app`).
2. **API Keys** → Create key with `sending` permission.
3. Copy the key (starts with `re_`).
4. Set as `RESEND_API_KEY` in backend `.env`.
5. Update the sender address in `backend/app/services/email.py:11` if using a custom domain:
   ```python
   "from": "KhataBox <notifications@yourdomain.com>",
   ```

---

## 5. Sentry (Error Tracking)

**Pricing:** Free tier (5k events/month)
**URL:** https://sentry.io

### Steps

1. Create a Sentry account and **Projects → Create Project → FastAPI**.
2. Copy the DSN (starts with `https://`).
3. Set as `SENTRY_DSN` in backend `.env`.
4. The SDK is already initialized in `app/main.py:21-26` with `traces_sample_rate=0.2`.

---

## 6. PostHog (Product Analytics)

**Pricing:** Free tier (1M events/month, 1 project)
**URL:** https://us.posthog.com

### Steps

1. Create a PostHog project.
2. **Project Settings → Project API Key** → Copy `phc_...` key.
3. Set as `POSTHOG_API_KEY` in backend `.env`.
4. Leave `POSTHOG_HOST` as `https://us.i.posthog.com` (or EU: `https://eu.posthog.com`).

---

## 7. Railway (Backend Hosting)

**Pricing:** Free tier ($5 credit, ~$0.002/hr)
**URL:** https://railway.app

### Steps

1. **New Project → Deploy from GitHub repo** → select `khatabox/backend`.
2. Railway auto-detects the `Dockerfile`.
3. **Settings → Health Check Path** → `/health`.
4. **Settings → Public Networking** → Enable, note the generated domain (e.g., `khatabox-api.up.railway.app`).
5. **Variables** → Add all variables from `backend/.env.example`.
6. Set `NEXT_PUBLIC_API_URL` in frontend `.env.local` to the Railway domain.

---

## 8. Vercel (Frontend Hosting)

**Pricing:** Free tier (100 GB bandwidth, 6000 build minutes/month)
**URL:** https://vercel.com

### Steps

1. **Add New Project → Import Git Repository** → select `khatabox`.
2. **Root Directory** → `.` (project root).
3. **Framework Preset** → `Next.js` (auto-detected).
4. **Environment Variables** → Add from `.env.example`:
   - `NEXT_PUBLIC_API_URL` = Railway URL
   - `AUTH_SECRET` = a random 32+ char base64 string
   - `AUTH_URL` = Vercel deployment URL
5. **Build Command** → `next build` (default).
6. Deploy.

---

## Quick Reference: All Env Vars

### Backend (`backend/.env`)

| Variable | Required | Default | Service |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | — | Neon |
| `SECRET_KEY` | ✅ | — | Auth |
| `ALGORITHM` | ❌ | `HS256` | Auth |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | `30` | Auth |
| `REFRESH_TOKEN_EXPIRE_DAYS` | ❌ | `7` | Auth |
| `REDIS_URL` | ❌ | — | Upstash |
| `RESEND_API_KEY` | ❌ | — | Resend |
| `SENTRY_DSN` | ❌ | — | Sentry |
| `POSTHOG_API_KEY` | ❌ | — | PostHog |
| `POSTHOG_HOST` | ❌ | `https://us.i.posthog.com` | PostHog |
| `CORS_ORIGINS` | ✅ | — | CORS |
| `R2_ENDPOINT_URL` | ❌ | — | R2 |
| `R2_ACCESS_KEY_ID` | ❌ | — | R2 |
| `R2_SECRET_ACCESS_KEY` | ❌ | — | R2 |
| `R2_BUCKET_NAME` | ❌ | `khatabox` | R2 |
| `R2_PUBLIC_URL` | ❌ | — | R2 |

### Frontend (`.env.local`)

| Variable | Required | Default | Service |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ | — | Railway |
| `AUTH_SECRET` | ✅ | — | NextAuth |
| `AUTH_URL` | ✅ | — | Vercel |
