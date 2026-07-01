# KhataBox — Roadmap

Future development roadmap organized by short-term, mid-term, and long-term goals.

---

## Short-Term (1-3 months)

### Testing & Quality

- Add end-to-end tests with Playwright covering critical user flows (login, order creation, customer checkout).
- Expand backend test coverage with unit tests for individual services and models (not just integration tests).
- Add frontend component tests for all UI components.
- Fix test flakiness on Windows (event loop closed errors).

### Developer Experience

- Set up CI/CD pipeline (GitHub Actions) with automated test runs, linting, and type checking.
- Add pre-commit hooks for linting and formatting.
- Containerize backend and frontend in Docker Compose for full local development parity.

### Frontend Polish

- Add loading states and Suspense boundaries to all dashboard pages.
- Replace raw `useState`/`useEffect` data fetching with TanStack Query hooks for caching and background refetch.
- Add `proxy.ts` route guard file for consistent server-side route protection.
- Move customer-facing pages (`/catalog`, `/cart`, `/scan`, `/customer`, `/my-orders`, `/receipts`) into a `(customer)` route group.

### Documentation

- Complete API documentation with request/response examples for all 19 endpoint groups.
- Add inline code documentation for complex service logic.
- Create architecture decision records (ADRs) for major design decisions.

---

## Mid-Term (3-6 months)

### Barcode Support

- Implement barcode (EAN/UPC) scanning via device camera.
- Add barcode generation for product labels alongside QR codes.
- Integrate `html5-qrcode` library (already in dependencies) for scanning.

### Payment Gateway

- Integrate Razorpay or Stripe for online payment processing.
- Add `payment_status` field to orders (pending, paid, failed, refunded).
- Implement webhook handling for payment confirmations.

### Offline Support

- Convert the application to a Progressive Web App (PWA) with service worker.
- Implement offline-first data sync for product catalog and order creation.
- Use IndexedDB for local data storage when offline.
- Background sync for orders when connectivity is restored.

### Mobile Application

- Build a companion mobile app using React Native.
- Core features: QR scanning, order management, inventory lookup, notifications.
- Share API client code with the web frontend where possible.

### Performance

- Implement database connection pooling with PgBouncer or built-in SQLAlchemy pool tuning.
- Add Redis caching to frequently accessed endpoints (product list, catalog, suppliers).
- Implement database read replicas for report-heavy queries.
- Add server-side pagination to all list endpoints with cursor-based pagination.

### Admin Features

- Add password reset flow (email-based).
- Add user self-service for profile management.
- Build an admin dashboard with system-wide analytics.

---

## Long-Term (6-12 months)

### Advanced AI / ML

- Replace synthetic training data with real historical sales data for demand forecasting.
- Experiment with time-series models (Facebook Prophet, LSTM) for better accuracy.
- Implement automated model retraining pipeline (scheduled job).
- Add inventory optimization: suggest optimal stock levels based on lead time, demand variance, and service level targets.
- Implement anomaly detection for unusual order patterns (potential fraud or data entry errors).

### Multi-Language Support

- Internationalize the frontend with `next-intl` or similar i18n library.
- Support Hindi, Marathi, Tamil, Telugu, and Bengali.
- RTL layout support where needed.

### Marketplace / Supplier Network

- Build a supplier marketplace where shopkeepers can discover and compare suppliers.
- Add automated purchase order generation based on reorder points and ML forecasts.
- Implement supplier rating and review system.

### ERP Integration

- Build integration adapters for popular Indian accounting software: Tally, Zoho Books, Busy.
- Two-way sync for invoices, payments, and inventory.
- Standard API for third-party integrations (webhooks + API keys).

### Infrastructure & Scaling

- Migrate to Kubernetes for container orchestration if backend complexity grows.
- Implement blue-green deployments for zero-downtime releases.
- Add feature flags for gradual rollout of new features.
- Set up comprehensive monitoring with dashboards (Grafana + Prometheus).

### Community & Open Source

- Publish contribution guidelines with good first issues for new contributors.
- Create developer documentation portal.
- Set up community discussion forum or Discord server.

---

## Non-Goals (Explicitly out of scope)

- Building a social network or customer-facing marketplace.
- POS (Point of Sale) hardware integration.
- In-house payment processing or banking.
- AI-powered chatbot or customer support automation.
- Replacement for accounting software (KhataBox is complementary, not a replacement).
