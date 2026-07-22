# KhataBox -- Deployment Checklist

> Step-by-step production deployment plan. Complete items in order.
> Legend: [OK] Ready . [SETUP] Needs Setup . [WARN] Needs Work

---

## Phase 0: Pre-Flight Checks

- [ ] Run `alembic upgrade head` locally to verify all 17 migrations apply cleanly.
- [ ] Run `python seed_india.py` to verify seed data populates without error.
- [ ] Run `pytest -v` (on Linux) to confirm test results: 29 pass, 11 fail, 4 error (failures/errors are pre-existing, mainly data ownership checks and missing endpoints).
- [ ] Run `cd frontend && npm run build` (frontend) to confirm 20 routes build with no errors/warnings.
- [ ] Generate strong secrets:
  - `AUTH_SECRET`: `openssl rand -base64 32`
  - `SECRET_KEY`: `openssl rand -hex 32`
- [ ] Verify OTP auth setup: ensure `RESEND_API_KEY` is configured for production, or `debug_otp` fallback is disabled.

---

## Phase 1: Database -- Neon PostgreSQL

**Ready: [OK]**

- [ ] Create Neon project (`khatabox`).
- [ ] Copy pooled connection string.
- [ ] Set `DATABASE_URL` in Railway environment variables.
- [ ] After deployment: run `alembic upgrade head` via Railway shell or a one-off task.

### Files to verify
- `backend/app/core/database.py` -- uses `settings.DATABASE_URL`
- `backend/alembic.ini` -- pre-set for local; Railway ignores this in favor of env var

---

## Phase 2: Backend -- Railway

**Ready: [OK] (Dockerfile exists)**

### Railway setup
- [ ] Create new Railway project from `khatabox/backend`.
- [ ] Set **Health Check Path** to `/health`.
- [ ] Enable **Public Networking** -> note domain.
- [ ] Add **all env vars** from `backend/.env.example`.
- [ ] Trigger deploy.

### Post-deploy verification
- [ ] `curl https://khatabox-api.up.railway.app/health` returns `{"status":"ok"}`.
- [ ] `curl https://khatabox-api.up.railway.app/docs` returns Swagger UI.

---

## Phase 3: Redis -- Upstash

**Ready: [OK] (graceful degradation coded)**

- [ ] Create Upstash Redis database.
- [ ] Convert REST URL -> connection string.
- [ ] Set `REDIS_URL` in Railway env vars.
- [ ] Verify: caching on dashboard endpoint activates (check response headers).

---

## Phase 4: File Storage -- Cloudflare R2

**Ready: [OK] (graceful degradation coded)**

- [ ] Create R2 bucket (`khatabox`).
- [ ] Enable public access.
- [ ] Create API token (Admin read/write).
- [ ] Set the 5 `R2_*` env vars in Railway.
- [ ] Verify: upload a product image via `POST /api/v1/products/1/image`.

---

## Phase 5: Email -- Resend (OTP & Notifications)

**Ready: [OK] (graceful degradation coded)**

- [ ] Sign up at Resend, verify sending domain.
- [ ] Create API key.
- [ ] Set `RESEND_API_KEY` in Railway env vars.
- [ ] (Optional) Update sender address in `backend/app/services/email.py`.
- [ ] Verify: trigger OTP send, check inbox. In dev mode, `debug_otp` is returned in the response.

---

## Phase 6: Error Tracking -- Sentry

**Ready: [OK] (graceful degradation coded)**

- [ ] Create Sentry project (FastAPI).
- [ ] Copy DSN.
- [ ] Set `SENTRY_DSN` in Railway env vars.
- [ ] Verify: trigger a 500 error -- check Sentry dashboard in ~1 minute.

---

## Phase 7: Analytics -- PostHog

**Ready: [OK] (graceful degradation coded)**

- [ ] Create PostHog project.
- [ ] Copy project API key.
- [ ] Set `POSTHOG_API_KEY` and `POSTHOG_HOST` in Railway env vars.
- [ ] Verify: make a few API calls, check PostHog live events.

---

## Phase 8: Frontend -- Vercel

**Ready: [OK] (builds clean)**

### Vercel setup
- [ ] **Add New Project** -> import `khatabox` from GitHub.
- [ ] **Root Directory** -> `.` (project root, auto-detected).
- [ ] **Framework Preset** -> `Next.js`.
- [ ] **Build and Output Settings** -> defaults.
- [ ] **Environment Variables**:
  - `NEXT_PUBLIC_API_URL` = `https://khatabox-api.up.railway.app`
  - `AUTH_SECRET` = generated secret
  - `AUTH_URL` = Vercel URL (e.g., `https://khatabox.vercel.app`)
- [ ] Deploy.

### Post-deploy verification
- [ ] Visit `https://khatabox.vercel.app/login` -- page loads.
- [ ] Log in -- redirects to dashboard.
- [ ] Visit all 20 routes -- no 404s or 500s.

---

## Phase 9: Post-Deployment Hardening

### Security
- [ ] **CORS** -- verify `CORS_ORIGINS` includes only the Vercel frontend domain.
- [ ] **Rate limiting** -- confirm 100 req/min sliding window is active (test with 101 rapid requests).
- [ ] **JWT expiry** -- `ACCESS_TOKEN_EXPIRE_MINUTES=30` (consider lowering to 15).
- [ ] **Refresh token** -- `REFRESH_TOKEN_EXPIRE_DAYS=7`.
- [ ] **Sentry PII** -- `send_default_pii=False` in `main.py`.
- [ ] **Secrets** -- verify `AUTH_SECRET` and `SECRET_KEY` are unique, long, random.

### Performance
- [ ] Enable Redis -- verify dashboard caching is active.
- [ ] Verify `X-Response-Time` headers are present on all API responses.
- [ ] Run Lighthouse audit on frontend (expect 80+ performance score).

### Monitoring
- [ ] Set up Sentry alert for 500 error rate > 1%.
- [ ] Set up Railway alert for CPU > 80%.
- [ ] Set up Neon alert for storage > 80%.

### Backup
- [ ] Test `GET /api/v1/data/backup/export` -> returns JSON.
- [ ] If R2 configured: test `POST /api/v1/data/backup/export-r2` -> backup uploaded to R2.
- [ ] Schedule periodic backups (e.g., cron job hitting export endpoint daily).

---

## Phase 10: DNS & Custom Domain (Optional)

- [ ] Point `api.khatabox.app` CNAME -> Railway domain.
- [ ] Point `app.khatabox.app` CNAME -> Vercel domain.
- [ ] Update `CORS_ORIGINS` to include custom domain.
- [ ] Update `AUTH_URL` to custom domain.
- [ ] Update Resend sender domain.
- [ ] Update R2 public URL (if using custom domain on R2).

---

## Rollback Plan

### Backend
1. Railway **Settings -> Rollback** to previous deployment version.
2. If DB migration caused the issue: restore DB from last backup, then rollback code.

### Frontend
1. Vercel **Deployments -> ... -> Rollback to Production** to previous deployment.

### Database
1. `GET /api/v1/data/backup/export` -- manual export before risky changes.
2. R2-backed: `POST /api/v1/data/backup/export-r2` exports to R2 bucket.
3. Restore: `POST /api/v1/data/backup/import` with backup JSON body.

---

## Verification Checklist (Final)

| Check | Expected |
|-------|----------|
| `GET /health` | `{"status":"ok"}` |
| Login via credentials | Returns JWT tokens |
| Dashboard loads | 5 metric cards, charts render |
| Product CRUD | Create/Read/Update/Delete work |
| Billing scan -> order | QR code scans, order created |
| Customer B2B catalog | Grid loads, cart works, checkout succeeds |
| QR batch print | Label page renders with 3x6 grid |
| Reports page | All 3 customer report cards load data |
| Mobile width (<768px) | Bottom nav visible, page layout adapts |
| Image upload | Product accepts image file, returns URL |
| Rate limit | 429 after 100+ rapid requests |
| OTP login | OTP sent via email (or `debug_otp` in dev) |
