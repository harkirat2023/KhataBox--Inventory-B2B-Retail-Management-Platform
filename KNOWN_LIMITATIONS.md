# Known Limitations

This document lists known limitations and areas for improvement in the KhataBox platform. These are honest observations based on the current codebase.

---

## Testing

- **No end-to-end (E2E) frontend tests.** Only 5 frontend unit tests exist in `src/test/` (Vitest). No Playwright or Cypress tests cover user flows.
- **Backend tests are integration-only.** The 39 tests in `tests/test_api.py` use a live subprocess uvicorn server and a real database. There are no unit tests for individual services or models.
- **Test reliability on Windows.** `Event loop is closed` errors occur on Windows Python 3.14. The test suite is best run on Linux/macOS or WSL2.

## Infrastructure

- **Docker Compose limited to PG + Redis.** The backend and frontend are not containerized in `docker-compose.yml`. They must be run natively or deployed separately on Railway/Vercel.
- **Port mismatch.** The Dockerfile exposes port 8000 (`EXPOSE 8000`), but local development runs on port 8002. The `Dockerfile` CMD respects `$PORT` for Railway, but this inconsistency can cause confusion.
- **Health check path mismatch.** `railway.json` expects `/api/v1/health`, but the actual endpoint is at `/health` in `main.py:66`. Manual configuration is needed on Railway.

## Frontend

- **Customer route group pages at root level.** Customer-facing pages like `src/app/catalog/`, `src/app/cart/`, `src/app/scan/`, `src/app/customer/`, `src/app/my-orders/`, and `src/app/receipts/` are at the root route level rather than inside a `(customer)` route group. Only `src/app/(customer)/` exists as an empty route group.
- **No loading or Suspense boundaries.** Most dashboard pages use `useState`/`useEffect` for data fetching without React Suspense boundaries or loading skeletons (at the page level).
- **TanStack Query not used in practice.** While `@tanstack/react-query` is installed and its provider wraps the app, most pages use raw `useState`/`useEffect` with the client API helper instead of React Query hooks.
- **No `proxy.ts` file.** The project structure documentation references `src/proxy.ts` for route guarding, but this file does not exist. Route guarding is handled by `requireAuth()` in `src/lib/auth-guard.ts` and the `(dashboard)/layout.tsx`.
- **NextAuth v5 is still in beta.** Version `5.0.0-beta.31` is used. APIs may change between minor versions.

## Backend

- **All seed data is Indian-specific.** Store names, customer names, product categories, and address formats are hardcoded for India. Adapting for other regions requires seed script changes.
- **Rate limiter is best-effort.** The in-memory fallback resets on server restart and is not shared across multiple replicas.
- **Task queue is minimal.** `task_queue.py` implements a simple Redis FIFO queue. There is no retry logic, dead-letter queue, or worker pool. For production workloads, a dedicated task queue (Celery, RQ, or BullMQ) is recommended.

## Machine Learning

- **Simple Random Forest model.** The ML model uses `sklearn.ensemble.RandomForestRegressor` trained on 2,000 synthetic data points. It is not deep learning and does not capture complex temporal patterns (no LSTM/GRU).
- **Synthetic training data.** The model is trained on procedurally generated data, not real historical sales data. Real-world accuracy may vary significantly until retrained on actual transaction data.
- **No online learning or automatic retraining.** The model must be manually retrained by running `train.py`. There is no scheduled retraining pipeline.

## Database

- **No connection pooling configuration beyond defaults.** `create_async_engine` uses default pool settings. For high-concurrency production deployments, pool size and overflow limits may need tuning.
- **No read replicas.** All queries hit the primary database instance. Read-heavy workloads could benefit from read replicas.

## Security

- **Rate limiter is per-IP, not per-user.** Token-based rate limiting (per authenticated user) is not implemented.
- **No API key support for third-party integrations.** All API access requires JWT-based user authentication. There is no machine-to-machine API key mechanism.

## Missing Features

- **No mobile application.** The frontend is a responsive web app designed for desktop and mobile browsers. No native iOS or Android apps exist.
- **No payment gateway integration.** Payments are recorded as `cash`, `card`, `upi`, or `credit` but no real payment processing is implemented.
- **No barcode scanner.** QR codes are supported for product identification, but barcode (EAN/UPC) scanning is not implemented.
- **No offline mode.** The application requires a network connection. There is no PWA or offline-first capability.
- **No email delivery in development.** The `Resend API key` is only configured in production. Local development does not send emails.
- **No user self-service for password reset.** Password changes require backend/database access.
