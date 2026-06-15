# KhataBox Interview Q&A

> 150+ Interview Questions Covering React, Next.js, TypeScript, FastAPI, Python, PostgreSQL, SQLAlchemy, Auth, RBAC, Redis, Socket.IO, Cloudflare R2, Resend, ML Forecasting, System Design, Scalability & Deployment

---

## Table of Contents

1. [React](#1-react-questions)
2. [Next.js](#2-nextjs-questions)
3. [TypeScript](#3-typescript-questions)
4. [FastAPI & Python](#4-fastapi--python-questions)
5. [PostgreSQL & SQLAlchemy](#5-postgresql--sqlalchemy-questions)
6. [Authentication & RBAC](#6-authentication--rbac-questions)
7. [Redis & Caching](#7-redis--caching-questions)
8. [Socket.IO & Real-Time](#8-socketio--real-time-questions)
9. [Cloudflare R2 & File Storage](#9-cloudflare-r2--file-storage-questions)
10. [Resend & Email](#10-resend--email-questions)
11. [ML Forecasting](#11-ml-forecasting-questions)
12. [System Design](#12-system-design-questions)
13. [Scalability](#13-scalability-questions)
14. [Deployment](#14-deployment-questions)
15. [Testing](#15-testing-questions)

---

## 1. React Questions

### Q1. Why does every page in KhataBox use the `"use client"` directive?

**Short Answer:** Every page uses `"use client"` because the app relies heavily on browser-only APIs — Zustand state persistence, Auth.js session hooks, useEffect for data fetching, and interactive UI components from shadcn/ui that require client-side React.

**Detailed Answer:** KhataBox is a highly interactive inventory management dashboard. The decision to make all pages client components stems from three key requirements. First, Zustand stores with `persist` middleware save user preferences (like the active store selector) to `localStorage`, which is only available in the browser. Second, Auth.js v5 with JWT session strategy uses React context providers (`SessionProvider`) that must be mounted on the client. Third, every page fetches data via `useEffect` or custom hooks (e.g., `useDashboard`, `useProducts`) that call the `client-api.ts` wrapper, which attaches the Bearer token from the session. While we lose the SEO and initial-load benefits of React Server Components, this is acceptable because KhataBox is an authenticated SaaS dashboard where pages are behind a login wall. A hybrid approach could move purely presentational sections (e.g., public landing pages) to server components, but the current codebase prioritizes development velocity by keeping a consistent component model. The `middleware.ts` proxy handles auth redirects before any component renders.

**Follow-up:**
1. What would it take to migrate a page to a React Server Component?
2. How does "use client" affect bundle size compared to server components?
3. Could we use server components for the dashboard stats and keep client components only for interactivity?

### Q2. How is Zustand used for state management in KhataBox?

**Short Answer:** Zustand manages global client state — particularly the active store selector — with a `persist` middleware that saves the selected store ID to `localStorage` so the choice survives page refreshes across the session.

**Detailed Answer:** The `useStoreStore` (or similarly named store) holds the currently selected `storeId` and `storeName`. It uses Zustand's `persist` middleware with `localStorage` as the storage backend. When a user switches stores via the sidebar store selector, the Zustand action updates the state, which is immediately written to `localStorage`. On subsequent page loads, Zustand rehydrates from `localStorage`, skipping the need to re-fetch the store list. This pattern is far simpler than Redux for a single piece of global state — there is no boilerplate, no action creators, and no reducers. Other parts of the app (product listings, dashboard stats, inventory queries) read `storeId` from this store to scope their API calls. The trade-off is that Zustand does not enforce immutability out of the box, but for this use case the simplicity is a net positive. If the app grew to require normalized entity caches or complex async workflows, we might supplement with TanStack Query.

**Follow-up:**
1. Why was Zustand chosen over Redux Toolkit or React Context for this application?
2. How does the persist middleware handle SSR — what happens during server-side rendering?
3. Could the store selector state be replaced by a URL query parameter instead?

### Q3. How does KhataBox handle data fetching with `useEffect`?

**Short Answer:** Custom hooks like `useProducts()` wrap `useEffect` to call the `clientApi` wrapper, manage loading/error states, and return typed data. The API wrapper (`client-api.ts`) automatically injects the JWT Bearer token from the Auth.js session.

**Detailed Answer:** Each domain entity (products, orders, customers, etc.) has a corresponding hook file such as `useProducts.ts`. Inside, a `useEffect` calls `api.products.list(storeId)`, which internally uses `clientApi.get("/products", { params })`. The `clientApi` function reads the session via `useSession()` from Auth.js, retrieves `session.user.access_token`, and attaches it as an `Authorization: Bearer <token>` header. On success, the response is JSON-parsed and stored in local state via `useState`. On failure, the error is caught and surfaced via `sonner` toast. Loading state is tracked with a boolean flag. This approach works well for the current scale but does not handle caching, deduplication, or stale-while-revalidate patterns. An upgrade to TanStack Query or SWR is planned for a future iteration to reduce network calls when navigating between pages and to provide better UX with background refetching.

**Follow-up:**
1. How would you implement request deduplication so two components don't fire the same API call?
2. What happens if the user's token expires mid-session — how is that handled?
3. How would you migrate from useEffect to TanStack Query without breaking existing pages?

### Q4. How are forms built and validated in KhataBox?

**Short Answer:** Forms use the `shadcn/ui` component library (built on Radix UI primitives) with React Hook Form for state management and Zod for schema validation. The pattern is consistent across product, order, customer, and supplier forms.

**Detailed Answer:** Each form — e.g., `ProductForm.tsx` — defines a Zod schema that mirrors the `ProductFormData` TypeScript type, validating fields like `name`, `price`, `stock_quantity`, and `category_id`. React Hook Form's `useForm` hook integrates with `@hookform/resolvers/zod` to run validation on each input change or on submit. shadcn/ui components such as `<Input>`, `<Select>`, and `<Button>` are wrapped with React Hook Form's `Controller` or `useFormContext` to bind field values. On submission, the validated data is sent to the API via `clientApi`. If the API returns a validation error (e.g., duplicate SKU), it's caught and displayed as a toast. This stack provides type-safe, declarative forms with minimal boilerplate. The trade-off is the dependency weight of three libraries, but the developer experience — autocomplete on field names, compile-time type checking against the Zod schema, and accessible Radix primitives — justifies it.

**Follow-up:**
1. How would you handle a multi-step wizard form (e.g., creating an order with line items)?
2. Can React Hook Form work with shadcn/ui's date picker component?
3. How do you test form submissions with this stack?

### Q5. How does the RoleGuard component work?

**Short Answer:** `RoleGuard` is a React wrapper that checks the current user's role (from the Auth.js session) against a list of allowed roles. If unauthorized, it renders nothing or a fallback "Access Denied" message.

**Detailed Answer:** The component receives an `allowedRoles` prop (e.g., `["admin", "manager"]`). Inside, it calls `useSession()` to get the logged-in user, extracts `session.user.role`, and checks membership with `allowedRoles.includes(userRole)`. If authorized, it renders `children`; otherwise, it returns `null` or a placard. This is a client-side convenience — the real security enforcement happens server-side via the `require_role()` FastAPI dependency on every API endpoint. RoleGuard prevents UI clutter (hiding buttons or pages the user cannot use) and avoids confusing 403 errors during navigation. It does not replace the backend guard; it simply improves UX. The middleware at `middleware.ts` also redirects unauthenticated users to `/login`, but role filtering at that layer would require decoding the JWT, adding complexity to the edge middleware.

**Follow-up:**
1. Why is server-side role enforcement still necessary even with RoleGuard on the frontend?
2. Could RoleGuard be implemented as a layout wrapper instead of per-page?
3. How would you handle role-based redirect (e.g., sending a customer to a different dashboard)?

### Q6. How is `usePathname` used for navigation state?

**Short Answer:** `usePathname` from `next/navigation` highlights the active sidebar link and conditionally renders navigation sections. It reads the current URL path to determine which nav item is selected.

**Detailed Answer:** The sidebar component calls `const pathname = usePathname()` at the top level. Each navigation link has a `href` and an `isActive` check: `pathname.startsWith(href)`. Active links are styled with a distinct background color and font weight using Tailwind CSS conditional classes (e.g., `cn("font-medium", pathname === href && "bg-accent")`). Role-based filtering also uses the pathname: admin-only links like `/users` are only rendered when the session user's role is `"admin"`. The sidebar also includes the store selector dropdown, which calls the Zustand `setStore` action and uses `usePathname` to detect if the current page is store-scoped (e.g., `/products` vs `/settings`). Since `usePathname` is a client-side hook, it fits the `"use client"` pattern used across all pages. One edge case: navigating to a sub-route like `/products/123` should highlight "Products" as active, which `startsWith` handles correctly.

**Follow-up:**
1. How would you handle multi-level nested navigation highlighting?
2. What happens to `usePathname` during client-side transitions via `<Link>`?
3. Could this be optimized by using the App Router's `useSelectedLayoutSegment` instead?

### Q7. Does KhataBox implement optimistic updates?

**Short Answer:** Currently, KhataBox does not implement true optimistic updates. Mutations (create, update, delete) wait for API confirmation before updating the UI, and failures are surfaced via toast notifications.

**Detailed Answer:** The current codebase uses a "mutate-then-refetch" or "mutate-then-update-local-state" pattern, but does not pessimistically render the new state before the API responds. For example, when deleting a product, the UI shows a loading spinner on the button, calls `clientApi.delete(...)`, awaits the response, and only then removes the row from the table. If the API fails, a `sonner` error toast appears and the UI does not change. This approach is simpler to reason about and avoids complex rollback logic. For a future iteration, optimistic updates would be valuable for high-frequency actions like adjusting stock quantities or toggling order statuses, where the 100-300ms API round-trip creates noticeable lag. TanStack Query's `useMutation` with `onMutate` would be the recommended path: it would immediately update the cache, revert on error, and invalidate queries on success.

**Follow-up:**
1. How would you implement an optimistic update for stock quantity adjustment?
2. What are the risks of optimistic updates in an inventory system with concurrent users?
3. How would you handle rollback if the API returns a conflict error?

### Q8. How is cart/order functionality managed?

**Short Answer:** Orders are created through a multi-step form that collects customer info, line items (products + quantities), and shipping details. The cart state is held in a React hook with `useState` and submitted as a single API POST to `/orders`.

**Detailed Answer:** The order creation flow starts with the customer selection (or creation), then moves to the line items section where the user searches products (via an autocomplete input) and sets quantities. Each line item is validated against available stock — the frontend checks `product.stock_quantity` and warns if the ordered quantity exceeds stock. The entire order is an array of `OrderItemInput` objects sent to `POST /orders`. On the backend, it's wrapped in a database transaction: the order header is inserted, then each line item, and stock quantities are decremented atomically. If any line item fails (e.g., insufficient stock), the entire transaction rolls back and the API returns a 409 Conflict error. The frontend displays this as a toast and highlights the problematic item. This ensures data consistency without requiring client-side pessimistic locking. The cart state is not persisted — if the user navigates away, the draft is lost. A future improvement could save drafts to localStorage or a dedicated backend endpoint.

**Follow-up:**
1. How would you implement a persistent draft order that survives browser crashes?
2. How is concurrency handled if two users try to order the last item simultaneously?
3. How would you add coupon/discount logic to the order flow?

### Q9. How are Suspense boundaries and skeleton loaders used?

**Short Answer:** React Suspense is used with `<Skeleton>` components from shadcn/ui to show loading placeholders for dashboard stats, product tables, and order lists while data is being fetched.

**Detailed Answer:** On the dashboard page, each stat card (total products, orders, revenue, etc.) is wrapped in a `<Suspense>` boundary with a skeleton placeholder. When the page mounts, the skeleton appears immediately, and once `useEffect` resolves, the real data replaces it. The skeleton components mimic the card shape — a gray rounded rectangle with an animated pulse effect via Tailwind's `animate-pulse` class. The Suspense boundaries are at the card level, so if one stat fails (e.g., revenue query times out), its skeleton remains while the other cards display their data. This granularity improves perceived performance. Currently, Suspense is used with client-side data fetching (fallback UI while `useEffect` runs). With React 19 and the Next.js App Router, we could leverage streaming SSR and `async` server components with Suspense for true server-side streaming, but our all-client-component architecture limits this. A compromise would be to use `loading.tsx` files for route-level Suspense.

**Follow-up:**
1. How does Suspense interact with `useEffect`-based data fetching?
2. What is the difference between `loading.tsx` and wrapping content in `<Suspense>` manually?
3. Could streaming SSR work with the "use client" pattern?

### Q10. How is Recharts used for data visualization?

**Short Answer:** Recharts renders bar charts for monthly sales, line charts for revenue trends, and pie charts for category distribution on the dashboard. The charts are responsive via `width="100%"` and a custom container.

**Detailed Answer:** The dashboard includes a `RevenueChart` component that uses `<BarChart>`, `<Line>`, `<XAxis>`, `<YAxis>`, `<Tooltip>`, and `<Legend>` from Recharts. Data comes from the dashboard API endpoint, which returns aggregated monthly figures. To handle the SSR warning (charts render with `width` and `height` set to -1 during build), a `useEffect` sets a `mounted` flag, and the chart renders only after mount — or alternatively, a min-width container prevents layout shift. The Recharts `ResponsiveContainer` (deprecated in newer versions) is avoided in favor of a simple CSS-based container with explicit width/height. Tooltips and legends are styled with Tailwind-compatible class names via Recharts' `formatter` and `label` props. The charts update when the active store changes (via Zustand storeId), triggering a new API call and animating the transition. For accessibility, we add `role="img"` and `aria-label` to chart containers.

**Follow-up:**
1. How would you add drill-down interactivity (clicking a bar shows daily breakdown)?
2. What performance considerations exist when rendering 1000+ data points with Recharts?
3. How would you export a chart as a PNG image?

## 2. Next.js Questions

### Q11. How is the App Router routing structured?

**Short Answer:** KhataBox uses the Next.js App Router with 25 static routes under `src/app/`. Routes like `/dashboard`, `/products`, `/orders`, and `/settings` are organized as nested folders, each with a `page.tsx` (client component) and optionally a `layout.tsx`.

**Detailed Answer:** The directory structure follows Next.js 16 conventions: each subdirectory under `src/app/` maps to a URL segment. For example, `src/app/dashboard/page.tsx` maps to `/dashboard`, and `src/app/products/[id]/page.tsx` maps to `/products/123`. The root `layout.tsx` wraps all pages with the `SessionProvider` (Auth.js), the sidebar, the header, and the `Toaster` (sonner). Nested layouts allow shared UI without re-mounting: the sidebar persists across route changes. API routes are under `src/app/api/[...path]/route.ts`, acting as a proxy to the FastAPI backend. The `not-found.tsx` and `error.tsx` files handle 404s and runtime errors gracefully. This structure is chosen over the Pages Router for its nested layouts, streaming SSR capabilities, and improved data fetching patterns — though current usage is limited to client components.

**Follow-up:**
1. How would you add a dynamic route for product categories (e.g., `/categories/electronics`)?
2. What is the difference between parallel routes and nested routes in the App Router?
3. How does the App Router handle 404s for dynamic routes?

### Q12. How is `layout.tsx` configured in KhataBox?

**Short Answer:** The root `layout.tsx` provides the HTML shell, imports global CSS, wraps the app in `SessionProvider`, renders the sidebar navigation, and includes the `Toaster` component for notifications.

**Detailed Answer:** The root layout is a server component (it does not use `"use client"`) that sets `<html>` and `<body>` tags, imports `globals.css` (Tailwind CSS v4 directives), and defines metadata like the title and description. The `{children}` prop receives the page content. Inside the body, a `<SessionProvider>` (from Auth.js) wraps the entire app so `useSession()` works everywhere. The sidebar `<Sidebar>` is rendered outside the `<main>` content area — it's a fixed-position element. The `<Toaster />` (from shadcn/ui/sonner) is placed near the end of the body so toasts overlay the UI. Each sub-layout (e.g., for settings pages) can add tabs or sub-navigation that persist across child routes. One notable detail: the layout does not fetch data or use `cookies()`/`headers()` because the app is entirely client-side, avoiding the dynamic-rendering pitfalls that block static optimization.

**Follow-up:**
1. How would you add per-page metadata (title, description) in a client-component architecture?
2. What happens if a layout and a page both use `"use client"`?
3. Can you conditionally render the sidebar based on the route (e.g., hide on `/login`)?

### Q13. How does KhataBox handle API routes?

**Short Answer:** KhataBox does not use Next.js API routes for business logic. Instead, `src/app/api/[...path]/route.ts` is a catch-all proxy that forwards all `/api/*` requests to the FastAPI backend on port 8000.

**Detailed Answer:** The catch-all route handler (`src/app/api/[...path]/route.ts`) defines exported `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` functions. Each function parses the incoming request, extracts headers (especially `Authorization`), constructs a URL pointing to `http://localhost:8000/api/{path}`, clones the request body for POST/PUT, and forwards it using `fetch`. The response from FastAPI is returned verbatim, preserving status codes and JSON body. This proxy pattern decouples the frontend and backend — they can be deployed independently, the backend can be written in Python (not Node.js), and API routes in Next.js remain thin. The trade-off is an extra network hop during development (localhost:3000 ? localhost:8000), but in production the proxy runs as a single Next.js edge function or is replaced by a reverse proxy like Nginx or Cloudflare Workers directing `/api/*` directly to the backend.

**Follow-up:**
1. How would you handle CORS when the frontend and backend are on different domains?
2. Could this proxy introduce a performance bottleneck under high load?
3. How would you add request logging or rate limiting at the proxy layer?

### Q14. What does the Next.js `middleware.ts` (or `proxy.ts`) do?

**Short Answer:** The middleware runs at the edge before every request. It redirects unauthenticated users to `/login` and optionally handles role-based route blocking for admin-only pages like `/users`.

**Detailed Answer:** The `middleware.ts` (located at `src/middleware.ts`) exports a `config.matcher` that defines which routes it applies to (e.g., `/((?!login|register|_next/static|favicon.ico).*)`). Inside, it reads the session cookie (set by Auth.js) and decodes it to extract the user's authentication status and role. If no valid session cookie exists, the middleware redirects to `/login` with a return URL query parameter. For admin routes like `/users` or `/settings/roles`, it checks the role and redirects to `/dashboard` with a 403-like message if unauthorized. This provides a first line of defense before any page renders. However, since the middleware runs at the edge, it cannot perform database lookups; it relies solely on the JWT payload. The primary auth enforcement remains in the FastAPI backend. The middleware is written as `export default auth` using Auth.js's `auth()` helper, which integrates with the Auth.js configuration.

**Follow-up:**
1. Could middleware be used for route-based A/B testing or feature flags?
2. How does the middleware handle token refresh if the JWT is expired?
3. What happens if the middleware's matcher accidentally excludes a protected route?

### Q15. How is Auth.js v5 configured for KhataBox?

**Short Answer:** Auth.js uses the Credentials provider to accept email/password, proxy the request to FastAPI's `/auth/login` endpoint, and map the returned JWT token and user info into the Auth.js session via `jwt` and `session` callbacks.

**Detailed Answer:** The Auth.js configuration lives in `src/auth.ts` (or `auth.config.ts`). It defines a `providers` array with a single `Credentials` provider. The `authorize` function receives `credentials` (email, password) from the login form, calls `fetch("http://localhost:8000/auth/login")` with those credentials, and returns the parsed response — which includes `user` (id, name, email, role) and `access_token`. If the backend returns a 401, `authorize` returns `null`, and Auth.js shows an error. The `jwt` callback copies `user.id`, `user.role`, and `token.access_token` (from the backend response) onto the JWT token. The `session` callback then copies those fields onto `session.user`. The session strategy is `"jwt"` (not database), meaning no session records are stored in the database; all state travels in the encrypted cookie. The `pages` option customizes the sign-in page to `/login`. This architecture keeps auth logic (password hashing, token creation) entirely server-side in FastAPI, while Auth.js handles the cookie management and session lifecycle.

**Follow-up:**
1. Why does the session use `strategy: "jwt"` instead of `"database"`?
2. How would you implement token refresh with the Credentials provider?
3. Could this be extended to support OAuth providers like Google or GitHub?

### Q16. How does the `clientApi` wrapper work?

**Short Answer:** `src/lib/client-api.ts` exports a configured Axios-like fetch wrapper that reads the Auth.js session, attaches the Bearer token, serializes query params, and returns typed responses. It is used by all data-fetching hooks.

**Detailed Answer:** The `clientApi` object exposes methods like `get`, `post`, `put`, `patch`, and `delete`. Each method accepts a URL path and optional `params` (query string) and `body` (JSON payload). Internally, it calls `getSession()` from Auth.js to retrieve the current session, extracts `session.user.access_token`, and sets the `Authorization: Bearer` header. It uses the native `fetch` API (or a thin wrapper) for HTTP calls, parses the JSON response, and throws on non-2xx status codes. The base URL is configured via an environment variable (`NEXT_PUBLIC_API_URL`) or defaults to `/api` (which hits the Next.js proxy). TypeScript generics allow typed responses: `const products = await clientApi.get<Product[]>("/products")`. On 401 responses, it automatically redirects to `/login`. Error responses from FastAPI (validation errors, 409 conflicts) are parsed into a consistent `{ detail: string }` format and surfaced via `sonner` toasts.

**Follow-up:**
1. How would you add automatic retry logic for transient network failures?
2. What happens if `getSession()` returns `null` — how do you handle an unauthenticated state?
3. How would you support file uploads (multipart/form-data) through this wrapper?

### Q17. Does KhataBox use static generation or SSR?

**Short Answer:** All pages are dynamically rendered (SSR/CSR) because the content is user-specific and auth-protected. No static generation is used. The `loading.tsx` files provide immediate skeleton UI during data fetch.

**Detailed Answer:** Since every page requires authentication and displays data scoped to the logged-in user's store, static generation (SSG) would produce identical cached pages for all users — which is undesirable for a multi-tenant SaaS. Instead, pages use client-side rendering (CSR): the server delivers an empty shell with `<Skeleton>` components, and `useEffect` fetches data in the browser. This trades initial load speed for simplicity and dynamic data freshness. Next.js still renders the page shell on the server (basic HTML structure), so it's technically SSR + CSR hybrid. The `generateMetadata` function is not used because metadata is generic. The `revalidate` or `force-dynamic` directives are not explicitly set since the all-client-component approach defaults to dynamic rendering. If a public-facing marketing site were added, it could use ISR or SSG for landing pages.

**Follow-up:**
1. Would using Incremental Static Regeneration (ISR) benefit the reporting pages?
2. How would you implement SSR for the dashboard while keeping interactivity for charts?
3. What impact does all-client-rendering have on SEO and what mitigation exists?

### Q18. What is in the `next.config.ts` file?

**Short Answer:** The config sets environment variable passthrough, image hostnames for the R2/CDN, Sentry source maps plugin, and experimental options for the App Router.

**Detailed Answer:** The `next.config.ts` exports a default config object. Key settings include: `images.remotePatterns` to allow image URLs from Cloudflare R2 (e.g., `*.r2.cloudflarestorage.com`); `env` to expose backend URLs like `NEXT_PUBLIC_API_URL`; `experimental.serverActions` (if used) for form actions; and the `withSentryConfig` wrapper that instruments the build with Sentry for error tracking. The config also disables React strict mode in development (to avoid double-renders with `useEffect`), sets `output: "standalone"` for Docker deployment, and configures `transpilePackages` for dependencies that need transpilation (e.g., `lucide-react`, `recharts`). The Sentry webpack plugin uses auth tokens from environment variables to upload source maps during build. No custom webpack config is needed since the stack uses standard tooling.

**Follow-up:**
1. How would you configure internationalization (i18n) in the Next.js config?
2. What is the `output: "standalone"` option and why is it important for Docker?
3. How does `transpilePackages` affect build performance?

### Q19. How is the Recharts SSR warning handled?

**Short Answer:** The warning "`Warning: Prop `width` and `height` should not be null or -1 during SSR`" is cosmetic. It is suppressed by rendering charts only after the component mounts using a `useEffect`-set flag.

**Detailed Answer:** Recharts calculates chart dimensions at runtime. During SSR (or the initial server render in Next.js), the parent container has no measured dimensions, so Recharts defaults to `width={-1}` and `height={-1}`. This triggers a React console warning but does not break functionality because the chart recalculates on mount. The fix in KhataBox is to render the chart inside a client component that sets a `mounted` state via `useEffect`. When `mounted` is `false`, a placeholder skeleton is shown; when `true`, the Recharts component renders with explicit `width` and `height` props or inside a container with known dimensions. Alternatively, some charts use CSS `aspect-ratio` containers to provide intrinsic dimensions. The warning is harmless, but suppressing it avoids confusion during development. A more robust solution would be to use the `ResponsiveContainer` wrapper (now a separate package in newer Recharts) that defers measurement to the client side.

**Follow-up:**
1. Does this warning have any impact on production builds?
2. How would you write an end-to-end test that verifies a chart renders correctly?
3. What alternative charting libraries avoid this SSR issue entirely?

### Q20. How are `loading.tsx` files used?

**Short Answer:** `loading.tsx` files at each route segment provide an immediate skeleton UI that shows while the page component's data is being fetched. They use the same `<Skeleton>` components from shadcn/ui.

**Detailed Answer:** A `loading.tsx` file is placed alongside `page.tsx` in each route directory. When the user navigates to that route, Next.js immediately renders the `loading.tsx` fallback while the page component (which uses `useEffect` for data fetching) loads. The loading component mirrors the page layout — for example, the dashboard `loading.tsx` renders four `<Skeleton className="h-32 w-full rounded-lg" />` cards in a grid, matching the stat card layout. This provides instant visual feedback and prevents layout shift. When the data arrives and the page component updates state, React replaces the skeleton with real content. Because the pages are client components, Next.js shows the `loading.tsx` during the initial server render and keeps it visible until the client hydrates and fetches data. This pattern is superior to a single global spinner because each route segment shows a tailored skeleton, improving perceived performance.

**Follow-up:**
1. How does `loading.tsx` interact with `<Suspense>` boundaries inside the page?
2. Can you use `loading.tsx` to preload data or start API calls early?
3. What happens if both `loading.tsx` and an in-page skeleton exist?

## 3. TypeScript Questions

### Q21. How are API types defined and shared?

**Short Answer:** All API response types are defined as TypeScript interfaces in `src/types/api.ts`. They mirror the Pydantic models from the FastAPI backend, ensuring type safety when consuming API data on the frontend.

**Detailed Answer:** The file `src/types/api.ts` exports interfaces like `Product`, `Order`, `Customer`, `Supplier`, `User`, `DashboardStats`, etc. Each interface maps directly to a Pydantic `BaseModel` on the backend. For example, the `Product` interface includes `id`, `name`, `sku`, `price`, `stock_quantity`, `category_id`, `store_id`, `store_name`, and timestamps. These types are used as generics in the `clientApi` calls: `const products = await clientApi.get<Product[]>("/products")`. This provides autocomplete for response fields and compile-time errors when accessing non-existent properties. The types are hand-written to match the backend schemas — there is no automated code generation (e.g., `openapi-typescript`) yet, though that is a planned improvement. The duplication is manageable for ~20 models and ensures frontend and backend stay in sync during development.

**Follow-up:**
1. How would you use `openapi-typescript` to auto-generate types from the FastAPI OpenAPI spec?
2. How do you handle version mismatch between frontend types and backend API responses?
3. Could shared types reduce boilerplate when adding a new entity?

### Q22. What is the `ProductFormData` type and why is it separate from `Product`?

**Short Answer:** `ProductFormData` is a subset of `Product` that excludes server-managed fields (id, timestamps, store_name). It represents the data the client sends when creating or updating a product.

**Detailed Answer:** The `Product` interface includes read-only fields like `id` (UUID), `created_at`, `updated_at`, and `store_name` (populated from the store relationship). `ProductFormData` omits these and uses a separate type: `export type ProductFormData = Omit<Product, "id" | "created_at" | "updated_at" | "store_name">`. This separation enforces at the type level that the frontend never attempts to send an `id` to a POST endpoint or expects `store_name` in a form. It also allows `store_id` to be optional in the form (defaulting to the currently selected store from Zustand) while being required in the `Product` interface. The form validation schema (Zod) also uses `ProductFormData` as its output type. This pattern is repeated for other entities (OrderFormData, CustomerFormData, etc.) and is a standard practice in type-safe React apps to distinguish "API response shape" from "form input shape."

**Follow-up:**
1. Would a discriminated union be better than `Omit` for form data types?
2. How would you handle partial updates (PATCH) vs full updates (PUT) with form data types?
3. Could Zod infer the TypeScript type directly to avoid duplication?

### Q23. How are enums and union types used for status fields?

**Short Answer:** Status fields like `OrderStatus`, `TransferStatus`, and `UserRole` are defined as TypeScript string unions (e.g., `"pending" | "approved" | "rejected" | "completed"`), matching the lowercase string values stored in PostgreSQL enum columns.

**Detailed Answer:** The backend uses native PostgreSQL ENUM types for status columns, but SQLAlchemy stores them as lowercase strings via `values_callable` on the `TypeDecorator`. The TypeScript frontend mirrors these as string literal unions: `export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled"`. This allows exhaustive type checking in switch statements and conditional rendering. For example, a badge component uses a switch on `order.status` to render a green badge for "delivered" and a yellow one for "pending". If a new status is added in the database but not in the TypeScript union, the compiler catches the missing case in the switch. The union approach is preferred over numeric enums because it serializes naturally to JSON, is more readable in API responses, and aligns with the backend's string representation.

**Follow-up:**
1. How would you handle enum deprecation — removing a status without breaking existing records?
2. What are the trade-offs of TypeScript `enum` keyword vs string union types?
3. How do you ensure the frontend union stays in sync with the PostgreSQL enum?

### Q24. How are generic types used in the `clientApi`?

**Short Answer:** The `clientApi` methods are generic: `get<T>(url, params?): Promise<T>`. Callers specify the expected response type when calling, enabling full end-to-end type safety without casting.

**Detailed Answer:** The `clientApi.get<T>` function signature uses a generic type parameter `T` that defaults to `unknown`. The function returns `Promise<T>`, and internally it parses the JSON response body as `T` (via `JSON.parse` and a type assertion). Consumers call it like `const product = await clientApi.get<Product>("/products/123")`, and TypeScript infers `product` as `Product`. This removes the need for manual `as Product` casts everywhere. The same pattern applies to `post<T>(url, body)` and `put<T>(url, body)`. For endpoints that return paginated results, a wrapper type `PaginatedResponse<T>` is used: `clientApi.get<PaginatedResponse<Product>>("/products?page=1")`. This pattern is simple and effective, though it relies on the developer correctly specifying the type — there is no runtime validation that the response matches `T`. A safer approach would be to use Zod schemas to parse responses at runtime, providing both type safety and validation.

**Follow-up:**
1. How would you add runtime validation to `clientApi` responses using Zod?
2. How do you handle endpoints that return different types based on query parameters?
3. What happens if the API returns a shape that doesn't match the generic type?

### Q25. How is Auth.js module augmentation done?

**Short Answer:** The `src/types/next-auth.d.ts` file augments the `Session` and `JWT` types from Auth.js to include custom fields: `user.id`, `user.role`, and `user.access_token`.

**Detailed Answer:** Auth.js v5 ships with default types for `Session.user` (name, email, image) and `JWT` (sub, name, email). KhataBox needs additional fields: a UUID `id`, a `role` string for RBAC, and the `access_token` string for API calls. The augmentation uses TypeScript's `declare module` pattern: `declare module "next-auth" { interface Session { user: { id: string; role: string; access_token: string; } & DefaultSession["user"] } }`. Similarly, `declare module "next-auth/jwt"` extends the `JWT` interface with `id`, `role`, and `access_token`. This ensures that `session.user.id` is typed as `string` (not `string | undefined`) after the callbacks in `auth.ts` populate them. Without this augmentation, accessing custom fields would require `(session.user as any).role`, losing type safety. The augmentation file is imported implicitly by the TypeScript config's `include` array.

**Follow-up:**
1. Why does Auth.js require module augmentation instead of just using a custom type?
2. How would you add a `permissions` array (e.g., `["read:products", "write:orders"]`) to the session?
3. What happens if the augmentation file is missing — does the build still pass?

### Q26. When does KhataBox use `interface` vs `type`?

**Short Answer:** `interface` is preferred for public API shapes (response types, props interfaces) because they are extendable and produce cleaner error messages. `type` is used for unions, intersections, and derived/computed types.

**Detailed Answer:** The codebase follows a convention: API response types like `Product`, `Order`, `Customer`, and component props (e.g., `ProductTableProps`) are declared as `interface`. This allows declaration merging if needed (e.g., extending in a test file) and produces more readable TypeScript errors when the shape doesn't match. `type` aliases are used for unions (`type OrderStatus = "pending" | "shipped" | ...`), mapped types (`type ProductFormData = Omit<Product, ...>`), and utility types. For example, `client-api.ts` uses a function type signature via `type`. This convention is not enforced by a linter but is consistently applied across the codebase. Both are interchangeable for most cases; the choice is stylistic but helps devs quickly understand whether a type is a "contract" (interface) or a "computation" (type alias).

**Follow-up:**
1. Does the `interface extends` pattern cause any issues with complex generic types?
2. How would you enforce this convention with ESLint?
3. Can an `interface` represent a union, or would you always use `type` for that?

## 4. FastAPI & Python Questions

### Q27. How is the FastAPI application structured?

**Short Answer:** The app uses a factory pattern: `app/main.py` creates the `FastAPI` instance, registers routers, configures middleware (CORS, Sentry, PostHog), initializes the database engine, and sets up the lifespan handler for startup/shutdown lifecycle.

**Detailed Answer:** The entry point is `app/main.py`, which calls `create_app()` — a factory function. Inside, it creates the `FastAPI` instance with title, description, version, and OpenAPI tags. It iterates over a list of routers (e.g., `auth.router`, `products.router`, `orders.router`, `dashboard.router`) and calls `app.include_router()` for each, with appropriate prefixes like `/auth`, `/products`, `/orders`, `/dashboard`. Middleware is added: `CORSMiddleware` with origins from an environment variable, `SessionMiddleware` for Sentry, and a custom middleware for PostHog analytics. The database engine is created via `create_async_engine` from SQLAlchemy's asyncio extension. The lifespan handler (`async with app.lifespan_context:`) manages engine disposal and Redis connection cleanup on shutdown. This separation ensures routers are modular, middleware is centrally configured, and the app can be instantiated for both production and testing with different configurations.

**Follow-up:**
1. How would you add a health-check endpoint that tests DB and Redis connectivity?
2. Why use a factory function instead of a module-level app instance?
3. How do you register background tasks that run on startup?

### Q28. How does dependency injection (DI) work in KhataBox?

**Short Answer:** FastAPI's `Depends()` function is used extensively for DI — injecting database sessions (`get_db`), the current authenticated user (`get_current_user`), role checks (`require_role`), and Redis connections.

**Detailed Answer:** FastAPI's DI system resolves dependencies by their type hints. The most common dependency is the database session: `async def get_db() -> AsyncGenerator[AsyncSession, None]`: it yields an `AsyncSession` from the async engine, and FastAPI closes it after the request. Endpoints declare `db: AsyncSession = Depends(get_db)`. Authentication uses `get_current_user`: it extracts the JWT from the `Authorization` header, decodes it, fetches the `User` from the DB, and raises 401 if invalid. Role protection is a closure: `def require_role(*allowed_roles)`: returns a dependency that calls `get_current_user` then checks `user.role in allowed_roles`. Redis is injected via `get_redis` which returns the async Redis client. This DI pattern makes testing straightforward: dependencies can be overridden using `app.dependency_overrides` to inject mock sessions or mock users. The separation of concerns is clean — endpoints focus on business logic, and cross-cutting concerns are handled by dependencies.

**Follow-up:**
1. How would you add request-scoped caching at the dependency level?
2. Can FastAPI dependencies be nested or chained?
3. How do you handle cleanup (e.g., closing a file handle) after a dependency is used?

### Q29. What is the lifespan handler and how is it used?

**Short Answer:** The lifespan handler is an async context manager that runs setup code (engine creation, Redis connection, seed data) before the app starts and teardown code (closing connections) when the app shuts down.

**Detailed Answer:** In `app/main.py`, the `FastAPI` instance accepts `lifespan` parameter pointing to a function decorated with `@asynccontextmanager`. Inside the `yield`, the app is running; before `yield`, database tables are created (via `async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)`), the Redis connection pool is initialized, and the seed script is run idempotently. After `yield`, cleanup occurs: `await engine.dispose()` closes all DB connections, `await redis.close()` closes Redis, and any background tasks (e.g., Celery-like in-process workers) are cancelled. This replaces the deprecated `startup` and `shutdown` event handlers from earlier FastAPI versions. Using the lifespan context ensures that resources are properly scoped to the application lifecycle and that exceptions during startup prevent the app from serving requests.

**Follow-up:**
1. What happens if `create_all` fails — does the app fail to start?
2. How would you run Alembic migrations inside the lifespan instead of `create_all`?
3. Can you have multiple lifespan handlers, or must everything be in one function?

### Q30. How does `get_db` work in an async context?

**Short Answer:** `get_db` is an async generator that creates an `AsyncSession` from the async engine, yields it to the endpoint for use, and closes it after the response is sent, ensuring proper cleanup.

**Detailed Answer:** The function signature is: `async def get_db() -> AsyncGenerator[AsyncSession, None]:`. Inside, it calls `async with AsyncSessionLocal() as session:` — where `AsyncSessionLocal` is a `sessionmaker` configured with `AsyncSession`, `expire_on_commit=False`, and the async engine. The `yield session` passes control to the endpoint. After the endpoint returns (or raises), the `async with` block exits, and the session is closed via `await session.close()`. The `expire_on_commit=False` setting is critical: without it, SQLAlchemy would expire all loaded objects after `await session.commit()`, causing `DetachedInstanceError` when the endpoint tries to access lazy-loaded attributes after commit (common in async contexts). The session is scoped per-request and is not shared across requests, avoiding concurrency issues. This is the standard pattern recommended by SQLAlchemy for async web frameworks.

**Follow-up:**
1. What is `DetachedInstanceError` and how does `expire_on_commit=False` prevent it?
2. How would you handle transaction rollback on error?
3. Why is `AsyncSession` preferred over `Session` in this context?

### Q31. How is CORS configured on the backend?

**Short Answer:** CORS is configured via `CORSMiddleware` in FastAPI, with allowed origins read from a comma-separated `CORS_ORIGINS` environment variable, supporting both development (`localhost:3000`) and production domains.

**Detailed Answer:** In `app/main.py`, the `CORSMiddleware` is added to the app with `allow_origins` set to `os.getenv("CORS_ORIGINS", "").split(",")` which splits the env var into a list. If the env var is empty, no origins are allowed (requests from browsers will be blocked). `allow_credentials=True` enables cookies/Authorization headers cross-origin. `allow_methods=["*"]` allows all HTTP methods, and `allow_headers=["*"]` allows all headers. In development, the env var is set to `http://localhost:3000`. In production, it's set to the actual frontend domain (e.g., `https://khatabox.app`). The `allow_origins` list must be explicit — using `["*"]` with `allow_credentials=True` is invalid per the CORS spec and will throw an error. The Next.js API proxy also handles CORS at the edge, but the backend still needs its own CORS config for direct access (e.g., during testing or if the proxy is bypassed).

**Follow-up:**
1. Why does `allow_credentials=True` prevent using `allow_origins=["*"]`?
2. How would you restrict methods to only GET, POST, PUT, DELETE?
3. What security considerations exist for CORS in a multi-tenant environment?

### Q32. How is Sentry configured for error tracking?

**Short Answer:** Sentry is configured in both the FastAPI backend (via `sentry_sdk.init`) and the Next.js frontend (via `@sentry/nextjs`). The backend captures exceptions with 0.2 traces sample rate, while the frontend uses the Sentry webpack plugin for source maps.

**Detailed Answer:** On the backend, `sentry_sdk.init()` is called in `app/main.py` with `dsn` from env `SENTRY_DSN`, `traces_sample_rate=0.2` (sampling 20% of requests for performance tracing), and `send_default_pii=False` to avoid sending user personal info. The `FastAPIIntegration()` is included to instrument request/response cycles automatically. On the frontend, `@sentry/nextjs` wraps `next.config.ts` with `withSentryConfig()`, which uploads source maps during CI builds and instruments client-side errors. In development, Sentry is typically disabled by leaving `SENTRY_DSN` unset. The 0.2 sample rate balances visibility with cost — for a low-traffic SaaS, this provides enough data to diagnose performance bottlenecks without overwhelming the quota. `send_default_pii=False` ensures GDPR compliance by not sending user names or IPs.

**Follow-up:**
1. How would you set up Sentry alerts for specific error types (e.g., 500 errors)?
2. What is the performance overhead of Sentry's tracing?
3. How do you filter out expected errors (e.g., 401 for expired tokens) from Sentry?

### Q33. How is PostHog used for product analytics?

**Short Answer:** PostHog captures events like page views, feature usage, and errors. It is configured on the frontend via `posthog-js` and optionally on the backend via `posthog` Python library for server-side events.

**Detailed Answer:** On the frontend, a `PostHogProvider` wraps the app in `layout.tsx` (or `providers.tsx`), initialized with `posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, { api_host: ... })`. Custom events are captured with `posthog.capture("Order Created", { orderId, totalAmount })`. Feature flags (e.g., "new-dashboard") are checked with `posthog.isFeatureEnabled("new-dashboard")` to gate new functionality. On the backend, a middleware or dependency captures server-side events like "User Registered" or "Export Requested" for server-side-only actions. PostHog self-hosting is an option for data sovereignty, though the current setup uses PostHog Cloud. The integration is opt-in via environment variables; if `NEXT_PUBLIC_POSTHOG_KEY` is not set, the provider is not mounted, ensuring no data is sent during local development.

**Follow-up:**
1. How would you create a funnel analysis (e.g., signup ? first order) using PostHog?
2. What is the performance impact of PostHog's JavaScript library?
3. How do you ensure PostHog events comply with GDPR/privacy regulations?

### Q34. How is `asyncio.gather` used in the dashboard endpoint?

**Short Answer:** The dashboard endpoint uses `asyncio.gather` to fetch five stat queries (total products, total orders, revenue, low stock count, recent orders) concurrently, reducing the endpoint's total latency to the slowest query instead of the sum of all queries.

**Detailed Answer:** Inside the dashboard service (`app/services/dashboard.py`), the function `get_dashboard_stats(user_id, store_id)` creates five coroutines: `count_products(db, store_id)`, `count_orders(db, store_id)`, `sum_revenue(db, store_id)`, `count_low_stock(db, store_id)`, and `get_recent_orders(db, store_id, limit=5)`. These are passed to `await asyncio.gather(*coroutines)`, which runs them concurrently over the same database session. Each coroutine is a simple `SELECT COUNT(*)` or `SELECT ... LIMIT` query. Because SQLAlchemy's async engine uses a connection pool, these queries execute in parallel on separate database connections (up to the pool limit). The result is a tuple of five values, which are mapped into the `DashboardStats` Pydantic response model. The response is then cached in Redis with a 300-second TTL. This approach cuts dashboard load time from ~500ms (sequential) to ~150ms (parallel), significantly improving perceived performance.

**Follow-up:**
1. What happens if one of the five queries fails — does the entire dashboard fail?
2. How does `asyncio.gather` interact with SQLAlchemy's async session?
3. Could this be optimized further with a single SQL query using subqueries?

### Q35. How is the ML forecasting model integrated into the API?

**Short Answer:** A scikit-learn RandomForestRegressor (100 trees, max_depth=10) is trained on synthetic historical sales data and exposed via a `/forecast` endpoint that returns predicted demand, a confidence score, and a seasonality factor.

**Detailed Answer:** The model is defined in `app/ml/forecast.py`. It uses `RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)` and is trained on synthetic data with features: `product_id` (encoded), `day_of_week`, `month`, `is_holiday` (boolean), and `category_encoded`. The target is `units_sold`. The model is pickled (`model.bkl`) during a one-time training script and loaded at app startup in the lifespan handler. The `/forecast` POST endpoint accepts `product_id`, `date`, and optional `store_id`. It extracts the date features, retrieves the product's category_encoded from the DB, runs the model's `predict()` (which returns an array — single prediction), and also gets `predict()` variance across trees to compute a confidence score (lower variance = higher confidence). A `seasonality_factor` is computed: `1.0 + (0.15 if is_holiday else 0) + (0.10 if is_weekend else 0)`. The final response includes `predicted_units` (float), `confidence` (0-1), and `seasonality_factor`. The model achieves R²=0.862 on synthetic test data.

**Follow-up:**
1. How would you retrain the model with real production data?
2. What are the limitations of using Random Forest for time-series forecasting?
3. How would you handle the cold-start problem for new products with no sales history?

## 5. PostgreSQL & SQLAlchemy Questions

### Q36. How is the async database engine configured?

**Short Answer:** The engine is created with `create_async_engine` from SQLAlchemy's asyncio extension, using `postgresql+asyncpg://` as the connection URL. A `sessionmaker` bound to `AsyncSession` creates per-request sessions.

**Detailed Answer:** In `app/core/database.py`, `create_async_engine` reads the `DATABASE_URL` env var (e.g., `postgresql+asyncpg://user:pass@localhost:5432/khatabox`). Key configuration includes `pool_size=10` (connections kept in the pool), `max_overflow=20` (additional connections when pool is exhausted), `pool_pre_ping=True` (test connections before use), and `echo=False` (disable SQL logging in production). An `async_sessionmaker` is created with `AsyncSession(engine, expire_on_commit=False)`. The `get_db` dependency yields a session from this factory. The async engine uses `asyncpg` under the hood, which provides non-blocking database I/O. This is critical for FastAPI's async event loop — a synchronous engine (psycopg2) would block the event loop, negating the performance benefits of async. The `pool_pre_ping` option prevents stale connection errors by verifying connections are alive before checkout.

**Follow-up:**
1. What is the difference between `pool_size` and `max_overflow`?
2. How does `asyncpg` compare to `psycopg2` for performance?
3. What happens when all connections in the pool are in use?

### Q37. How are PostgreSQL enum columns mapped with `values_callable`?

**Short Answer:** Enum columns (e.g., `OrderStatus`, `UserRole`, `TransferStatus`) are stored as lowercase strings in PostgreSQL native ENUM types. SQLAlchemy uses `values_callable` on a custom `TypeDecorator` to convert between Python enum and string automatically.

**Detailed Answer:** Each enum (e.g., `class OrderStatus(str, Enum): pending = "pending"; processing = "processing"`) is a `str, Enum` subclass. The custom `EnumColumn` type (or `TypeDecorator`) implements `process_bind_param` (Python ? DB) and `process_result_value` (DB ? Python), using `values_callable` to get `[e.value for e in enum_class]` for the SQLAlchemy schema. The PostgreSQL column is defined as `sa.Enum(OrderStatus, values_callable=lambda x: [e.value for e in x])`. This stores only the lowercase string (e.g., `"pending"`) in the DB rather than the Python enum name. It ensures case consistency and avoids issues with PostgreSQL's case-sensitive enum handling. On the Python side, SQLAlchemy still returns `OrderStatus.pending`, so code uses `if order.status is OrderStatus.pending` rather than string comparison.

**Follow-up:**
1. Why not just store statuses as VARCHAR instead of PostgreSQL ENUM?
2. How do you alter an enum type to add a new value in PostgreSQL?
3. What happens if the Python enum and the DB enum get out of sync?

### Q38. How is the Order ? OrderItem relationship modeled?

**Short Answer:** `Order` has a one-to-many relationship to `OrderItem`, mapped via SQLAlchemy's `relationship()` with `selectinload()` for eager loading. OrderItem has a foreign key to `orders.id` and to `products.id`, with a composite unique constraint on `(order_id, product_id)`.

**Detailed Answer:** The `Order` model declares `items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")`. The `OrderItem` model has `order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"))`, `product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))`, `quantity: Mapped[int]`, and `unit_price: Mapped[Decimal]`. A `UniqueConstraint("order_id", "product_id")` prevents duplicate line items. When querying orders, `selectinload(Order.items).selectinload(OrderItem.product)` is used to eagerly load items and their associated product data, preventing N+1 queries. The `cascade="all, delete-orphan"` ensures that deleting an order also deletes its items. The `unit_price` is snapshot at order time (not a live reference to the product's current price), preserving historical accuracy for invoices and reports.

**Follow-up:**
1. Why is `unit_price` stored on OrderItem instead of derived from Product at query time?
2. How would you calculate the order total — via a database query or in Python?
3. What indexes exist on the OrderItem table for performance?

### Q39. How is full-text search implemented with TSVECTOR?

**Short Answer:** A `TSVECTOR` column on the `Product` model stores a concatenated, weighted vector of `name`, `description`, and `sku`. A GIN index accelerates searches, and raw SQL queries with `plainto_tsquery` or `websearch_to_tsquery` are used for matching.

**Detailed Answer:** The `Product` model has a computed column: `search_vector: Mapped[TSVECTOR] = mapped_column(Compute("to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(sku, ''))", persisted=True))`. A GIN index is created on this column: `Index("ix_product_search", Product.search_vector, postgresql_using="gin")`. Search queries use a raw SQL expression: `Product.search_vector.op("@@")(func.plainto_tsquery("english", search_term))`. The `plainto_tsquery` function parses the user input into a tsquery, handling stop words and stemming. The GIN index makes these searches extremely fast even on large datasets. The `persisted=True` means the TSVECTOR is recomputed on each insert/update and stored physically — this trades increased write cost for faster reads. A trigger could also maintain it, but SQLAlchemy's `Compute` handles it declaratively.

**Follow-up:**
1. How does `websearch_to_tsquery` differ from `plainto_tsquery` for user-facing search?
2. What is the downside of a `persisted` computed column vs a `stored` one?
3. How would you add faceted search (filtering by category + price range) alongside full-text search?

### Q40. Why is `selectinload()` preferred over `joinedload()`?

**Short Answer:** `selectinload()` issues a separate SELECT with an IN clause for each relationship, which works reliably with async SQLAlchemy and avoids the complexity of `joinedload()` (duplicate rows, multi-level loading issues).

**Detailed Answer:** Both `selectinload` and `joinedload` are eager-loading strategies that prevent N+1 queries. `joinedload` uses a LEFT JOIN to load the related objects in the same query, which can cause row multiplication (one parent row per child row) and requires `distinct()` in many cases. It also struggles with pagination on the parent query. `selectinload` instead loads the parent objects, collects their primary keys, and issues a second query: `SELECT * FROM child WHERE parent_id IN (...parent_ids...)`. This avoids row multiplication, works cleanly with `LIMIT`/`OFFSET` on the parent, and is the recommended strategy for async SQLAlchemy because it doesn't require the complex result-mapping that `joinedload` needs. The trade-off is an extra query round-trip, but for the typical case (loading orders with items, or products with categories), the overhead is negligible, and the reliability gain is significant.

**Follow-up:**
1. When would `joinedload` be a better choice than `selectinload`?
2. How does `selectinload` affect paginated queries?
3. What is the N+1 query problem and how does eager loading solve it?

### Q41. How is the audit trail implemented?

**Short Answer:** SQLAlchemy event listeners on `before_insert` and `before_update` automatically set `created_at` and `updated_at` timestamps. For full auditing, an `AuditLog` model captures user_id, action, entity_type, entity_id, old_values, and new_values.

**Detailed Answer:** Each model uses `created_at: Mapped[datetime] = mapped_column(server_default=func.now())` and `updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())`. For change tracking, an `AuditLog` model records `user_id` (who performed the action), `action` (CREATE, UPDATE, DELETE), `entity_type` (e.g., "product", "order"), `entity_id`, `old_values` (JSONB of previous field values), and `new_values` (JSONB of new values). A SQLAlchemy event listener on the `after_insert`, `after_update`, and `before_delete` events of key entities (Product, Order, StockTransfer) creates `AuditLog` entries. The audit is performed within the same transaction, so if the main operation fails, the audit log is rolled back too. This provides a complete history for compliance and debugging. The `AuditLog` table is indexed on `(entity_type, entity_id)` and `(user_id)` for fast lookups.

**Follow-up:**
1. How would you query the audit log to show "who changed the price of product X last week"?
2. What is the performance impact of writing audit logs on every update?
3. Could audit log entries be stored in a separate database or log service?

### Q42. How are Alembic migrations structured?

**Short Answer:** Seven migration files exist under `alembic/versions/`, each generated via `alembic revision --autogenerate`. They cover initial schema creation, enum types, TSVECTOR columns, index additions, and the stock_transfers feature (migration 0007).

**Detailed Answer:** Alembic is configured in `alembic.ini` and `alembic/env.py`. The `env.py` file imports the `Base` metadata from `app/models/__init__.py` and sets `target_metadata = Base.metadata`. The async engine is used via `create_async_engine` and `run_async` helper. Each migration is a numbered revision (e.g., `0001_initial_schema.py`). Migrations are reviewed and edited before applying — `--autogenerate` detects changes like new tables, column additions, index creations, and enum type changes. The seventh migration (`0007_stock_transfers.py`) adds the `stock_transfers` table (with columns for source_store_id, destination_store_id, status, timestamps) and adds `store_id` to the `inventory_movements` table. Running `alembic upgrade head` applies all pending migrations. Environment-specific database URLs are loaded from `.env` files.

**Follow-up:**
1. How do you create a new migration that adds a column with a default value to an existing table?
2. What is the safest way to backfill data in a new column during a migration?
3. How do you handle migration conflicts when multiple developers create revisions?

### Q43. How is multi-tenancy handled (store isolation)?

**Short Answer:** Multi-tenancy is at the row level: every data table (products, orders, customers, inventory) has a `store_id` foreign key, and all queries filter by `store_id` based on the currently selected store from the user's session.

**Detailed Answer:** There is no database-per-tenant or schema-per-tenant. Instead, each tenant is a "store" identified by a UUID `store_id`. The `User` model has a many-to-many relationship to `Store` (or a `store_id` foreign key for single-store users). Every query in the service layer includes a `WHERE store_id = :store_id` filter. The active `store_id` comes from the request — either from the authenticated user's default store or from an `X-Store-Id` header that the frontend sends based on the Zustand store selector. A middleware or dependency extracts this header and injects it into the request context. This row-level isolation is simple to implement and manage, and it allows cross-store analytics for admin users (who can omit the filter). The main consideration is ensuring every query and index includes `store_id` to prevent accidental data leakage and to maintain query performance.

**Follow-up:**
1. What happens if a user has access to multiple stores — how do you ensure they only see data for the selected store?
2. How would you add a `store_id` to a new table without forgetting?
3. What are the performance implications of row-level multi-tenancy at scale (millions of rows per store)?

### Q44. What indexes exist for performance?

**Short Answer:** Key indexes include: GIN index on `search_vector` for full-text search, B-tree indexes on `(store_id, created_at)` for time-range queries, unique indexes on `(store_id, sku)` for product SKU uniqueness per store, and composite indexes on foreign keys used in JOINs.

**Detailed Answer:** The database schema explicitly defines indexes beyond the implicit ones on primary keys and foreign keys. The `Product` table has `Index("ix_product_store_name", Product.store_id, Product.name)` for alphabetical listing within a store, and `Index("ix_product_sku_store", Product.sku, Product.store_id, unique=True)` for SKU uniqueness. The `Order` table has `Index("ix_order_store_date", Order.store_id, Order.created_at)` for dashboard date-range queries. The `InventoryMovement` table has `Index("ix_movement_product_store", Movement.product_id, Movement.store_id)` for stock-level queries. The `AuditLog` table has `Index("ix_audit_entity", AuditLog.entity_type, AuditLog.entity_id)`. These indexes are defined in the model files using `__table_args__ = (Index(...),)`. They are created automatically by Alembic migrations. Query analysis via `EXPLAIN ANALYZE` was used to identify the most impactful indexes; unused indexes are periodically removed to avoid write overhead.

**Follow-up:**
1. How would you detect and remove unused indexes?
2. What is the trade-off between more indexes and write performance?
3. How would you index a JSONB column used for dynamic attributes?

### Q45. How are dual foreign keys handled in the Stock Transfer model?

**Short Answer:** The `StockTransfer` model has two foreign keys to the `stores` table: `source_store_id` and `destination_store_id`, both referencing `stores.id`. Each has a separate relationship with `foreign_keys` specified to disambiguate.

**Detailed Answer:** The model definition is:

```python
source_store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id"))
destination_store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id"))
source_store: Mapped["Store"] = relationship(foreign_keys=[source_store_id])
destination_store: Mapped["Store"] = relationship(foreign_keys=[destination_store_id])
```

SQLAlchemy requires explicit `foreign_keys` on each relationship because the model has two paths to the same table. Without it, SQLAlchemy cannot determine which FK column each relationship should use. The `StockMovement` model (inventory movements) also gets a `store_id` field in migration 0007 to track where the movement occurred. The transfer lifecycle: status starts as `"pending"`, moves to `"approved"` or `"rejected"`, then to `"completed"`. On completion, two inventory movement records are auto-created — one decrementing stock at the source store and one incrementing at the destination store — using a database transaction for atomicity.

**Follow-up:**
1. How is the transaction between source and destination stores kept atomic?
2. What prevents a transfer from being approved after it's already been completed?
3. How would you add a "cancel" flow that reverses the inventory movements?

## 6. Authentication & RBAC Questions

### Q46. How does the JWT authentication flow work end-to-end?

**Short Answer:** The user submits email/password to the login form, which Auth.js proxies to FastAPI `/auth/login`. FastAPI validates credentials with bcrypt, generates a JWT (python-jose), and returns it. Auth.js stores it in an encrypted cookie. Every subsequent API request includes the JWT in the `Authorization` header via the `clientApi` wrapper.

**Detailed Answer:** The flow: (1) Login form posts to Auth.js's `signIn("credentials", { email, password, redirect: false })`. (2) Auth.js calls the `authorize` function in `auth.ts`, which fetches `POST /auth/login` on FastAPI with the credentials. (3) FastAPI's `login` endpoint hashes the incoming password with `bcrypt.verify()` against the stored hash; if valid, it creates a JWT with payload `{ sub: user.id, role: user.role, exp: now + 24h, iat: now }` signed with `python-jose` using `HS256` and the `JWT_SECRET` env var. (4) FastAPI returns `{ access_token, user: { id, name, email, role } }`. (5) Auth.js's `jwt` callback copies these fields into the JWT cookie, and the `session` callback exposes them. (6) For API calls, `client-api.ts` reads `session.user.access_token` (from the Auth.js session JWT cookie) and sets `Authorization: Bearer <token>`. (7) FastAPI's `get_current_user` dependency decodes the token, extracts `sub` (user ID), fetches the user, and returns it. The JWT expires after 24 hours; no refresh token is currently implemented.

**Follow-up:**
1. How would you implement a refresh token flow to extend sessions beyond 24 hours?
2. What happens if the JWT secret is rotated?
3. How is the JWT validated on every request — is the DB queried each time?

### Q47. How does `require_role()` work as a dependency?

**Short Answer:** `require_role(*allowed_roles)` is a closure that returns a FastAPI dependency. It calls `get_current_user` to authenticate, then checks `user.role in allowed_roles`, raising a 403 `HTTPException` if unauthorized.

**Detailed Answer:** The implementation is:

```python
def require_role(*allowed_roles: str) -> Callable:
    async def _role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' not in {allowed_roles}"
            )
        return current_user
    return _role_checker
```

Endpoints use it as `Depends(require_role("admin", "manager"))`. FastAPI resolves `get_current_user` first (extracting/validating the JWT, fetching the user from DB), then passes the result to `_role_checker`. If the role check fails, a 403 response is returned immediately without executing the endpoint body. This is composable: admin-only endpoints use `Depends(require_role("admin"))`, while broader endpoints use `Depends(require_role("admin", "manager", "viewer"))`. The error message includes the user's role for debugging.

**Follow-up:**
1. How would you add permission-based (not role-based) access control?
2. Can `require_role()` be combined with other dependencies like `get_store_access`?
3. How is `require_role()` tested — can you override it in tests?

### Q48. How are admin-only features protected?

**Short Answer:** Admin endpoints (user management, store settings, role assignments) use `Depends(require_role("admin"))` on the backend. On the frontend, `RoleGuard` and conditional rendering (`session.user.role === "admin"`) hide admin UI elements from non-admin users.

**Detailed Answer:** Backend protection is layered: the endpoint for `GET /users` (listing all users) has `Depends(require_role("admin"))`, and `PATCH /users/{id}/role` similarly requires admin. The frontend sidebar only renders the "Users" link if `session.user.role === "admin"`. The `UsersPage` component uses `<RoleGuard allowedRoles={["admin"]}>` to show an "Access Denied" message if a non-admin navigates directly to `/users`. The middleware at `middleware.ts` also checks the JWT cookie's role for known admin routes and redirects non-admins to `/dashboard`. This defense-in-depth approach ensures that even if a frontend check is bypassed (e.g., via Postman or a malicious browser extension), the backend will reject the request with a 403.

**Follow-up:**
1. Why isn't the middleware role check sufficient on its own?
2. How would you implement an "admin impersonation" feature?
3. How do you audit admin actions differently from regular user actions?

### Q49. How is password security handled (passlib + bcrypt)?

**Short Answer:** Passwords are hashed using `passlib.context.CryptContext` with bcrypt as the scheme. FastAPI's registration/update endpoints use `pwd_context.hash(password)` to store and `pwd_context.verify(password, hash)` to validate.

**Detailed Answer:** The `CryptContext` is configured as `CryptContext(schemes=["bcrypt"], deprecated="auto")`. This creates a shared context that handles hashing and verification. The bcrypt version is pinned: `passlib==1.7.4` and `bcrypt==4.0.1` in `requirements.txt`. This pinning is critical because `bcrypt>=5.0` introduced breaking changes that cause `passlib` to raise `FatalError: (v) was not reserved` — a known issue documented in the project's AGENTS notes. The password hash is stored in the `User.hashed_password` column (VARCHAR(255)). Hashing is done at the service layer (not in the model) to keep models simple. The `pwd_context.verify()` call is constant-time, mitigating timing attacks. No password complexity rules are enforced beyond minimum length (validated via Pydantic).

**Follow-up:**
1. Why is the bcrypt version pinned specifically to 4.0.1?
2. How does `passlib` choose the number of bcrypt rounds?
3. How would you migrate from bcrypt to a newer algorithm (e.g., argon2) without invalidating existing passwords?

### Q50. How does Auth.js bridge to FastAPI for authentication (no OAuth)?

**Short Answer:** Auth.js v5 is configured with the `Credentials` provider that calls the FastAPI `/auth/login` endpoint. Auth.js handles the cookie/session lifecycle, while FastAPI handles password hashing and JWT generation — creating a clean separation of concerns.

**Detailed Answer:** The `Credentials` provider in `auth.ts` has an `authorize` function that takes `credentials` from the login form (email, password), makes an HTTP POST to the FastAPI backend, and returns the parsed response. The response includes an `access_token` (JWT), `user.id`, `user.name`, `user.email`, and `user.role`. The `jwt` callback merges these into the Auth.js JWT token (which is stored in an encrypted httpOnly cookie). The `session` callback reads from the JWT token and exposes `id`, `role`, and `access_token` on the session object. The session strategy is `"jwt"`, meaning no database lookups for session state. This design means Auth.js never sees the user's password after the initial login — it only holds the JWT. The sign-in form uses `signIn("credentials", { ... })` from Auth.js's React library. If the backend returns 401, Auth.js automatically shows an error message on the login page.

**Follow-up:**
1. How would you implement "remember me" to extend session duration?
2. What happens if the FastAPI backend is down — does Auth.js show a meaningful error?
3. Could this architecture support SSO (SAML/OpenID Connect) alongside credentials?

### Q51. How is user registration handled?

**Short Answer:** Registration is a separate endpoint, `POST /auth/register`, that accepts email, password, name, and optional store details. There is no standard Auth.js provider for registration — it's handled entirely by FastAPI, and after registration the user is redirected to login.

**Detailed Answer:** The registration endpoint in FastAPI: validates input with a Pydantic schema (email format, password min length), checks for existing email (409 Conflict if duplicate), hashes the password with `pwd_context.hash()`, creates a `User` record with `role="viewer"` (default), and optionally creates a new `Store` if the user is registering a new business. The endpoint does NOT auto-login — it returns a 201 with a success message. The frontend redirects to `/login` with a "Registration successful" toast. There is no email verification step yet (a known improvement area). Admin users can later change roles or add users to existing stores via the admin panel. This separation keeps registration logic simple and avoids coupling it to the session management flow.

**Follow-up:**
1. How would you add email verification to the registration flow?
2. Should registration create a new store or require an invite code?
3. How do you prevent automated bot registrations (CAPTCHA, rate limiting)?
## 7. Redis & Caching Questions

### Q52. How is Redis used as a cache service?

**Short Answer:** Redis caches dashboard stats with a 300-second TTL, stores rate limiter counters using a sliding window algorithm, and provides a fallback for sessions. It is accessed via redis.asyncio for non-blocking operations.

**Detailed Answer:** A CacheService class in app/services/cache.py wraps Redis operations. It uses redis.asyncio.Redis connected via the REDIS_URL environment variable. Key methods: get(key) and set(key, value, ttl=300), with JSON serialization of complex objects. The dashboard cache key is dashboard:{user_id}:{store_id} — when a dashboard request comes in, the service checks Redis first; on a hit, it returns the cached Pydantic model directly; on a miss, it runs the five concurrent asyncio.gather queries, stores the result in Redis, and returns it. The TTL of 300 seconds (5 minutes) balances freshness with reduced load. Redis is also used for the rate limiter (sliding window via ZREMRANGEBYSCORE, ZADD, ZCOUNT). The async client is essential for not blocking the event loop during cache operations. If Redis is unavailable, all cache operations return None (graceful degradation), and queries fall through to the database.

**Follow-up:**
1. How would you implement cache invalidation for specific entities (e.g., clear product cache when stock changes)?
2. What serialization format is used for cached objects — JSON or pickle?
3. How do you monitor Redis cache hit/miss ratios in production?

### Q53. How is the dashboard data cached?

**Short Answer:** Dashboard stats are cached in Redis with key dashboard:{user_id}:{store_id} for 300 seconds. On cache miss, the endpoint runs five concurrent queries via asyncio.gather, stores the result, and returns it.

**Detailed Answer:** The dashboard service (get_dashboard_stats) first builds the cache key from the authenticated user ID and the active store ID. It calls await cache.get(key). If the result is not None, it is deserialized from JSON into a DashboardStats Pydantic model and returned immediately. If None, the five stat queries run concurrently via asyncio.gather. After all queries complete, the combined result is serialized to JSON and stored with await cache.set(key, json.dumps(stats_dict), ttl=300). The TTL is 300 seconds because dashboard data (total products, order count, revenue) changes relatively slowly — a 5-minute staleness is acceptable. The cache is not proactively invalidated because the dashboard is read-heavy and the TTL ensures eventual consistency. A future improvement could use Redis Pub/Sub to invalidate the dashboard cache when an order is created or a product is added.

**Follow-up:**
1. Why is dashboard caching keyed by both user_id and store_id?
2. How would you implement write-through cache invalidation when an order is placed?
3. What happens during a cache stampede (many requests miss simultaneously)?

### Q54. How does the rate limiter work?

**Short Answer:** The rate limiter uses a Redis sliding window algorithm via sorted sets. Each request creates a member with the current timestamp in a sorted set keyed by user IP/ID. Expired entries are removed and remaining count is checked. The default limit is 100 requests per 60 seconds, with an in-memory fallback.

**Detailed Answer:** The RateLimiter service is implemented as a FastAPI middleware or dependency. For each request, it extracts the client identifier (IP address from X-Forwarded-For or user ID if authenticated). It builds a Redis sorted set key like ratelimit:{identifier}:api. Using ZREMRANGEBYSCORE, it removes entries older than 60 seconds. Then ZADD adds the current timestamp as a member with score timestamp. ZCOUNT counts remaining entries in the window. If the count exceeds 100, it returns a 429 Too Many Requests response with Retry-After header. The TTL on the sorted set key is 120 seconds (to auto-clean if no further requests). If Redis is unreachable (connection error/timeout), the rate limiter falls back to an in-memory dictionary with a sliding window — less accurate across multiple server instances but sufficient for single-server deployments. The limit of 100 requests per 60 seconds is configurable via environment variables.

**Follow-up:**
1. How does the sliding window compare to a fixed window (reset every 60 seconds)?
2. How would you implement per-endpoint rate limits (e.g., stricter on login)?
3. What are the limitations of the in-memory fallback in a multi-instance deployment?

### Q55. How does KhataBox gracefully degrade when Redis is unavailable?

**Short Answer:** All Redis operations are wrapped in try/except blocks. If Redis is down, cache lookups return None (querying the DB directly), rate limiting falls back to in-memory, and the app continues to function with reduced performance.

**Detailed Answer:** The CacheService.get() and set() methods catch redis.exceptions.ConnectionError, TimeoutError, and asyncio.TimeoutError. On any error, get() returns None and set() silently logs the error (via logger.warning). The dashboard endpoint therefore always queries the database when Redis fails — slower but functional. The rate limiter similarly catches Redis errors and uses a Python defaultdict with sliding window logic, accurate only within a single process. The WebSocket presence tracking (Socket.IO) also degrades: if Redis is used as a pub/sub adapter for multi-instance Socket.IO, losing Redis means each instance only knows about its own connected clients. The health check endpoint (/health) reports Redis status so monitoring tools can alert. This degradation strategy ensures the app never returns 500 errors due to a Redis outage.

**Follow-up:**
1. How would you implement a circuit breaker pattern for Redis calls?
2. What monitoring metrics would you track for Redis availability?
3. Does the in-memory rate limiter fallback have security implications?

### Q56. Why use Redis instead of an in-memory cache for dashboard data?

**Short Answer:** Redis provides a shared, distributed cache across all application instances. In-memory caches are per-process, causing cache duplication and inconsistency when multiple server instances run behind a load balancer.

**Detailed Answer:** In a single-server deployment, an in-memory cache (like Python lru_cache or a simple dict) would work for dashboard data. However, KhataBox is designed to scale horizontally — multiple FastAPI instances behind a load balancer. With in-memory caching, each instance stores its own copy of the dashboard data for each user/store combination, wasting memory and causing cache misses on every instance. Worse, if instance A processes a product update, it might invalidate its local cache, but instance B would still serve stale data until its TTL expires. Redis solves this by providing a single, shared cache that all instances read from and write to. Additionally, Redis offers TTL expiry (memory-efficient cleanup), sorted sets for rate limiting, and pub/sub for real-time events — all valuable beyond simple caching. The trade-off is operational complexity (managing a Redis server), but managed Redis (Upstash, ElastiCache, Redis Cloud) minimizes this overhead.

**Follow-up:**
1. Would you still recommend Redis for a single-server deployment?
2. How does Redis persistence (RDB/AOF) affect cache performance?
3. What Redis data structures are used beyond simple key-value?

## 8. Socket.IO & Real-Time Questions

### Q57. How is Socket.IO integrated with FastAPI?

**Short Answer:** Python-socketio (python-socketio[asyncio]) is mounted as a FastAPI ASGI app using socketio.ASGIApp. It runs on the same port as the FastAPI server, multiplexed via ASGI.

**Detailed Answer:** The Socket.IO server is created with socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", redis=redis_url). It is mounted onto the FastAPI app using app.mount("/ws", socketio.ASGIApp(sio)). The /ws path handles all Socket.IO connections (WebSocket and HTTP long-polling fallback). Event handlers are registered with decorators like @sio.on("connect"), @sio.on("join_store"), @sio.on("disconnect"). Authentication happens in the connect event: the client sends an auth token in the connection payload, which is verified against the user database. Clients join rooms named by store:{store_id} to scope events. The redis parameter enables the Redis adapter for multi-instance deployments — Socket.IO events are broadcast across all instances via Redis pub/sub. The ASGI mounting means both FastAPI HTTP and Socket.IO share the same port, simplifying deployment.

**Follow-up:**
1. Why is Socket.IO mounted at /ws instead of using a separate port?
2. How does the Redis adapter for Socket.IO work across multiple server instances?
3. What happens during a Socket.IO reconnection after a network interruption?

### Q58. What real-time events does Socket.IO emit?

**Short Answer:** Socket.IO emits events for low-stock alerts (low_stock), order status changes (order_updated), new orders (new_order), and stock transfer updates (transfer_updated), scoped to specific store rooms.

**Detailed Answer:** When an event occurs (e.g., a new order is placed), the backend service calls sio.emit("new_order", order_data, room=f"store:{store_id}"). All clients that have joined that specific store room receive the event. The event payload is a JSON-serialized representation of the changed entity. Specific events include: low_stock (triggered by check_low_stock service when stock falls below threshold), order_updated (status change from pending to shipped, etc.), transfer_updated (stock transfer status changes), and inventory_updated (stock adjustments). On the frontend, a useSocket hook (or provider) manages the connection: it calls socket.connect() on mount, joins the active store room, listens for events, and dispatches actions (e.g., refresh product list on inventory_updated). The socket disconnects on unmount to avoid stale connections. Events include a reference_id for deduplication on the client side.

**Follow-up:**
1. How would you add presence indicators (show who else is viewing the same product)?
2. How is the Socket.IO connection authenticated — is a JWT sent during handshake?
3. What is the fallback behavior if WebSockets are blocked by a firewall?

### Q59. How are real-time notifications handled?

**Short Answer:** Notifications combine Socket.IO events (for in-app real-time updates) and Resend emails (for asynchronous out-of-band notifications). The NotificationService checks low stock and order statuses, deduplicates by reference_id and type, and sends via both channels.

**Detailed Answer:** The NotificationService.create_notification() method inserts a Notification record into the database (for persistence and history), then calls sio.emit("notification", notif_data, room=f"store:{store_id}") for real-time delivery. For high-priority notifications (low stock, large orders), it also sends an email via Resend. Deduplication is handled by checking if a notification with the same reference_id (e.g., product_123) and type (e.g., "low_stock") already exists within a time window — preventing duplicate alerts for the same condition. The frontend displays real-time notifications as sonner toasts (auto-dismissing) and maintains a notification bell with an unread count. Marking a notification as read calls PATCH /notifications/{id} and emits an acknowledgement event. The notification bell count is updated in real-time via Socket.IO.

**Follow-up:**
1. How would you implement user-configurable notification preferences (email only, in-app only, both)?
2. How do you handle deduplication when the same low-stock condition is checked by multiple services?
3. What is the expected latency between an event occurring and the notification appearing in the UI?

### Q60. Why use Socket.IO instead of raw WebSockets?

**Short Answer:** Socket.IO adds automatic reconnection, room-based broadcasting, event multiplexing, and HTTP long-polling fallback — features that raw WebSockets lack. The library provides a battle-tested real-time layer with minimal code.

**Detailed Answer:** Raw WebSockets require manually implementing reconnection logic (exponential backoff, jitter), room management (tracking which clients should receive which events), event naming/multiplexing, and fallback transports (some corporate networks block WebSockets). Socket.IO provides all of this out of the box: reconnection: true with configurable delays, rooms for scoping events to subsets of clients, named events (socket.emit("low_stock", data)), and automatic fallback to HTTP long-polling when WebSocket upgrade fails. The python-socketio server also supports async natively, integrating with FastAPI event loop. For a real-time inventory dashboard where multiple users need live updates on orders, stock levels, and transfers, these features are essential. The library overhead is negligible (~50KB gzipped on the client). The main downside is protocol lock-in (cannot easily connect a raw WebSocket client), but for a homogeneous frontend this is acceptable.

**Follow-up:**
1. How does Socket.IO auto-reconnection handle stale state on the client?
2. What is the memory overhead of maintaining thousands of Socket.IO connections?
3. How would you scale Socket.IO horizontally across multiple server instances?

## 9. Cloudflare R2 & File Storage Questions

### Q61. How is Cloudflare R2 integrated for file storage?

**Short Answer:** A StorageService class wraps boto3 to interact with R2 S3-compatible API. It provides upload, download, and delete methods for file objects, with graceful fallback when R2 is unconfigured.

**Detailed Answer:** The StorageService in app/services/storage.py creates a boto3 client with service_name="s3", endpoint_url from R2_ENDPOINT env var, aws_access_key_id from R2_ACCESS_KEY, and aws_secret_access_key from R2_SECRET_KEY. The endpoint URL is typically https://<account_id>.r2.cloudflarestorage.com. Files are uploaded with client.upload_fileobj(file_obj, bucket_name, object_key, ExtraArgs={"ContentType": mime_type}). Object keys are prefixed by tenant/user: uploads/{store_id}/{uuid}_{filename}. Public URLs are generated using the R2 domain (or a custom domain via Cloudflare). R2 is chosen over AWS S3 for its zero egress fees and global edge network via Cloudflare. The main trade-off is fewer features compared to S3 (no object locking, no S3 Select), but for simple file storage (product images, reports, exports), R2 is sufficient and cost-effective.

**Follow-up:**
1. How does R2 zero-egress pricing model benefit a file-heavy application?
2. How would you implement signed URLs for temporary file access?
3. What happens if the R2 bucket is in a different geographic region?

### Q62. What file types are supported for upload?

**Short Answer:** Product images (JPEG, PNG, WebP), export files (CSV, XLSX), and report PDFs. File type validation is done both on the frontend (accept attribute) and backend (MIME type checking with python-magic).

**Detailed Answer:** The upload endpoint (POST /upload) accepts multipart/form-data. The file type is validated by checking the Content-Type header and, for stronger validation, using Python python-magic library to inspect the file signature (magic bytes). Allowed MIME types are configured in a whitelist: image/jpeg, image/png, image/webp, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf. Files outside the whitelist receive a 400 error. File size is limited to 10MB (configurable) via a middleware check on Content-Length. Images are optionally resized on upload using Pillow to create thumbnails (e.g., 200x200px) for listing views. The thumbnail is also stored in R2 with a _thumb suffix on the object key. The frontend file input uses the accept attribute (e.g., accept="image/*,.csv,.xlsx,.pdf") as a first-pass filter.

**Follow-up:**
1. How would you add virus scanning to the upload pipeline?
2. How do you handle filename collisions when multiple users upload the same filename?
3. What is the best approach for generating thumbnails — client-side or server-side?

### Q63. What happens when R2 is unconfigured?

**Short Answer:** If the R2_ENDPOINT environment variable is not set, the StorageService enters a fallback mode. Uploads write to the local filesystem (uploads/ directory), and downloads serve from there. A warning is logged on startup.

**Detailed Answer:** The StorageService.__init__ checks if settings.R2_ENDPOINT is empty. If so, it sets self._fallback = True and does not initialize the boto3 client. The upload method writes to a local directory (e.g., local_storage/{store_id}/{filename}), creates the directory if it does not exist, and records the local path. The get_url method returns a relative URL to the local file (served by FastAPI StaticFiles mount). The delete method removes the local file. This fallback is intended for development and testing environments where R2 credentials are not available. A startup log message (logger.warning("R2 not configured — using local file storage")) alerts developers. In production, omitting the R2 config would cause the app to still function, but files would not be persisted across server restarts (if using ephemeral storage) or would accumulate on the server disk.

**Follow-up:**
1. How would you ensure local files are not lost during a server restart in development?
2. Could the fallback use an alternative cloud provider (e.g., S3, GCS) instead of local storage?
3. How do you migrate files from local storage to R2 when deploying to production?

### Q64. How are product images uploaded and served?

**Short Answer:** An image upload component on the product form sends the file to POST /upload via multipart/form-data. The returned URL (pointing to R2) is stored on the Product.image_url field. Images are served via R2 public URL with Cloudflare caching.

**Detailed Answer:** The frontend upload flow: (1) User selects a file in the product form image input. (2) A preview is shown using URL.createObjectURL(file). (3) On form submit, if a new file is present, it is uploaded via clientApi.upload("/upload", formData) which uses multipart/form-data. (4) The API returns { url: "https://r2.example.com/uploads/store_123/uuid_image.jpg" }. (5) This URL is set as product.image_url and sent as part of the product create/update payload. The backend POST /upload handler receives the file, generates a unique UUID-based filename (preventing path traversal and collisions), calls storage_service.upload(), and returns the public URL. For serving, Cloudflare edge caches the image (Cache-Control headers set to public, max-age=31536000, immutable for optimal caching). If an image is replaced, the old object is deleted from R2. The product list view uses the thumbnail URL (with _thumb suffix for smaller size) to reduce bandwidth.

**Follow-up:**
1. How would you implement client-side image compression before upload?
2. What happens if the image upload fails mid-form submission?
3. How do you handle image deletion when a product is deleted?

## 10. Resend & Email Questions

### Q65. How is Resend integrated for email delivery?

**Short Answer:** Resend Python SDK (resend.Emails.send) is used in the NotificationService and OrderService to send transactional emails — low-stock alerts, order confirmations, and password reset links.

**Detailed Answer:** The Resend client is initialized in app/services/email.py with resend.api_key = settings.RESEND_API_KEY. The send_email(to, subject, html_body) function calls resend.Emails.send({ "from": "noreply@khatabox.app", "to": to, "subject": subject, "html": html_body }). HTML templates are rendered using Jinja2 from app/templates/email/ directory (e.g., order_confirmation.html, low_stock_alert.html). Templates receive context variables like {{ user_name }}, {{ order_id }}, {{ items }}. The email service is async-safe: the Resend SDK call is wrapped in asyncio.to_thread or uses the async HTTP client to avoid blocking the event loop. Resend is chosen for its reliable deliverability, simple API, and generous free tier (100 emails/day). If the API key is not configured, send_email logs the email content instead of sending (for development).

**Follow-up:**
1. How would you add email tracking (opens, clicks) using Resend features?
2. What is the fallback if Resend API is temporarily unavailable?
3. How are email templates version-controlled and tested?

### Q66. What triggers an email notification?

**Short Answer:** Emails are triggered by low-stock conditions (stock falls below threshold), order status changes (confirmation, shipped, delivered), and account events (registration welcome, password reset).

**Detailed Answer:** The NotificationService.check_low_stock() method runs periodically (or on each stock update) and compares product.stock_quantity against product.low_stock_threshold. If stock is below threshold and no recent notification exists for that product (deduplication via reference_id), it creates a notification and calls send_email to the store owner/manager. Order confirmation emails are sent from OrderService.create_order() after the transaction commits successfully — the email includes order items, totals, and estimated delivery date. Account events: POST /auth/register triggers a welcome email; POST /auth/forgot-password triggers a password reset email with a time-limited token. Each email type has a dedicated Jinja2 template. Email sending is fire-and-forget: failures are logged but not retried automatically (a future improvement would add a retry queue with exponential backoff).

**Follow-up:**
1. How would you implement a daily digest email summarizing low-stock items?
2. What PII considerations exist when sending order details via email?
3. How would you test email deliverability without sending real emails?

### Q67. How are email failures handled?

**Short Answer:** Email sending is wrapped in try/except. On failure, the error is logged, the notification is still created (marked as email_failed), and Sentry captures the exception. No automatic retry is implemented.

**Detailed Answer:** The send_email function catches resend.exceptions.ResendError and general Exception. On failure, it logs logger.error(f"Failed to send email to {to}: {e}"), and optionally captures the exception with sentry_sdk.capture_exception(e). The calling service (e.g., NotificationService) is notified of the failure via a return value or exception. In the current implementation, the in-app notification is still saved to the database and sent via Socket.IO even if the email fails — the email is supplemental, not critical. A notifications.email_failed boolean could be set to true for retry logic. A future improvement would add a background task queue (e.g., Celery or ARQ) to retry failed email deliveries with exponential backoff (max 3 retries). For critical emails (password resets), a synchronous retry with a 1-second delay is attempted once before failing.

**Follow-up:**
1. How would you implement an email retry queue with backoff and max retries?
2. Should a failed email block the API response or be sent asynchronously?
3. How would you monitor email delivery success rates in production?

## 11. ML Forecasting Questions

### Q68. Why was Random Forest chosen for demand forecasting?

**Short Answer:** Random Forest was chosen for its robustness to overfitting, ability to capture non-linear relationships, built-in feature importance, and good performance on the small synthetic dataset (R²=0.862) without extensive hyperparameter tuning.

**Detailed Answer:** For a proof-of-concept forecasting system, Random Forest offers several advantages over alternatives like Linear Regression (too simplistic for non-linear demand patterns), ARIMA (requires stationary time series and extensive parameter tuning), or deep learning (overkill for the data volume). Random Forest with 100 trees and max_depth=10 handles interactions between features (e.g., how holidays affect different product categories) without explicit feature engineering. It provides feature importance scores out of the box, which helps explain predictions. The confidence score derived from tree variance (standard deviation of individual tree predictions / mean prediction) is intuitive and useful for decision-making. The model achieves R²=0.862 on synthetic test data, which is acceptable for an MVP. However, for true time-series forecasting, Random Forest ignores temporal dependencies (it treats each day as an independent sample). A future iteration would use XGBoost with time-series cross-validation or a dedicated forecasting model like Prophet.

**Follow-up:**
1. What are the limitations of Random Forest for time-series forecasting?
2. How would you transition from Random Forest to a deep learning model (LSTM)?
3. How is the model retrained with new data without downtime?

### Q69. How is the model trained and persisted?

**Short Answer:** A training script (train_model.py) generates synthetic sales data, trains the RandomForestRegressor, evaluates it, and pickles the model to model.bkl using Python pickle with a scikit-learn compatible protocol. The model is loaded at app startup.

**Detailed Answer:** The training script performs the following steps: (1) Generates synthetic data for 50 products over 365 days, incorporating seasonality (higher on weekends/holidays), trend (slow growth), and random noise. (2) Engineers features: product_id (label-encoded), day_of_week (0-6), month (1-12), is_holiday (0/1), category_encoded (from product metadata). (3) Splits into train/test (80/20). (4) Trains RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42). (5) Evaluates with R², MAE, RMSE. (6) Serializes with pickle.dump(model, open("model.bkl", "wb")). The pickle protocol is explicitly set to a version compatible with the scikit-learn version (1.9.0, pinned in requirements). At app startup (in the lifespan handler), the model is loaded: model = pickle.load(open("model.bkl", "rb")). The model object is stored in app.state.ml_model for access across requests. The training script is separate from the app container and run as a one-off job.

**Follow-up:**
1. Why use pickle instead of ONNX or MLflow for model serialization?
2. How do you ensure model versioning and rollback capability?
3. What happens if the pickle file is corrupted or missing on startup?

### Q70. How is the confidence score computed?

**Short Answer:** The confidence score is derived from the variance of predictions across individual trees. A RandomForestRegressor estimators_ attribute gives each tree prediction; the coefficient of variation (std/mean) is inverted to produce a 0-1 confidence score.

**Detailed Answer:** After calling model.predict(features) (which averages all tree predictions), the code collects individual tree predictions: tree_preds = np.array([tree.predict(features) for tree in model.estimators_]). The mean mu = tree_preds.mean() and standard deviation sigma = tree_preds.std() are computed. The coefficient of variation cv = sigma / mu measures relative dispersion. Confidence is computed as confidence = max(0, min(1, 1 - cv)). If all trees agree (sigma near 0), confidence approaches 1.0. If trees disagree widely (high sigma), confidence is low. This is a heuristic — it captures model uncertainty but not data uncertainty (e.g., it does not account for whether the input features are within the training distribution). A more rigorous approach would use conformal prediction or quantile regression forests, but the variance-based method is simple and computationally cheap (no retraining required).

**Follow-up:**
1. How would you detect out-of-distribution inputs where the model confidence should be lower?
2. What alternative uncertainty quantification methods exist for Random Forests?
3. How is the confidence score used in the frontend — is it displayed to users?

### Q71. What features does the forecasting model use?

**Short Answer:** Five features: product_id (encoded), day_of_week, month, is_holiday (binary), and category_encoded. The target variable is historical units_sold.

**Detailed Answer:** Feature engineering is done in the training script and the prediction endpoint. product_id is label-encoded (mapped to an integer) to allow the model to learn product-specific base demand. day_of_week (0=Monday, 6=Sunday) captures weekly seasonality — most retail products have different demand on weekdays vs weekends. month (1-12) captures annual seasonality (holiday spikes, summer slumps). is_holiday is a binary flag set from a configurable holiday calendar (e.g., Christmas, Black Friday, local holidays). category_encoded is a label-encoded product category (e.g., Electronics=0, Clothing=1, Food=2) to allow the model to learn category-level patterns. No lag features (e.g., sales from the previous week) are included because the current model treats each day independently. Adding lag features would significantly improve forecast accuracy but requires careful handling of missing values and would make the model truly time-series aware. Feature importance analysis shows product_id and is_holiday as the top two features.

**Follow-up:**
1. What additional features would you add to improve forecast accuracy?
2. How would you handle feature encoding for new products not seen during training?
3. Why are lag features important for time-series forecasting?

### Q72. How does the app handle model unavailability?

**Short Answer:** If the model file is not found or fails to load, the app logs a warning and starts without the ML feature. The /forecast endpoint returns a 503 Service Unavailable with a clear error message.

**Detailed Answer:** During the lifespan handler, model loading is wrapped in try/except. If FileNotFoundError or pickle.UnpicklingError occurs, app.state.ml_model is set to None, and a warning is logged: logger.warning("ML model not loaded — forecasting unavailable"). The /forecast endpoint checks if app.state.ml_model is None: and returns HTTPException(status_code=503, detail="Forecasting model not available. Contact administrator."). This prevents 500 errors and provides a clear signal to the frontend. The frontend forecast component can show a "Forecast temporarily unavailable" banner instead of crashing. In production, this situation should never occur because the model is deployed as part of the container image, but the graceful degradation protects against file corruption, version mismatches, or filesystem issues. A health check endpoint (/health) also reports the model loaded status.

**Follow-up:**
1. How would you implement a health check that specifically tests the ML model?
2. Could the model be loaded lazily (first request) instead of at startup?
3. How would you hot-reload the model without restarting the server?

### Q73. How is the seasonality factor calculated?

**Short Answer:** The seasonality factor is a multiplier applied to the base prediction: 1.0 + 0.15 for holidays and + 0.10 for weekends, yielding a range of 1.0 (normal weekday) to 1.25 (holiday weekend).

**Detailed Answer:** The seasonality_factor is computed in the /forecast endpoint after the model predicts the base value. The logic: factor = 1.0; if date.weekday() >= 5 (Saturday or Sunday), factor += 0.10; if date in HOLIDAY_CALENDAR (configurable set of dates), factor += 0.15. The final prediction is predicted_units * factor. The factor is also returned separately in the response for transparency — the frontend can display "Base prediction: 50 units, Seasonality adjustment: +25% (weekend + holiday)". The coefficients (0.15, 0.10) are based on domain knowledge for retail: holidays typically boost sales by 15% and weekends by 10%. In a production system, these coefficients would be learned from historical data (e.g., comparing average sales on holidays vs non-holidays). The seasonality factor and the ML prediction are complementary: the Random Forest can learn some seasonal patterns from day_of_week and is_holiday features, but the explicit factor provides a tunable override that the business can adjust without retraining the model.

**Follow-up:**
1. How would you auto-tune the seasonality coefficients from historical data?
2. Should the seasonality factor be applied before or after the ML prediction?
3. How do you handle seasonal events that do not recur annually (e.g., one-time promotions)?

### Q74. What metrics are used to evaluate the model?

**Short Answer:** The model is evaluated using R² (0.862), Mean Absolute Error (MAE), and Root Mean Squared Error (RMSE). Feature importance scores are also analyzed to validate that the model is learning meaningful patterns.

**Detailed Answer:** The training script computes three metrics on the held-out test set: (1) R² (coefficient of determination) measures the proportion of variance explained by the model — 0.862 means 86.2% of demand variability is captured, which is good for a proof-of-concept. (2) MAE (Mean Absolute Error) gives the average prediction error in the same units as the target (units sold) — e.g., MAE of 3.2 means predictions are off by 3.2 units on average. (3) RMSE (Root Mean Squared Error) penalizes larger errors more heavily — an RMSE of 5.1 compared to MAE of 3.2 indicates some predictions have significant errors. Feature importance analysis shows product_id (40%), is_holiday (25%), day_of_week (20%), month (10%), and category_encoded (5%). These metrics are logged during training and can be exposed via a /model/metrics endpoint for monitoring. In production, actual vs predicted values would be logged to track model drift over time, triggering retraining when MAE exceeds a threshold.

**Follow-up:**
1. What is model drift and how would you detect it in production?
2. How would you set up A/B testing to compare model versions?
3. What metrics would you track for business impact (not just model accuracy)?
## 12. System Design Questions

### Q75. What is the overall system architecture?

**Short Answer:** KhataBox follows a decoupled frontend/backend architecture: a Next.js 16 App Router frontend communicates with a FastAPI Python backend over HTTP REST (proxied through Next.js API routes) and WebSockets (Socket.IO). PostgreSQL is the primary database, Redis provides caching/rate-limiting, and Cloudflare R2 stores files.

**Detailed Answer:** The architecture is split into three logical tiers. (1) Presentation tier: Next.js 16 with React 19, TypeScript, Tailwind CSS v4, and shadcn/ui renders all UI as client components. Auth.js v5 manages session state via JWT cookies. (2) API tier: FastAPI running on Uvicorn handles all business logic — 61+ REST endpoints organized by domain (products, orders, customers, inventory, auth, dashboard, ML). A catch-all Next.js API route proxies /api/* to FastAPI. Socket.IO runs on the same FastAPI process for real-time features. (3) Data tier: PostgreSQL (via async SQLAlchemy 2.0) stores all relational data with row-level multi-tenancy by store_id. Redis caches dashboard stats and rate-limits API calls. Cloudflare R2 stores product images and exports. External services include Resend (email), Sentry (error tracking), and PostHog (analytics). The ML forecasting model (Random Forest) is loaded in-process at startup. This separation allows independent scaling of frontend and backend, enables the Python ecosystem for data/ML tasks, and keeps the frontend stack modern and productive.

**Follow-up:**
1. What are the trade-offs of the Next.js proxy pattern vs direct frontend-to-backend communication?
2. How would you migrate this to a microservices architecture?
3. What is the deployment topology — how are the frontend and backend connected in production?

### Q76. How is data consistency maintained across the system?

**Short Answer:** Database transactions (SQLAlchemy async) ensure atomicity for multi-step operations (e.g., order creation with stock decrement). Redis cache TTLs provide eventual consistency for cached dashboard data. The Stock Transfer model uses a state machine with atomic operations.

**Detailed Answer:** Data consistency is handled at multiple levels. (1) Database level: SQLAlchemy async sessions wrap critical operations in transactions. For example, creating an order inserts the order, inserts line items, and decrements stock quantities within a single async with db.begin(): block. If any step fails, all changes are rolled back. (2) Application level: The Stock Transfer model uses a state machine (pending ? approved ? completed, or pending ? rejected). Status transitions are guarded by business logic that checks the current status before allowing the next. (3) Cache level: Dashboard stats cached in Redis have a 300-second TTL, providing eventual consistency — a newly created order may not appear on the dashboard for up to 5 minutes. This is acceptable for a management dashboard. (4) Real-time level: Socket.IO events provide near-real-time updates for notifications and inventory changes, but these are optimistic — the source of truth is always the database. There is no distributed transaction across services; the system relies on the database as the single source of truth.

**Follow-up:**
1. What consistency issues could arise with the Redis cache and how do you mitigate them?
2. How would you implement exactly-once processing for critical events (e.g., payment webhooks)?
3. What happens if a stock decrement succeeds but the order creation fails?

### Q77. How is inventory managed across stores?

**Short Answer:** Inventory is tracked per product per store in the products table via store_id. Stock transfers between stores create transfer records and dual inventory movement records atomically. A low-stock threshold on each product triggers alerts.

**Detailed Answer:** Each Product record has a store_id foreign key, making stock quantity inherently store-scoped. When a product is sold, the stock decrement happens on the specific store product record. For store-to-store transfers, the StockTransfer model records source_store_id, destination_store_id, product_id, quantity, and status. On status change to "completed", a database transaction creates two InventoryMovement records: one with negative quantity at the source store and one with positive quantity at the destination store. Both movements reference the same transfer_id for traceability. The product stock_quantity at the source is decremented and at the destination is incremented within the same transaction. Low-stock alerts are configurable per product via low_stock_threshold field. The check_low_stock service runs after each stock-affecting operation and creates notifications if quantity falls below threshold. This model ensures a complete audit trail of all stock movements while maintaining data integrity.

**Follow-up:**
1. How would you handle inventory reservations (hold stock for a pending order)?
2. What happens if the destination store does not sell the same product?
3. How would you implement batch stock adjustments (e.g., inventory count reconciliation)?

### Q78. How is the storage service abstracted?

**Short Answer:** The StorageService class defines an interface (upload, download, delete, get_url) with two implementations: R2Storage (boto3-based) and LocalStorage (filesystem-based). The active implementation is selected at startup based on configuration.

**Detailed Answer:** The StorageService is an abstract base class (or Protocol) defining methods: async upload(bucket, key, file) ? str, async download(bucket, key) ? bytes, async delete(bucket, key), and get_url(bucket, key) ? str. The R2Storage implementation uses boto3 with S3-compatible API for Cloudflare R2. The LocalStorage implementation writes to a configurable local directory and serves via StaticFiles mount. The factory function create_storage_service() checks if R2_ENDPOINT is configured; if yes, returns R2Storage; otherwise, returns LocalStorage. This abstraction allows easy addition of new storage backends (AWS S3, Google Cloud Storage, MinIO) by implementing the same interface. It also simplifies testing: tests inject a LocalStorage or an in-memory mock. The service is instantiated once at startup and injected into handlers via a dependency or stored in app.state.

**Follow-up:**
1. How would you implement an in-memory storage backend for unit tests?
2. What would it take to add AWS S3 as a third storage backend?
3. How do you handle file URL generation differently for public vs private files?

### Q79. How are notifications abstracted and delivered?

**Short Answer:** The NotificationService manages in-app notification records (persisted in PostgreSQL), delivers real-time via Socket.IO, and optionally sends email via Resend. Deduplication by reference_id and type prevents duplicate alerts.

**Detailed Answer:** The NotificationService.create_notification() method accepts type (e.g., "low_stock", "order_update"), reference_id (e.g., "product_123"), user_id, store_id, and message. It first checks if a notification with the same reference_id and type exists within a configurable time window (default 1 hour). If a duplicate is found, it skips creation (deduplication). Otherwise, it inserts a Notification record into PostgreSQL (for persistence and history), emits a "notification" event via Socket.IO to the relevant store room, and optionally calls send_email() for high-priority notifications. The Notification model includes fields: id, user_id, store_id, type, reference_id, title, message, is_read, created_at. Unread count queries are efficient via an index on (user_id, is_read). Marking as read updates is_read and emits an acknowledgment. The service is called from various points: check_low_stock (after stock update), OrderService (on status change), TransferService (on status change). This centralized notification layer ensures consistent delivery regardless of the triggering event.

**Follow-up:**
1. How would you implement push notifications for mobile devices?
2. What is the retention policy for old notifications?
3. How would you implement notification batching (e.g., daily summary)?

### Q80. How does the seed script work?

**Short Answer:** The seed script (seed.py) is idempotent: it checks if data already exists before inserting. It creates 50 products, 8 suppliers, 5 customers, 30 orders, 10 purchase orders, 3 stores, 3 transfers, and 6 notifications with realistic, interconnected data.

**Detailed Answer:** The seed script is located in app/seed.py and is run during the lifespan handler (or via a CLI command). It starts by checking if any records exist in the stores table; if yes, it skips seeding entirely (idempotency guard). Data generation uses Faker (or hardcoded arrays) for realistic names, SKUs, prices, etc. The seed creates 3 stores first, then creates a default admin user with known credentials (email: admin@khatabox.com, password: admin123). Products are distributed across stores with varying stock levels (including some below low_stock_threshold to trigger alerts). Orders are created with statuses distributed across the order lifecycle. Stock transfers are created in various states (pending, approved, completed). Notifications are seeded with mixed read/unread status. All inserts use async SQLAlchemy sessions with commit at the end. If the script fails mid-way, the idempotency guard prevents partial re-execution. This seed data is used for both development demos and integration testing.

**Follow-up:**
1. Why is idempotency important for the seed script?
2. How would you add environment-specific seed data (dev vs staging)?
3. How do you reset the database and re-seed during development?

## 13. Scalability Questions

### Q81. How would you scale the database layer?

**Short Answer:** Scale vertically first (larger instance). Then add read replicas for read-heavy queries (dashboard, reports) with SQLAlchemy read/write splitting. Shard by store_id if a single store exceeds performance requirements.

**Detailed Answer:** The first step is vertical scaling: increasing PostgreSQL instance resources (CPU, RAM, disk IOPS). For most SaaS applications with store-level data isolation, vertical scaling suffices for a long time. The second step is adding read replicas for analytics queries (dashboard, reports, exports) that can tolerate slightly stale data. SQLAlchemy can be configured with a AsyncEngine for writes and a separate AsyncEngine for reads, routing queries via a custom session factory or a middleware. The third step, if a single store grows extremely large (millions of products, billions of orders), is horizontal sharding by store_id. A proxy (like PgBouncer or a custom routing layer) would direct requests to the appropriate shard based on store_id hash. This is complex and only warranted at massive scale. Indexing strategy (covering indexes for common queries, partial indexes for soft-delete filters) and connection pooling (pgbouncer, max_connections tuning) are essential at every scale. The current pool_size=10 and max_overflow=20 settings are tuned for a moderate workload.

**Follow-up:**
1. How would SQLAlchemy read/write splitting work with async sessions?
2. What are the trade-offs of sharding by store_id vs by region?
3. How would you implement database connection pooling for the async engine?

### Q82. How does the rate limiter perform under high concurrency?

**Short Answer:** The Redis-based rate limiter is highly performant — ZREMRANGEBYSCORE, ZADD, and ZCOUNT are O(log N) operations on sorted sets. The Redis instance handles thousands of requests per second. The in-memory fallback is single-process only.

**Detailed Answer:** The Redis sliding window algorithm performs three Redis commands per request: ZREMRANGEBYSCORE (remove old entries, O(log N)), ZADD (add current timestamp, O(log N)), ZCOUNT (count remaining, O(log N)). With the key TTL set to 120 seconds, the sorted set size is bounded by max_requests per window (100), so each operation is effectively O(log 100) ˜ constant time. A single Redis instance can handle 50,000-100,000 ops/second, so the rate limiter is not a bottleneck. The in-memory fallback uses a Python defaultdict(deque) with a sliding window — it scans and pops expired entries on each check, which is O(N) in the window size but still fast for 100 entries. The main limitation of the in-memory fallback is accuracy in multi-instance deployments: each instance has its own counter, so a user could exceed the limit by sending requests to different instances. The Redis adapter is strongly recommended for production deployments with multiple server instances.

**Follow-up:**
1. How would you implement distributed rate limiting without Redis?
2. What happens if the rate limiter key space grows unbounded (e.g., many unique IPs)?
3. How would you add per-user rate limits that differ from per-IP limits?

### Q83. How is dashboard performance optimized for large datasets?

**Short Answer:** The dashboard uses Redis caching (300s TTL), concurrent query execution via asyncio.gather, and database indexes on query columns. For very large datasets, pre-aggregated materialized views or time-series rollups would be needed.

**Detailed Answer:** Current optimizations: (1) Redis cache with 5-minute TTL reduces database load by ~95% for the dashboard endpoint. (2) Five concurrent queries via asyncio.gather cut total latency to the slowest query. (3) B-tree indexes on (store_id, created_at) for date-range counts. (4) The dashboard only returns summary stats (counts, sums), not row-level data. For scale beyond 100K orders per store: (1) Materialized views could pre-aggregate daily/weekly/monthly stats, refreshed periodically. (2) Partitioning by month on orders and inventory_movements would allow partition pruning for time-range queries. (3) A dedicated analytics database (ClickHouse, TimescaleDB) could handle complex aggregations. (4) The aggregation queries could be offloaded to a background job (Celery) that updates the dashboard cache asynchronously, trading freshness for performance. The current approach is sufficient for thousands of orders per store but would need re-evaluation at 100K+ scale.

**Follow-up:**
1. How would you design a materialized view for monthly revenue aggregation?
2. What are the trade-offs of real-time aggregation vs pre-computed rollups?
3. How would you handle time-zone differences in daily aggregation?

### Q84. How are file uploads handled at scale?

**Short Answer:** Files are uploaded directly to the server (multipart/form-data), then streamed to Cloudflare R2. File size is limited to 10MB. For larger files, direct-to-S3 uploads using pre-signed URLs would be implemented.

**Detailed Answer:** The current flow: (1) Client sends file as multipart/form-data to POST /upload. (2) FastAPI reads the file into memory (UploadFile) and validates type/size. (3) StorageService.upload() streams the file to R2 using boto3 upload_fileobj. This works well for files under 10MB but has two bottlenecks at scale: (a) the file passes through the Next.js proxy (extra network hop), (b) FastAPI buffers the file in memory (memory pressure under concurrent uploads). For a production SaaS handling frequent uploads, a direct-to-R2 approach would be better: the frontend requests a pre-signed URL from GET /upload/presign?filename=..., then uploads directly to R2 from the browser using the S3 API. This bypasses the server entirely, reducing latency and server load. The server would still validate after upload (e.g., scan for malware, generate thumbnails). Resumable uploads (tus protocol) would be added for very large files (>100MB). The current 10MB limit is appropriate for product images and CSV exports.

**Follow-up:**
1. How would you implement pre-signed URL uploads for direct-to-R2?
2. What is the maximum reasonable file size for multipart upload through the proxy?
3. How would you handle concurrent uploads from many users?

### Q85. How would you scale the ML prediction service?

**Short Answer:** The scikit-learn model is loaded in-process, so it scales horizontally with the number of FastAPI instances. For higher throughput, the model could be served via a separate ML service (BentoML, MLflow) with auto-scaling.

**Detailed Answer:** Current architecture: the RandomForest model is loaded into each FastAPI worker process at startup. Predictions are in-memory function calls — typically <10ms each. This scales linearly: 2 server instances handle 2x the prediction throughput. The bottleneck is the FastAPI process itself (CPU for request handling, DB queries for feature retrieval). For 100+ predictions/second: (1) Move the model to a dedicated ML inference service using BentoML or MLflow Serving, deployed on Kubernetes with auto-scaling based on request queue depth. (2) The inference service could use GPU-accelerated libraries (e.g., cuML, ONNX Runtime) for faster predictions. (3) Batch predictions: the /forecast/batch endpoint accepts multiple (product_id, date) pairs and returns predictions in a single response, amortizing overhead. (4) Model caching: predictions for common (product_id, day_of_week, month) combinations could be pre-computed and cached. The current single-model approach is fine for an MVP serving <10 predictions/second.

**Follow-up:**
1. How would you implement a dedicated ML inference service with FastAPI?
2. What are the trade-offs of in-process model loading vs a separate service?
3. How would you version and A/B test different model versions in production?

### Q86. How would you scale Socket.IO for many concurrent connections?

**Short Answer:** Use the Redis adapter for Socket.IO to share state across multiple server instances. Each instance handles its own WebSocket connections, and Redis pub/sub broadcasts events to all instances.

**Detailed Answer:** The python-socketio library supports a Redis adapter: sio = socketio.AsyncServer(async_mode="asgi", redis="redis://..."). When sio.emit() is called, the event is published to Redis. All server instances subscribe to Redis channels and forward the event to their local connected clients. This allows horizontal scaling: add more server instances behind a load balancer to handle more concurrent connections. The load balancer must support sticky sessions (session affinity) because a client WebSocket connection is pinned to a specific server — Socket.IO long-polling fallback also requires stickiness. For very large deployments (>10K concurrent connections): (1) Consider using a dedicated WebSocket proxy (like Socket.IO Kubernetes adapter or a custom solution using NATS/Redis pub/sub). (2) Use a CDN or edge network that supports WebSocket termination (Cloudflare, Fastly). (3) Monitor memory per connection (~50-100KB per idle WebSocket connection). The current setup handles hundreds of concurrent connections easily; the Redis adapter and sticky sessions are the key scaling enablers.

**Follow-up:**
1. Why does Socket.IO require sticky sessions in a multi-instance deployment?
2. How would you monitor the number of active WebSocket connections?
3. What happens when a server instance goes down — do clients reconnect?

### Q87. How would you cache product catalogs for better performance?

**Short Answer:** Product list endpoints use database-level pagination and indexing (store_id, name). For read-heavy workloads, Redis could cache serialized product lists per page. For search, the GIN-indexed TSVECTOR handles full-text queries efficiently.

**Detailed Answer:** Currently, product listing queries use SELECT ... FROM products WHERE store_id = :sid ORDER BY name LIMIT :limit OFFSET :offset with a B-tree index on (store_id, name). This is efficient for thousands of products but slows down for high-offset pagination. Caching strategies: (1) Page-level Redis cache: key products:{store_id}:page:{page_no}:sort:{sort_field} with TTL 60s. Cache is invalidated when any product in the store is created, updated, or deleted. (2) For frequently accessed products (top sellers), a Redis sorted set with product IDs and view/sales count. (3) For search, PostgreSQL GIN-indexed TSVECTOR provides fast full-text search without an external search service. At scale (>100K products per store), consider dedicated search (Elasticsearch, Meilisearch) synced via change data capture (CDC) or periodic indexing. The product list endpoint also supports filtering by category and price range, which can be covered by composite indexes. The current approach is designed for thousands of products per store.

**Follow-up:**
1. How would you invalidate the product cache when a single product changes?
2. What are the trade-offs of database pagination vs keyset (cursor-based) pagination?
3. How would you integrate Elasticsearch without adding operational complexity?

### Q88. How are concurrent stock updates handled?

**Short Answer:** PostgreSQL row-level locking (SELECT ... FOR UPDATE) is used within transactions to prevent race conditions when multiple users update the same product stock simultaneously.

**Detailed Answer:** When processing an order that decrements stock, the service uses: product = await db.get(Product, product_id, with_for_update=True) or await db.execute(select(Product).where(Product.id == pid).with_for_update()). This acquires a row-level lock on the product row, preventing other transactions from reading or writing that row until the current transaction commits. If two orders for the same product arrive concurrently, the second transaction blocks until the first completes. This prevents overselling. The lock is released when the transaction commits or rolls back. For high-contention products (flash sales), consider: optimistic locking with a version column (product.version incremented on each update — retry on version mismatch), or queue-based processing (the stock update is queued and processed sequentially). The with_for_update approach is correct and simple but reduces concurrency under high contention. The timeout for lock wait is configured at the database level (lock_timeout setting).

**Follow-up:**
1. What is the difference between row-level and table-level locking?
2. How would you handle deadlocks in concurrent stock updates?
3. Could optimistic locking (version column) be more performant than pessimistic locking?

### Q89. What indexes would you add for reporting and analytics?

**Short Answer:** Covering indexes on (store_id, created_at) for time-range queries, composite indexes on (store_id, status) for status-based filtering, and partial indexes for common filtered queries (e.g., WHERE status = active AND deleted_at IS NULL).

**Detailed Answer:** Reporting queries common in the dashboard include: "total orders per month", "revenue by product category", "low stock counts", and "recent orders". The indexes supporting these are: (1) ix_orders_store_date on (store_id, created_at) covering a common time-range filter. (2) ix_orders_store_status on (store_id, status) for "orders by status" reports. (3) ix_products_store_lowstock — a partial index: CREATE INDEX ix_products_low_stock ON products (store_id) WHERE stock_quantity <= low_stock_threshold. (4) ix_inventory_movements_store_product on (store_id, product_id, created_at) for stock movement history. (5) ix_order_items_order on (order_id) for order detail queries. Composite indexes are designed to be covering where possible (include all columns referenced in the SELECT). The database EXPLAIN ANALYZE output is reviewed after adding new reports to identify full-table scans. Redundant indexes are dropped to avoid write overhead. For heavy analytics workloads, a separate reporting database with aggregations is recommended.

**Follow-up:**
1. What is a covering index and how does it differ from a regular index?
2. How would you index JSONB columns used for dynamic product attributes?
3. How do you decide when to create a partial index vs a full index?
## 14. Deployment Questions

### Q90. What is the deployment architecture?

**Short Answer:** The frontend (Next.js) and backend (FastAPI) are containerized separately with Docker. They run behind an Nginx reverse proxy (or Cloudflare) on a single VPS for MVP. The database (PostgreSQL) and Redis run as managed services.

**Detailed Answer:** The deployment consists of four containers/services: (1) Next.js frontend (Docker image with output: "standalone" for optimized size), served by Node.js on port 3000. (2) FastAPI backend (Docker image with Uvicorn), served on port 8000. (3) PostgreSQL (managed — e.g., Supabase, AWS RDS, or Docker for self-hosted). (4) Redis (managed — Upstash, ElastiCache, or Docker). Nginx (or Cloudflare Tunnel) acts as the reverse proxy: it terminates TLS, serves static assets (Next.js) directly or proxies to the Node.js process, and routes /api/* to FastAPI. The proxy also handles WebSocket upgrades for Socket.IO. Environment variables are injected via Docker Compose or Kubernetes secrets. For CI/CD, GitHub Actions builds both Docker images, runs tests, and deploys to a VPS (DigitalOcean, Hetzner) or Kubernetes cluster. This architecture is simple to manage and monitor while allowing independent scaling of the frontend and backend.

**Follow-up:**
1. Why use a reverse proxy (Nginx) instead of exposing Next.js and FastAPI directly?
2. How would you migrate from a single VPS to Kubernetes?
3. What is the benefit of managed PostgreSQL (RDS) over self-hosted?

### Q91. How are environment variables managed?

**Short Answer:** Environment variables are stored in a .env file locally for development and injected via Docker Compose/Kubernetes secrets for production. The frontend uses NEXT_PUBLIC_ prefixed vars, and the backend uses a Pydantic Settings class.

**Detailed Answer:** For the backend, a Settings class (using pydantic-settings) reads environment variables with defaults, providing validation and type coercion. It loads from a .env file via model_config = SettingsConfigDict(env_file=".env"). Key variables: DATABASE_URL, REDIS_URL, JWT_SECRET, CORS_ORIGINS, R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, RESEND_API_KEY, SENTRY_DSN, POSTHOG_KEY. For the frontend, Next.js convention uses NEXT_PUBLIC_* prefix for client-exposed variables (e.g., NEXT_PUBLIC_API_URL). All other variables are server-only and accessed via process.env.* during server-side rendering or API routes. In production, variables are injected via Docker Compose (environment: block or .env file referenced in compose), Kubernetes (ConfigMap and Secret), or the hosting platform dashboard (Vercel, Railway). Secrets (JWT_SECRET, R2_ACCESS_KEY, etc.) are never committed to version control; they are stored in the CI/CD secrets manager and injected at deploy time.

**Follow-up:**
1. How would you rotate a secret (e.g., JWT_SECRET) without downtime?
2. What is the risk of NEXT_PUBLIC_ variables being exposed in the browser?
3. How do you validate that all required environment variables are set on startup?

### Q92. How is CORS managed in production?

**Short Answer:** CORS is configured on FastAPI via CORSMiddleware with allow_origins set to the frontend domain from the CORS_ORIGINS env var. In production, this is a single origin (e.g., https://khatabox.app). The Next.js proxy also handles CORS at the edge.

**Detailed Answer:** The FastAPI backend CORS configuration uses CORSMiddleware with allow_origins parsed from the comma-separated CORS_ORIGINS environment variable. For production, this is set to https://khatabox.app (or https://app.khatabox.com if subdomain-based). The allow_credentials=True setting requires explicit origins (not *), which is why the env var is used. In development, it is set to http://localhost:3000. The Next.js proxy at /api/[...path]/route.ts also adds CORS headers — this is a secondary layer but should match the FastAPI configuration. If the frontend and backend are served from the same domain (via Nginx reverse proxy), CORS is not needed for the production proxy because there is no cross-origin request. However, CORS is still configured on FastAPI for direct API access (e.g., mobile apps, external integrations). The allow_methods and allow_headers are set to ["*"] for flexibility but could be tightened to specific values in production.

**Follow-up:**
1. Why does allow_credentials=True prevent using allow_origins=["*"]?
2. How would you handle CORS for multiple frontend domains (e.g., app.khatabox.com and admin.khatabox.com)?
3. What is a preflight request and when does the browser send one?

### Q93. How is CI/CD configured?

**Short Answer:** GitHub Actions runs tests on every push (backend pytest, frontend Vitest), builds Docker images, and deploys to production on merge to main. The pipeline includes linting, type checking, and security scanning.

**Detailed Answer:** The CI/CD pipeline (.github/workflows/ci.yml) has three stages. (1) Test stage: installs dependencies (npm ci for frontend, pip install for backend), runs linters (ESLint, Ruff/Flake8), type checks (tsc --noEmit, mypy), and runs tests (Vitest for frontend, pytest for backend). The backend tests use a separate test database (SQLite or PostgreSQL test instance) to ensure isolation. (2) Build stage: builds the Next.js frontend Docker image and the FastAPI backend Docker image, tags them with the commit SHA and "latest", and pushes to a container registry (Docker Hub, GitHub Container Registry). (3) Deploy stage: deploys to the production environment — either by SSHing to a VPS and pulling the new images (docker-compose pull && docker-compose up -d) or by updating a Kubernetes deployment. Environment-specific configuration is injected at deploy time from GitHub Actions secrets. The pipeline takes about 5-8 minutes. Secrets are never exposed in logs. A separate staging environment mirrors production for pre-release testing.

**Follow-up:**
1. How would you implement database migration as part of the CI/CD pipeline?
2. What is the rollback strategy if a deployment fails?
3. How do you handle zero-downtime deployments for the database schema changes?

### Q94. How are database migrations run in production?

**Short Answer:** Alembic migrations are run as a separate step before the new backend version starts. In CI/CD, a migration job runs alembic upgrade head against the production database before the new container is deployed.

**Detailed Answer:** The migration strategy: (1) A migration script is created during development and committed to version control. (2) In CI/CD, before deploying the new backend container, a separate job or init container runs alembic upgrade head using the production database URL (injected from secrets). This ensures the database schema is compatible with the new code. (3) The migration is designed to be backward-compatible: new columns have nullable or default values, new tables do not immediately break old queries, and column removals are done in a separate deployment cycle. (4) If the migration fails, the deployment is halted and the previous version remains running. (5) For zero-downtime, expansions (adding columns, tables, indexes) are safe because they do not affect old code. Retractions (removing columns, renaming) require a two-phase deploy: first deploy code that stops using the old column, then in a separate deploy, run the migration to remove it. The migration logs are captured for auditing. A rollback procedure (alembic downgrade -1) is documented but rarely used.

**Follow-up:**
1. What is the difference between a reversible and non-reversible migration?
2. How would you run migrations in a multi-replica environment?
3. How do you test that a migration works correctly on production-sized data?

### Q95. How is the application monitored?

**Short Answer:** Sentry tracks errors and performance traces (20% sampling), PostHog tracks product analytics and feature usage, and server-level monitoring uses Docker logs with a simple log aggregator. Health check endpoints report component status.

**Detailed Answer:** Monitoring is layered: (1) Error tracking: Sentry captures unhandled exceptions on both frontend and backend. Frontend source maps are uploaded during CI for readable stack traces. Backend integrates Sentry FastAPI middleware. (2) Performance: Sentry traces sample 20% of requests, showing slow endpoints, database queries, and external API calls. (3) Product analytics: PostHog tracks page views, feature adoption (e.g., "Forecast viewed", "Export generated"), and conversion funnels. (4) Infrastructure: Docker container logs are collected via docker logs or a local log aggregator (e.g., Loki + Grafana for self-hosted, or a managed service). Basic metrics (CPU, memory, disk, network) are monitored via the hosting provider dashboard or a tool like Netdata. (5) Health checks: GET /health on FastAPI returns status of database connection, Redis connection, and ML model loaded status. Uptime monitoring is done via a third-party service (Pingdom, UptimeRobot). Alerting is minimal: Sentry sends email on new errors, and PostHog has no real-time alerting yet.

**Follow-up:**
1. How would you set up alerting for specific error patterns (e.g., "database connection pool exhausted")?
2. What infrastructure metrics are most important for this application?
3. How would you implement distributed tracing across the Next.js proxy and FastAPI?

### Q96. How are secrets managed in production?

**Short Answer:** Secrets are stored in GitHub Actions encrypted secrets for CI/CD, injected as environment variables at deploy time. In production, they are stored in the hosting platform secret manager (e.g., Docker secrets, Kubernetes Secrets, or the VPS encrypted .env file).

**Detailed Answer:** The principle is that secrets are never committed to version control, never logged, and rotated regularly. For the current VPS deployment: (1) A .env.production file is encrypted with a GPG key and stored in a secure S3 bucket or as a GitHub secret. (2) During deployment, the CI/CD pipeline decrypts it and copies it to the server. (3) Docker Compose reads the .env file and injects variables into containers. For Kubernetes: secrets are stored as Secrets objects (base64-encoded, then encrypted at rest via KMS). For managed deployments (Railway, Heroku): secrets are set via the dashboard or CLI and injected as environment variables. Specific secrets: JWT_SECRET (32+ character random string), DATABASE_URL (includes credentials), R2_ACCESS_KEY / R2_SECRET_KEY, RESEND_API_KEY, SENTRY_DSN. A script scripts/rotate-secrets.sh documents the rotation process for critical secrets. Access to production secrets is limited to senior developers and the CI/CD system.

**Follow-up:**
1. What is the impact of leaking the JWT_SECRET — can tokens be forged?
2. How would you implement a secrets vault (HashiCorp Vault) for this architecture?
3. How often should secrets be rotated?

### Q97. How is logging structured?

**Short Answer:** Backend logging uses Python logging module with structured JSON formatting (via python-json-logger). Frontend logging uses console.log (development) and Sentry (production). Logs are written to stdout/stderr for Docker log collection.

**Detailed Answer:** The backend configures logging in app/core/logging.py: a JSONFormatter adds structured fields (timestamp, level, module, request_id, user_id, store_id) to every log line. The request_id is injected via a FastAPI middleware that generates a UUID per request and adds it to the logging context. Log levels: INFO for routine operations (order created, user logged in), WARNING for degraded states (Redis unavailable, email failed), ERROR for unexpected failures. Logs are written to stdout (not files) so Docker captures them. The frontend uses console.log in development (filtered by ESLint to avoid commits) and sends errors to Sentry in production. Structured logging enables log aggregation tools (Loki, ELK, Datadog) to parse and query logs by field. A typical log line: {"timestamp": "2026-06-09T10:30:00Z", "level": "ERROR", "module": "services.email", "request_id": "abc-123", "message": "Failed to send email to user@example.com"}.

**Follow-up:**
1. How would you correlate frontend and backend logs for the same user session?
2. What is the log retention policy and how are logs rotated?
3. How would you implement log-based alerting (e.g., trigger alert when error rate exceeds 1%)?

### Q98. How are backups handled?

**Short Answer:** PostgreSQL backups are taken daily using pg_dump and stored in Cloudflare R2 (or S3) with 30-day retention. Redis persistence is optional (RDB snapshots every 5 minutes if enabled). Docker volumes are backed up weekly.

**Detailed Answer:** The database backup strategy: a cron job (or Kubernetes CronJob) runs pg_dump -Fc --no-owner --no-acl khatabox > backup_$(date +%Y%m%d).dump daily. The compressed dump is uploaded to R2 using the StorageService (or AWS CLI). Retention: 30 daily backups (older ones are auto-deleted). A separate weekly backup is retained for 6 months. For point-in-time recovery, PostgreSQL WAL archiving could be enabled (streaming WAL segments to R2), allowing restore to any minute. Redis persistence: if enabled, RDB snapshots (every 5 minutes) and AOF (append-only file) provide crash recovery. File backups: product images in R2 are inherently durable (S3-compatible 99.999999999% durability). Docker volumes (if any stateful data on the server) are backed up weekly. The backup script is idempotent: it deletes old backups before uploading new ones. A restore procedure is documented in docs/RESTORE.md and tested quarterly. Alerts are configured if a backup job fails.

**Follow-up:**
1. What is the difference between a physical backup (pg_basebackup) and a logical backup (pg_dump)?
2. How would you test that backups are restorable without restoring to production?
3. What is the Recovery Point Objective (RPO) and Recovery Time Objective (RTO) for this system?

### Q99. How would you set up a staging environment?

**Short Answer:** A staging environment mirrors production with separate containers, a cloned database (anonymized), and the same deployment pipeline. It is deployed to on every PR merge before production deployment.

**Detailed Answer:** The staging environment runs on a separate VPS (or a separate namespace in Kubernetes) with the same Docker Compose configuration but with staging-specific environment variables: STAGING=true, reduced rate limits (for testing), and separate API keys for Sentry/PostHog (to avoid polluting production data). The staging database is restored from the latest production backup weekly, with PII anonymized (user names replaced, emails randomized) using a script. Staging is deployed to on every merge to develop branch (auto-deploy). The CI/CD pipeline runs all tests against staging before promoting to production. Staging shares the same build artifacts as production (same Docker image) to ensure parity. Engineers can access staging for manual testing. Feature flags in PostHog can selectively enable features on staging without code changes. The staging environment costs approximately 30% of production (smaller instances) but provides confidence before production releases.

**Follow-up:**
1. How would you handle staging for database migrations that alter existing data?
2. What is the risk of using production data (even anonymized) in staging?
3. How do you ensure staging and production are always in sync configuration-wise?
## 15. Testing Questions

### Q100. How are backend tests structured?

**Short Answer:** Backend tests use pytest with pytest-asyncio for async endpoint testing. They use a test database (separate PostgreSQL or SQLite), dependency overrides for FastAPI DI, and httpx.AsyncClient for HTTP calls.

**Detailed Answer:** The test suite (app/tests/) contains 39 tests organized by service/endpoint. Key patterns: (1) A conftest.py provides fixtures for async database session, test client, and authentication tokens. (2) The test client uses httpx.AsyncClient with the FastAPI app, bypassing the real HTTP server for faster tests. (3) Database dependency is overridden using app.dependency_overrides[get_db] = mock_get_db to inject a test session. (4) Each test creates its own test data within a transaction and rolls back after the test (or uses a fresh database per test class). (5) Tests cover CRUD operations, auth flows, RBAC enforcement, and edge cases (duplicate SKU, insufficient stock). (6) pytest markers (@pytest.mark.asyncio) are used for async tests. Known issue: pytest-asyncio has a ProactorEventLoop compatibility issue on Windows — only 2 of 39 tests pass locally on Windows. Tests are primarily run in CI (Linux) or using WSL. Coverage is tracked but not enforced.

**Follow-up:**
1. How do you test async database operations without hitting the real database?
2. What is the issue with ProactorEventLoop on Windows and how do you work around it?
3. How would you add test coverage thresholds to the CI pipeline?

### Q101. How are frontend tests structured?

**Short Answer:** Frontend tests use Vitest with React Testing Library for component tests, and MSW (Mock Service Worker) for API mocking. There are 19 tests covering form validation, API calls, and UI rendering.

**Detailed Answer:** The test suite (src/__tests__/) tests: (1) Component rendering — verifying that ProductTable renders rows for given data, that Skeleton components show during loading, etc. (2) Form validation — using React Testing Library to fill forms and submit, then asserting that Zod validation errors appear (e.g., empty name shows "Name is required"). (3) API integration — using MSW to intercept fetch calls and return mock responses, verifying that data is rendered correctly. (4) Zustand store tests — calling store actions and asserting state changes. The Vitest configuration (vitest.config.ts) sets up jsdom environment, mock for next/navigation and next-auth modules, and coverage reporter. Tests are run with npm run test and are integrated into CI. The 19 tests provide basic coverage for core components but do not cover every edge case. A higher coverage target (70%+) is planned.

**Follow-up:**
1. How do you mock the Auth.js useSession hook in component tests?
2. What is the advantage of MSW over mocking fetch directly?
3. How would you test the Recharts chart rendering?

### Q102. How is the clientApi mocked in tests?

**Short Answer:** The clientApi module is mocked at the module level using Vitest vi.mock(). Each test overrides specific API methods (get, post, etc.) to return controlled data or simulate errors.

**Detailed Answer:** In test setup (or per-test file), vi.mock("@/lib/client-api") replaces the entire clientApi module with a mock. Each test then uses mockImplementation to define specific return values: (mockClientApi.get as Mock).mockResolvedValue(mockProducts). This allows testing component behavior under various data conditions (empty list, error response, loading state). For error scenarios, the mock rejects with an error object matching the API error shape: (mockClientApi.get as Mock).mockRejectedValue({ response: { status: 404 } }). The mocks are reset between tests using vi.clearAllMocks() in beforeEach. This approach keeps tests fast (no network calls) and deterministic. The downside is that tests test against mock data, not the real API, so integration issues (e.g., field name mismatches) are not caught at this level.

**Follow-up:**
1. How would you test the clientApi itself (integration test against the real backend)?
2. What happens if the mock shape does not match the real API response shape?
3. Could you use MSW instead of mocking clientApi for more realistic tests?

### Q103. How is localStorage mocked in tests?

**Short Answer:** Vitest with jsdom environment provides a simulated localStorage. Zustand persist middleware works with this mock automatically. For tests, the store is initialized with known state before each test.

**Detailed Answer:** The jsdom environment in Vitest implements the Web Storage API (localStorage, sessionStorage) as in-memory JavaScript objects. Zustand persist middleware stores its serialized state there. In tests, before rendering a component, the Zustand store is reset to a known state using store.setState(...): store.setState({ storeId: "test-store-123", storeName: "Test Store" }). This ensures each test starts with a clean, predictable store state. For tests where localStorage persistence is irrelevant, the persist middleware can be disabled by creating the store without it in test setup. The store state is typically cleared in a beforeEach block to prevent test contamination. This pattern allows testing store-driven components (sidebar store selector, dashboard) without browser-specific APIs.

**Follow-up:**
1. How would you test that the store correctly persists to localStorage?
2. What issues can arise from Zustand persist middleware rehydration in tests?
3. How do you test the store selector component that depends on persisted state?

### Q104. How would you set up end-to-end (E2E) testing?

**Short Answer:** E2E testing would use Playwright to run headless browser tests against a full deployment (frontend + backend + database). Tests would simulate user flows: login, create product, place order, view dashboard.

**Detailed Answer:** An E2E test suite (e.g., tests/e2e/) would use Playwright to automate Chrome/Chromium. Key flows: (1) Login flow — navigate to /login, fill credentials, verify redirect to /dashboard. (2) Product CRUD — navigate to /products, click "Add Product", fill form, submit, verify product appears in table. (3) Order creation — select customer, add line items, submit order, verify order in list. (4) Stock transfer — initiate transfer between stores, approve, verify inventory change. (5) Dashboard — verify stat cards display non-zero values. The test setup would: (a) Deploy the full stack (Docker Compose) with a test database seeded with known data. (b) Run Playwright tests against this deployment. (c) Teardown after tests. Playwright fixtures would handle authentication (store session cookies) to avoid re-login for each test. Test data cleanup would happen between test runs (truncate tables and re-seed). CI would run E2E tests on a nightly schedule or before production releases, as they take 10-15 minutes.

**Follow-up:**
1. What is the trade-off of E2E tests vs integration tests for coverage?
2. How would you handle test data isolation between parallel E2E test runs?
3. What is the Page Object Model and how would you structure Playwright tests?

### Q105. How is database isolation achieved in tests?

**Short Answer:** Backend tests use a separate test database (configured via TEST_DATABASE_URL env var). Each test runs in a transaction that is rolled back after the test (or the database is truncated between test runs).

**Detailed Answer:** The test configuration uses a separate PostgreSQL database (khatabox_test) with the same schema (created by Alembic migrations). The conftest.py fixture creates a new transaction before each test and rolls it back after. The database session is obtained from a test-specific sessionmaker bound to the test database. This ensures: (1) Tests do not affect the development database. (2) Each test starts with a clean slate (within a rolled-back transaction). (3) Tests can be run in parallel (each in its own transaction). For unit tests that do not need database access, the get_db dependency is overridden to raise an error if called (ensuring the test truly does not need DB). For services that use the database, a fixture provides seeded data (products, users, stores) that the test can query. The test database is recreated from migrations before the test run (in CI) to ensure schema is up-to-date.

**Follow-up:**
1. Why is rolling back a transaction faster than truncating tables between tests?
2. How would you test database migrations themselves?
3. What happens if a test forgets to roll back its transaction?

### Q106. How is the ML model tested?

**Short Answer:** The ML model has tests for prediction output shape, confidence score range, seasonality factor calculation, and graceful handling of missing model file. A small test dataset is used for deterministic results.

**Detailed Answer:** Tests in app/tests/test_ml.py cover: (1) Model loading — test that pickle.load succeeds for the bundled model.bkl file. (2) Prediction shape — given valid features (product_id, day_of_week, month, is_holiday, category_encoded), the prediction returns a float. (3) Confidence range — assert confidence is between 0 and 1. (4) Seasonality factor — test that is_holiday=True returns factor >= 1.15, and weekend returns factor >= 1.10. (5) Edge cases — test that model_unavailable flag returns 503 when model is None. (6) Feature encoding — test that unknown product_id or category is handled (use -1 or mean encoding). The tests use a small set of input features (e.g., product_id=1, day_of_week=0, month=1, is_holiday=0, category_encoded=0) and check that predictions are reasonable (e.g., > 0). These tests ensure the model integration does not break after code changes, but they do not evaluate model accuracy (which is done in the training script).

**Follow-up:**
1. How would you test that model retraining improves accuracy (not just stays the same)?
2. How do you test for model drift in production?
3. What is a golden dataset and how is it used in ML testing?

### Q107. How is the rate limiter tested?

**Short Answer:** The rate limiter is tested by sending requests in rapid succession and verifying that the 429 status is returned after the limit is exceeded. Both Redis-backed and in-memory fallback modes are tested.

**Detailed Answer:** Tests for the rate limiter (app/tests/test_rate_limiter.py) include: (1) Under limit — send 99 requests (limit is 100) within 60 seconds, verify all return 200. (2) Over limit — send 101 requests, verify the 101st returns 429 with Retry-After header. (3) Window reset — after waiting 61 seconds (simulated via time manipulation or by clearing the Redis key), verify requests return 200 again. (4) In-memory fallback — mock Redis to raise ConnectionError, verify the fallback limits correctly (though less accurately). (5) Different identifiers — verify that two different IP addresses are tracked independently. (6) Custom limits — test that different endpoints (e.g., /auth/login) can have different limits if configured. Tests use pytest-freezegun or manual Redis key manipulation to avoid waiting real 60 seconds. The rate limiter middleware is tested by applying it to a test endpoint via dependency overrides.

**Follow-up:**
1. How would you test rate limiting across multiple server instances?
2. How do you avoid test flakiness caused by timing in rate limiter tests?
3. How would you test per-IP vs per-user rate limits?

### Q108. How is Socket.IO tested?

**Short Answer:** Socket.IO is tested using the python-socketio test client (sio.test_client) which simulates a client connection without a real WebSocket. Events are emitted and received in-memory for fast, deterministic testing.

**Detailed Answer:** The test creates a test client using sio.test_client(app) which connects to the Socket.IO server in-process. The test then: (1) Emits events (e.g., "join_store") and asserts the server responds (e.g., with "joined" acknowledgment). (2) Simulates an event from another part of the app (e.g., calling a service that emits "new_order") and verifies the test client receives it with the correct data. (3) Tests authentication — connects with an invalid token and verifies the connection is rejected. (4) Tests room scoping — verifies that events sent to room "store:1" are received by clients in that room but not by clients in room "store:2". (5) Tests disconnection — disconnects the test client and verifies the server cleans up resources. These tests run quickly (no network I/O) and cover the core event flow. End-to-end Socket.IO tests (real WebSocket connection) would use Playwright to verify browser-side behavior.

**Follow-up:**
1. How would you test Socket.IO reconnection behavior?
2. How do you test the Redis adapter for multi-instance Socket.IO?
3. What is the difference between sio.test_client and a real WebSocket connection?

### Q109. How are database migrations tested?

**Short Answer:** Migration tests apply all Alembic migrations to a fresh test database, then downgrade them, verifying that each migration is reversible and does not corrupt data. A sample dataset is inserted and queried after each upgrade step.

**Detailed Answer:** A dedicated test file (tests/test_migrations.py) uses a fixture that: (1) Creates a fresh PostgreSQL database (or SQLite for simplicity). (2) Applies all migrations via alembic.config.CommandLine with upgrade("head"). (3) Inserts sample data into all tables (a product, an order, a user). (4) Runs a downgrade to each revision and back up, verifying data integrity after each cycle. (5) Checks that expected columns exist after each upgrade (e.g., after migration 0007, verify stock_transfers table exists and inventory_movements has store_id column). (6) Tests edge cases: running the migration twice (idempotent check), running with existing data in the table (backward compatibility). Migration tests are run in CI and are critical for catching issues like missing default values or NOT NULL violations on existing rows. They are slower than unit tests but provide high confidence before production deployments.

## 16. Bonus Questions

### Q110. Why was SQLAlchemy chosen over raw SQL or an ORM like Django ORM?

**Short Answer:** SQLAlchemy 2.0 offers the best async support among Python ORMs, provides explicit control over query generation, works seamlessly with FastAPI dependency injection, and allows dropping to raw SQL when needed.

**Detailed Answer:** The choice came down to three options. (1) Raw SQL with asyncpg: maximum performance and control, but no migration tooling, no model validation, and increased development time for complex queries (nested relationships, eager loading). (2) Django ORM: mature and productive, but tightly coupled to Django framework, making it awkward to use with FastAPI. (3) SQLAlchemy 2.0: offers async-native session, rich relationship loading (selectinload, joinedload), Alembic for migrations, Pydantic-like model validation via mapped_column, and the ability to drop to raw SQL for complex reporting queries. The async support with asyncpg driver is critical for FastAPI's async event loop — a synchronous ORM would block the loop and negate async benefits. SQLAlchemy's expression language also makes it easy to build dynamic queries (e.g., optional filters) programmatically. The learning curve is steeper than Django ORM, but for a FastAPI project, it is the natural choice.

**Follow-up:**
1. What is the performance overhead of SQLAlchemy compared to raw asyncpg?
2. How does SQLAlchemy 2.0 differ from SQLAlchemy 1.x in async support?
3. When would you drop to raw SQL instead of using the ORM?

### Q111. How does the decoupled frontend/backend architecture benefit the project?

**Short Answer:** Decoupling allows independent development, deployment, and scaling of the React frontend and Python backend. Each team can work in their preferred language/ecosystem, and the backend can be reused for mobile apps or external APIs.

**Detailed Answer:** The separation provides several advantages: (1) Language-specific strengths: the frontend uses the rich React ecosystem (shadcn/ui, Recharts, Zustand) while the backend uses Python's data science stack (scikit-learn, pandas) and async web framework (FastAPI). (2) Independent scaling: if the ML prediction service becomes a bottleneck, the backend can scale independently of the frontend. (3) API reusability: the same FastAPI backend can serve the Next.js frontend, a future React Native mobile app, and third-party API integrations. (4) Development velocity: frontend and backend can be developed and tested independently, with clear API contracts (OpenAPI spec). (5) Deployment flexibility: frontend can be deployed to Vercel/Cloudflare Pages while backend runs on a VPS/Kubernetes. The trade-off is operational complexity (two deployments, CORS configuration, proxy setup) and the need for rigorous API versioning. For a team with both frontend and backend specialists, this architecture is ideal.

**Follow-up:**
1. How would you handle API versioning in this decoupled architecture?
2. What are the challenges of maintaining type safety across the API boundary?
3. Would GraphQL be a better alternative to REST for this architecture?

### Q112. Why use JWT-based auth instead of session-based auth?

**Short Answer:** JWT enables stateless authentication — no server-side session storage, no database lookup on every request, and easy integration with mobile apps or third-party clients. The trade-off is that JWTs cannot be revoked server-side without a blocklist.

**Detailed Answer:** Session-based auth stores a session ID in a cookie, and the server looks up the session in a database (or Redis) on every request to find the user. This adds latency and requires stateful storage. JWT encodes all user info (id, role) in the token itself; the server only needs to verify the signature (using the JWT_SECRET) and can trust the payload. This eliminates the session lookup for every API call. For KhataBox, the JWT also serves as the Bearer token for the frontend API wrapper, which reads it from the Auth.js session cookie. Downsides: (1) JWTs cannot be revoked — if a user is deactivated, their JWT remains valid until expiry (24 hours). A blocklist (Redis set of revoked JWT IDs) can mitigate this but adds state. (2) JWT size is larger than a session ID (though negligible). (3) JWT secret rotation requires all existing tokens to be reissued. For a SaaS dashboard, the stateless benefit outweighs these concerns.

**Follow-up:**
1. How would you implement JWT revocation for immediate user deactivation?
2. What is the difference between access tokens and refresh tokens?
3. How does JWT size affect HTTP performance?

### Q113. Why is expire_on_commit=False set on the async session?

**Short Answer:** expire_on_commit=False prevents SQLAlchemy from expiring all loaded objects after commit(), which would cause DetachedInstanceError when accessing lazy-loaded attributes in an async context after the session is closed.

**Detailed Answer:** By default, SQLAlchemy sets expire_on_commit=True on sessions. After session.commit(), all loaded objects are "expired" — their attribute values are cleared, and they will be lazily reloaded from the database on next access. In an async context, after the session is closed (returned to pool), trying to access an expired attribute triggers a lazy load, which requires an open session. Since the session is already closed, this raises DetachedInstanceError. Setting expire_on_commit=False prevents this expiration: after commit, loaded objects retain their attribute values. The trade-off is that those values might be stale if another transaction modified the same row. However, in KhataBox, each request creates a fresh session and loads fresh data, so staleness is not an issue. This is a standard configuration for async SQLAlchemy applications and is recommended in the official documentation.

**Follow-up:**
1. What is a DetachedInstanceError and how does expire_on_commit relate to it?
2. When would expire_on_commit=True be the better choice?
3. How does this setting interact with session.refresh()?

### Q114. Why are passlib 1.7.4 and bcrypt 4.0.1 pinned?

**Short Answer:** bcrypt version 5.0+ introduced breaking changes (new prefix format) that cause passlib to raise a FatalError. Pinning to bcrypt 4.0.1 and passlib 1.7.4 ensures password hashing works without errors.

**Detailed Answer:** The bcrypt library version 5.0 changed the hash format, including a new prefix ($2b$ to $2b$ with different encoding). Passlib (versions up to 1.7.4) expects the old format and throws a FatalError: "(v) was not reserved" when encountering hashes generated by bcrypt>=5.0. This is a known incompatibility documented in the project. The fix is to pin bcrypt==4.0.1 and passlib==1.7.4 in requirements.txt. Alternative solutions include: (1) Using bcrypt directly instead of passlib (losing passlib's CryptContext abstraction). (2) Using bcrypt>=5.0 with a patched version of passlib (not available). (3) Migrating to argon2 (a newer algorithm). The pinning solution is the least disruptive for an MVP. A future upgrade would migrate to argon2 using passlib's CryptContext, which supports multiple schemes and can verify old bcrypt hashes while creating new ones with argon2.

**Follow-up:**
1. How would you migrate from bcrypt to argon2 without invalidating existing passwords?
2. What is the CryptContext deprecated="auto" setting?
3. How does bcrypt compare to argon2 in terms of security and performance?

### Q115. How does service decoupling work in the backend?

**Short Answer:** Each domain (product, order, auth, notification) has a dedicated service module with a clear responsibility. Services depend on the database session and other services via dependency injection, not direct imports.

**Detailed Answer:** The backend follows a layered architecture: router ? service ? repository (or direct model queries). Each service module (e.g., app/services/product.py) contains functions like create_product, get_product, update_product, delete_product. Services receive an AsyncSession via a parameter (not a global), making them testable and independent. Cross-service communication is explicit: OrderService.create_order() calls ProductService.decrement_stock() directly (same process) rather than emitting an event. For heavier decoupling, future iterations could use a message broker (RabbitMQ, Redis Pub/Sub) between services. The current design balances simplicity with separation of concerns: services are not microservices (they share the same database and process) but are logically independent. This means a change to ProductService rarely requires changes to OrderService (only when the interface changes). The notification service is also decoupled: it is called imperatively after an order or stock change, not coupled to the event.

**Follow-up:**
1. How would you refactor the services into event-driven communication?
2. What is the difference between service decoupling and microservices?
3. How do you avoid circular imports between services?

### Q116. Why is the seed script idempotent?

**Short Answer:** Idempotency ensures that running the seed script multiple times does not create duplicate data. This is critical because the seed runs at app startup (in the lifespan handler) and may be triggered by container restarts or scaling events.

**Detailed Answer:** The seed script checks if the stores table has any rows before creating seed data. If rows exist, it skips all inserts. This prevents several issues: (1) Container restart: if the app container restarts (due to crash, deployment, or scaling), the lifespan handler runs the seed script again. Without idempotency, this would create duplicate stores, users, products, etc. (2) Database reset: if someone manually truncates tables and re-runs the seed, it works correctly. (3) CI/CD: running the seed script in CI (for test setup) multiple times does not cause failures. The idempotency guard is simple (check if table has rows) and effective. A more robust approach would use ON CONFLICT DO NOTHING (PostgreSQL upsert) for each insert, allowing partial re-seeding if needed.

**Follow-up:**
1. How would you make the seed script partially idempotent (e.g., add new products without duplicating existing ones)?
2. What happens if the idempotency check fails mid-way through seeding?
3. How would you seed environment-specific data (e.g., dev, staging, test) differently?

### Q117. How is timezone handling managed?

**Short Answer:** All timestamps are stored in UTC in PostgreSQL. The backend handles all datetime operations in UTC. The frontend converts to the user local timezone for display using JavaScript Intl.DateTimeFormat.

**Detailed Answer:** The database stores created_at and updated_at with TIMESTAMP WITH TIME ZONE type (or TIMESTAMP where UTC is assumed). SQLAlchemy model columns use datetime (timezone-aware) and server_default=func.now() which returns UTC. The backend never performs timezone conversion — it always works in UTC. When the API returns timestamps (e.g., order.created_at), they are ISO 8601 strings with +00:00 or Z suffix. The frontend receives UTC timestamps, then converts to the user local timezone for display: new Date(utcString).toLocaleString(). For timezone-aware features (reporting by day in the user timezone), the user timezone preference would be stored in the User model (e.g., "America/New_York") and sent as a header or preference. The backend would use this to bucket data by the user local day. This approach avoids the complexity of timezone conversions in the backend and relies on the frontend for display formatting.

**Follow-up:**
1. How would you implement "daily sales report" in the user local timezone?
2. What issues arise when daylight saving time changes during a reporting period?
3. How does Python datetime handling differ from JavaScript Date handling?

### Q118. How would you add a new feature (e.g., discounts/promotions)?

**Short Answer:** Add a Promotion model (code, type, value, start/end dates, usage limit), create CRUD endpoints in a promotions router, add a frontend promotions page with shadcn/ui forms, and integrate discount calculation into the order creation service.

**Detailed Answer:** The full process: (1) Database: create a promotions table via Alembic migration (id, store_id, code, discount_type [percentage/fixed], discount_value, min_order_amount, max_uses, current_uses, starts_at, ends_at, is_active). (2) Backend: add Promotion Pydantic schemas (PromotionCreate, PromotionResponse), create app/routers/promotions.py with CRUD endpoints, add PromotionsService with validate_promotion(code, order_total) method that checks dates, usage limits, and returns the discount amount. Integrate into OrderService: before calculating the order total, check if a promotion code was provided, validate it, apply discount, and increment usage count (in the same transaction). (3) Frontend: add sidebar link (visible to admin/manager), create src/app/promotions/page.tsx (list with table), src/app/promotions/new/page.tsx (create form with shadcn/ui inputs), add promotion code input field to the order creation form. (4) Tests: write pytest tests for promotion validation (expired code, exceeded usage, invalid code), Vitest tests for promotion form validation, Playwright E2E test for full flow. (5) Seed: add sample promotions to the seed script. This feature touches all layers but follows established patterns.

**Follow-up:**
1. How would you handle promotion stacking (multiple codes on one order)?
2. What is the strategy for promoting a time-limited "flash sale" with high traffic?
3. How would the price calculation work with discounts and taxes?

### Q119. How does the RBAC system scale with new roles and permissions?

**Short Answer:** Currently RBAC uses hardcoded role checks (admin, manager, viewer). To scale, a permissions-based system would define granular permissions (read:products, write:orders) and assign them to roles. Users would be granted roles, and checks would verify permissions instead of roles.

**Detailed Answer:** The current require_role("admin", "manager") approach works for 3-4 roles but does not scale to fine-grained access control. For example, a "support" role might need read access to orders and customers but no access to products or finances. The proposed evolution: (1) Define permissions as string constants: "product:read", "product:write", "order:read", "order:write", "user:read", "user:write", "settings:read", "settings:write". (2) Create a Role model with a name and a permissions JSONB field: Role(name="manager", permissions=["product:read", "product:write", "order:read", "order:write", ...]). (3) User model gets a role_id FK instead of a string role. (4) The require_permission(*perms) dependency looks up the user role, fetches the permissions, and checks membership. This is more flexible: new roles can be created from existing permissions without code changes. The frontend would also use permissions (via session.permissions) for UI element visibility. The downside is additional database queries (role lookup) and more complex management UI. The current role-based system was chosen for simplicity; the permission-based system would be a natural evolution as the user base grows.

**Follow-up:**
1. How would you implement an admin UI for managing roles and permissions?
2. What performance impact does permission-based checking have compared to role-based?
3. How would you handle default permissions for new entities (e.g., a new "reports" feature)?

## 17. Advanced Implementation Questions

### Q120. How is the MovementResponse enriched after fetching movements?

**Short Answer:** The list_movements endpoint in inventory.py batch-loads product names and store names after fetching movements. It collects unique product_id and store_id values, runs SELECT WHERE id IN (...) queries, builds dicts, and assigns names to MovementResponse objects.

**Detailed Answer:** After executing the primary query to fetch inventory movements, the service iterates over the result set to collect all distinct product_id and store_id values into Python sets. It then issues two separate SELECT queries: one against the products table with WHERE id IN (:product_ids) to fetch product names, and one against the stores table with WHERE id IN (:store_ids) to fetch store names. The results are mapped into dictionaries (product_id -> product_name, store_id -> store_name). Finally, each MovementResponse Pydantic model is constructed with the enriched name fields by looking up the IDs in those dictionaries. This approach avoids N+1 queries (one per movement) while keeping the code simple and readable. The trade-off is that a query with a very large IN list can be slower than a JOIN, but for paginated movement listings (typically 20-50 items), the batch-loading approach is optimal.

**Follow-up:**
1. Could this be replaced with a SQL JOIN instead of two separate queries?
2. How would you handle movements where the product or store has been deleted?
3. What happens if one of the batch queries fails?

### Q121. What does from_attributes = True do in Pydantic config?

**Short Answer:** model_config = {"from_attributes": True} enables Pydantic v2 model_validate() to read attributes from SQLAlchemy ORM objects instead of dicts. It replaced v1's from_orm().

**Detailed Answer:** In Pydantic v2, the Config class was replaced by model_config. Setting from_attributes=True allows Pydantic models to be instantiated from arbitrary class instances by reading their attributes, not just from dictionaries. This is what enables pattern like MovementResponse.model_validate(db_movement) where db_movement is a SQLAlchemy ORM model instance. In Pydantic v1, this was done via from_orm() method. The from_attributes=True config also works with model_validate() for dicts, making it a unified entry point. This is critical for KhataBox because all API response schemas are Pydantic models that are populated from SQLAlchemy query results. Without this setting, developers would have to manually convert ORM objects to dicts before validation.

**Follow-up:**
1. How does from_attributes differ from from_orm in Pydantic v1?
2. What performance implications does this have for response serialization?
3. Can from_attributes be set per-field or only at the model level?

### Q122. How does the CSV import handle flexible column naming?

**Short Answer:** The Inventory page CSV import parses with a custom parseCsvRow function that handles quoted fields, tries multiple column name variants (name, Name, Product Name) via Object.fromEntries, and reports per-row errors without aborting.

**Detailed Answer:** The import flow starts with a file input that accepts CSV files. The parseCsvRow function uses a regex-based parser that respects quoted fields (handles commas and newlines within quotes). After parsing headers, it builds a normalized column map using Object.fromEntries: each expected field (name, sku, price, stock_quantity, category) is matched against multiple possible header variants (e.g., "Product Name", "product_name", "Name", "name"). Rows that fail validation (missing required fields, invalid price format) are collected in an errors array with the row number and a descriptive message. The import function returns { imported: number, errors: Array<{row: number, message: string}> }. The backend processes valid rows and the frontend displays a summary: "Imported 45 products. 3 errors." This design lets users fix specific rows and re-import without losing the entire batch. Per-row error reporting is a significant UX improvement over abort-on-first-error.

**Follow-up:**
1. How would you add a preview step that shows parsed rows before committing?
2. What encoding issues might occur with CSV files from different locales?
3. How would you handle duplicate SKUs during CSV import?

### Q123. How are database connection failures handled?

**Short Answer:** The engine has no retry logic. Railway health checks restart the container on failure. Production improvements would include pool_pre_ping=True, pool_size, pool_recycle, and a retry wrapper.

**Detailed Answer:** Currently, if the database connection is lost (e.g., PostgreSQL restart, network glitch), SQLAlchemy raises an exception that propagates as a 500 error. There is no automatic retry at the application level. The deployment platform (Railway) uses health check endpoints (GET /health) that test DB connectivity; if the health check fails repeatedly, Railway restarts the container. For production hardening, several improvements are planned: (1) pool_pre_ping=True on the engine -- this tests each connection before checkout, removing stale connections from the pool. (2) pool_recycle=3600 -- recycle connections after 1 hour to prevent long-lived connection issues. (3) pool_size=10 and max_overflow=20 from environment variables. (4) A retry decorator on critical db operations using tenacity or asyncio-retry, with exponential backoff (3 retries, 1s/2s/4s delays). (5) A circuit breaker pattern that temporarily stops sending requests to a failing database and checks recovery periodically. For the MVP, container restart is the recovery strategy.

**Follow-up:**
1. What is the risk of connection pool exhaustion during a database outage?
2. How would you test the retry logic without actually taking down the database?
3. How does pool_pre_ping affect query latency?

### Q124. How is mark-all-read implemented as a bulk update?

**Short Answer:** It uses a single SQL UPDATE: update(Notification).where(is_read==False, user_id==current_user).values(is_read=True). One round trip vs N individual calls.

**Detailed Answer:** The endpoint PATCH /notifications/mark-all-read executes a single UPDATE statement through SQLAlchemy: await db.execute(update(Notification).where(Notification.is_read == False, Notification.user_id == current_user.id).values(is_read=True)). This translates to UPDATE notifications SET is_read = true WHERE is_read = false AND user_id = :user_id. The database handles all matching rows in one operation, regardless of how many unread notifications exist. The alternative -- fetching all unread notification IDs and calling PATCH /notifications/{id} for each -- would require N+1 round trips (one SELECT + N UPDATEs). The bulk approach is faster (one round trip), atomic (either all or none are marked), and avoids race conditions (if a new notification arrives between fetching IDs and updating, it won't be accidentally marked read because the WHERE clause re-checks). The response returns { updated: count } so the frontend can update the unread badge count.

**Follow-up:**
1. How would you handle marking only visible notifications as read (pagination-aware)?
2. What happens if another user action creates a new notification during this update?
3. Could this be extended to mark-all-read for a specific type (e.g., only low stock alerts)?

### Q125. How is price analysis aggregation computed?

**Short Answer:** In-memory dict aggregation from PurchaseOrderItem to PurchaseOrder to Supplier join. Computes avg unit price, margin vs selling price per supplier. Avoids SQL window functions for simplicity.

**Detailed Answer:** The price analysis feature computes per-supplier metrics by fetching all PurchaseOrderItem records joined with their PurchaseOrder (which has the supplier_id) and the Supplier table. The raw rows are iterated in Python and aggregated into a dictionary keyed by supplier_id. For each supplier, it accumulates total units purchased, total cost (unit_price * quantity), and computes the weighted average unit price (total_cost / total_units). The margin is calculated against the product's current selling price from the Product table: margin_pct = ((selling_price - avg_unit_price) / selling_price) * 100. This in-memory approach was chosen over SQL window functions (like AVG() OVER PARTITION BY) for simplicity and readability -- the dataset is small (purchase orders are relatively infrequent), so loading all relevant records and aggregating in Python is fast enough (<200ms for typical stores). If the data grows, the aggregation would be moved to SQL using GROUP BY and window functions for better performance.

**Follow-up:**
1. When would this in-memory approach become a performance bottleneck?
2. How would you add month-over-month price trend analysis?
3. Could this be pre-computed and cached for faster dashboard loading?

### Q126. How does notification deduplication work?

**Short Answer:** Before creating a notification, the service checks for an existing unread notification with the same reference_id (product_id) and type (LOW_STOCK). If one exists, the new notification is skipped. This prevents spam for the same condition.

**Detailed Answer:** The NotificationService.create_notification method first queries: existing = await db.execute(select(Notification).where(Notification.reference_id == reference_id, Notification.type == type, Notification.is_read == False, Notification.user_id == user_id)). If existing.first() is not None, the method returns without creating a new notification. This is crucial for low-stock alerts: every stock-affecting operation (order placement, stock adjustment, transfer) re-checks low-stock conditions. Without deduplication, a product below threshold would generate a notification on every stock decrement, flooding the user. Once the user reads the notification (marks is_read = True), the deduplication check no longer matches, so a subsequent low-stock event (e.g., stock decreased further) would create a new notification. The deduplication window is based on the notification's unread status rather than a time window, which is simpler but means reading a notification resets the dedup. A time-window approach (e.g., "no duplicate within 1 hour") could be added for high-frequency events.

**Follow-up:**
1. How would you deduplicate across multiple notification types (e.g., same product triggers low_stock and price_change)?
2. What happens if the dedup query itself fails -- does the notification still get created?
3. How would you implement rate-limited notifications (max 5 per hour per product)?

### Q127. How is JWT expiry handled?

**Short Answer:** create_access_token adds exp = utcnow + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES=30). decode_token catches ExpiredSignatureError and returns None (same as invalid token).

**Detailed Answer:** The create_access_token function in app/core/security.py creates a JWT with the python-jose library: token = jwt.encode({"sub": str(user.id), "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), "iat": datetime.now(timezone.utc)}, JWT_SECRET, algorithm="HS256"). The ACCESS_TOKEN_EXPIRE_MINUTES is set to 30 by default. On the receiving end, decode_token calls jwt.decode(token, JWT_SECRET, algorithms=["HS256"]). If the token is expired, jwt.decode raises ExpiredSignatureError, which is caught and the function returns None -- the same return value as an invalid or malformed token. This design means expired tokens are treated identically to invalid tokens: the caller (get_current_user dependency) sees None and raises HTTPException(status_code=401, detail="Invalid authentication credentials"). This avoids leaking information about whether the token was expired or simply malformed. No refresh token mechanism exists yet; after 30 minutes, the user must re-authenticate.

**Follow-up:**
1. How would you implement automatic token refresh without user disruption?
2. What is the security impact of a 30-minute token lifetime?
3. How does the frontend detect an expired token and redirect to login?

### Q128. How is registration duplicate email handled?

**Short Answer:** SELECT before INSERT with a unique DB constraint. A race condition is possible (handled by IntegrityError at commit, though not caught currently).

**Detailed Answer:** The registration endpoint first queries: existing_user = await db.execute(select(User).where(User.email == email)). If existing_user.first() is not None, it returns a 409 Conflict response with detail "Email already registered". This SELECT-before-INSERT pattern catches most duplicates. However, a race condition exists: if two registration requests with the same email arrive concurrently, both SELECT queries may return None (neither user exists yet), and both INSERTs proceed. The second INSERT would fail at commit time because the email column has a UNIQUE constraint in PostgreSQL. This would raise an IntegrityError from SQLAlchemy. Currently, this exception is not caught in the registration handler, so it would propagate as a 500 error instead of a clean 409. A production fix would catch IntegrityError in the registration endpoint and return a 409 response. A more robust approach is to skip the SELECT entirely and rely solely on the UNIQUE constraint, catching the IntegrityError -- this eliminates the race condition at the cost of catching an exception in the happy-ish path.

**Follow-up:**
1. What is the risk of the race condition in a high-traffic registration scenario?
2. How would you use PostgreSQL ON CONFLICT DO NOTHING to handle this?
3. Would a database-level UNIQUE constraint be sufficient without the SELECT check?

### Q129. How is the loading state pattern implemented?

**Short Answer:** A boolean loading state, Skeleton components during loading, set to false in .finally(). Buttons are disabled with text change ("Saving..."). This pattern pre-dates Suspense.

**Detailed Answer:** Every data-fetching hook follows the pattern: const [loading, setLoading] = useState(true); useEffect(() => { setLoading(true); api.call().then(setData).catch(showToast).finally(() => setLoading(false)); }, []). While loading is true, the component renders shadcn/ui Skeleton components (animated gray rectangles that match the content shape). For mutation actions (create, update, delete), a similar loading state disables the submit button and changes its text from "Save" to "Saving..." or from "Delete" to "Deleting...". The button's disabled prop is set to loading, preventing double-submission. The finally() block ensures loading is set to false even if the promise rejects (error case), preventing the UI from getting stuck in a loading state. This pattern predates React Suspense for data fetching and is straightforward to implement and reason about. A migration to TanStack Query would replace this boilerplate with useQuery's built-in isLoading state and provide additional features like caching and background refetching.

### Q130. How is transfer stock validated?

**Short Answer:** Checks that product.store_id matches from_store_id, quantity is positive, and quantity <= stock_quantity. The operation is atomic: decrement stock, create transfer, create TRANSFER_OUT movement.

**Detailed Answer:** The validate_transfer function in the TransferService performs three checks before processing: (1) The product being transferred must belong to the source store (product.store_id == from_store_id) -- this prevents transferring products that don't exist in the source store. (2) The transfer quantity must be positive (> 0). (3) The transfer quantity must not exceed the available stock (quantity <= product.stock_quantity). If all validations pass, the operation is wrapped in a database transaction: (a) product.stock_quantity is decremented by the transfer quantity. (b) A StockTransfer record is created with status="pending". (c) An InventoryMovement record is created with type="TRANSFER_OUT", negative quantity (-quantity), and the transfer_id for traceability. If any step fails, the entire transaction rolls back -- the stock decrement is never committed without a corresponding transfer record. The destination store's stock is NOT incremented at this point; that happens only when the transfer is approved (creating a TRANSFER_IN movement at the destination).

**Follow-up:**
1. What prevents a product from being transferred while it has pending orders?
2. How would you handle partial transfers (e.g., transferring 5 of 10 units)?
3. What happens if the product is deleted while a transfer is pending?

### Q131. What is the statusConfig object and how is it used?

**Short Answer:** statusConfig is an object that maps status strings to { label, class }. It is used in the transfers page for Badge rendering, with optional chaining for unknown statuses.

**Detailed Answer:** The statusConfig object is defined as a constant in the transfers page module (or a shared constants file): const statusConfig = { pending: { label: "Pending", class: "bg-yellow-100 text-yellow-800" }, approved: { label: "Approved", class: "bg-blue-100 text-blue-800" }, rejected: { label: "Rejected", class: "bg-red-100 text-red-800" }, completed: { label: "Completed", class: "bg-green-100 text-green-800" } }. The Badge component renders as: <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusConfig[transfer.status]?.class)}>{statusConfig[transfer.status]?.label || transfer.status}</span>. The optional chaining (?.) ensures that if the transfer status is somehow unexpected (e.g., a new status added in the backend but not yet mapped in the frontend), the component gracefully falls back to displaying the raw status string without a styled class, rather than throwing a TypeError. This pattern is used across the app for order status, user role, and notification type badges, providing a single source of truth for display labels and styling.

**Follow-up:**
1. How would you type the statusConfig to ensure all status values are covered?
2. Could this be replaced with a CSS-only approach using data attributes?
3. How would you handle status-specific icons in addition to colors?

### Q132. How does the form dialog useEffect synchronize state?

**Short Answer:** The useEffect synchronizes form state with the product prop. It depends on product + open. No cleanup is needed (no subscriptions). It resets to empty defaults for create mode.

**Detailed Answer:** In the ProductFormDialog component, a useEffect watches the product and open props: useEffect(() => { if (product) { form.reset({ name: product.name, sku: product.sku, price: product.price, stock_quantity: product.stock_quantity, category_id: product.category_id, store_id: product.store_id, description: product.description || "" }); } else { form.reset({ name: "", sku: "", price: 0, stock_quantity: 0, category_id: "", store_id: activeStoreId, description: "" }); } }, [product, open]). When product is truthy (edit mode), the form is populated with the product's current values. When product is null/undefined (create mode), the form is reset to empty defaults. The open dependency ensures the form state is reset each time the dialog opens, even if the user previously closed it without saving. No cleanup function is needed because there are no subscriptions, timers, or event listeners to remove -- the effect only calls form.reset(), which is synchronous. This pattern works well with React Hook Form's reset method, which replaces the current form state with new values without triggering validation.

**Follow-up:**
1. What happens if the product prop changes while the dialog is open?
2. How would you handle form dirty state when switching between create and edit modes?
3. Could this effect cause an infinite loop if form.reset triggers a re-render?

### Q133. How is the Select component's onValueChange null handled?

**Short Answer:** onValueChange receives a string or empty string (not null). The handler uses val && parseInt(val) to prevent NaN from parseInt("").

**Detailed Answer:** The shadcn/ui Select component (built on Radix UI) passes the selected value as a string to onValueChange. When the select is cleared (if clearable) or the placeholder is selected, it passes an empty string (""), not null or undefined. The handler must account for this: const handleValueChange = (val: string) => { setSelectedId(val ? parseInt(val) : null); }. The val && parseInt(val) pattern (or the ternary above) prevents parseInt("") from returning NaN. If parseInt("") were called directly, it would return NaN, which would propagate as an invalid ID (e.g., database query with NaN would fail or return unexpected results). The Select's value prop also uses String(id) for numeric IDs because Radix UI requires string values internally. This string-to-number conversion pattern is repeated across all entity selects (product category, supplier, store selector, user role).

**Follow-up:**
1. Why does shadcn/ui Select use strings instead of generic types?
2. How would you handle selects with non-numeric ID values (UUIDs)?
3. What happens if the select value is reset to an empty string programmatically?

### Q134. How is today's sales query constructed?

**Short Answer:** Uses COUNT + SUM with COALESCE. today_start is midnight UTC. Filters by shopkeeper_id. The query is timezone-naive (uses UTC day boundary).

**Detailed Answer:** The get_today_sales function in the dashboard service constructs: today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0). Then: result = await db.execute(select(func.count(Order.id), func.coalesce(func.sum(Order.total_amount), 0)).where(Order.shopkeeper_id == shopkeeper_id, Order.created_at >= today_start, Order.is_active == True)). The count gives the number of orders placed today. The coalesce(sum(...), 0) ensures that if no orders exist for today, the query returns 0 instead of NULL (which would cause type errors in the response serialization). The query is timezone-naive -- it uses UTC midnight as the day boundary. For a user in New York (UTC-5), an order placed at 8 PM EST (1 AM UTC) would be counted in the next day's sales. A production improvement would accept a user timezone header and adjust the day boundary accordingly using PostgreSQL AT TIME ZONE conversion.

### Q135. How is the low stock query optimized?

**Short Answer:** Uses stock_quantity <= reorder_threshold comparison in SQL. The query leverages a (owner_id, is_active, stock_quantity) composite index for an index-only scan.

**Detailed Answer:** The low stock query is: await db.execute(select(Product).where(Product.owner_id == owner_id, Product.is_active == True, Product.stock_quantity <= Product.reorder_threshold).order_by(Product.stock_quantity.asc())). The critical performance feature is the composite index on (owner_id, is_active, stock_quantity). Because all three columns used in the WHERE clause are in the index (in the correct order for equality on owner_id and is_active, then range on stock_quantity), PostgreSQL can perform an index-only scan -- it never needs to visit the table heap because all required columns are present in the index. The index also covers the ORDER BY (stock_quantity ASC), so no separate sort step is needed. EXPLAIN ANALYZE of this query shows "Index Only Scan" with zero heap fetches. This is particularly important because the low stock check runs after every stock-affecting operation (order creation, stock adjustment, transfer), so it must be fast. The query typically returns fewer than 10 rows (only products below threshold), making it lightweight even without optimization.

**Follow-up:**
1. What is an index-only scan and why does it matter?
2. How would this query perform on a table with millions of soft-deleted products?
3. Could a partial index (WHERE is_active = true) be more efficient?

### Q136. How are route conflicts resolved between /movements and /movements/{product_id}?

**Short Answer:** They coexist because static paths and parameterized paths are distinguished by URL pattern. The router matches the static route first; if it doesn't match, it falls through to the parameterized route.

**Detailed Answer:** In FastAPI, routes are matched in order of registration. The router defines: @router.get("/movements") for the list endpoint and @router.get("/movements/{product_id}") for movements by specific product. When a request comes in for /movements, FastAPI matches the static route first (exact match) and dispatches to the list handler. When a request comes in for /movements/abc-123-uuid, the static route doesn't match (because /movements is not the same as /movements/abc-123-uuid), so FastAPI tries the parameterized route and matches it, extracting product_id = "abc-123-uuid". There is no conflict because the URL patterns are distinct: one has no path segment after /movements, the other has exactly one segment. However, a route like /movements/{product_id}/details would be distinct as well. The potential for conflict arises if a static route and a parameterized route could match the same URL -- for example, /movements/list and /movements/{product_id} would conflict because "list" could be interpreted as a product_id. The naming convention avoids this by not using strings like "list", "all", or "new" as static paths under the same prefix.

**Follow-up:**
1. What happens if a product_id happens to be the string "list"?
2. How does FastAPI route ordering affect conflict resolution?
3. How would you add both /movements/summary and /movements/{product_id} without conflict?

### Q137. Why is seed deletion order important?

**Short Answer:** DELETE child tables first (stock_transfers, inventory_movements, order_items) before parent tables (orders, products, stores). The seed script uses raw SQL text() for this.

**Detailed Answer:** The seed script's cleanup (or reset) section deletes table rows in reverse dependency order: stock_transfers, inventory_movements, notifications, order_items (these reference orders, products), then orders, purchase_order_items, purchase_orders, products, stores, users. This order respects foreign key constraints -- deleting a parent row while child rows reference it would violate FOREIGN KEY constraints and raise an error. The seed script uses raw SQL text() for deletion: await db.execute(text("DELETE FROM stock_transfers")); await db.execute(text("DELETE FROM inventory_movements")); and so on. Using raw SQL is deliberate: SQLAlchemy ORM's delete() on all rows would load each row into memory before deleting (wasteful for seed cleanup). The raw text() approach issues a single DELETE per table directly on the server. The deletions are wrapped in a single transaction, so if any deletion fails (e.g., a circular reference not accounted for), all deletions are rolled back, and the database remains in its original state.

**Follow-up:**
1. Why not use CASCADE deletes on foreign keys instead of manual ordering?
2. How would you handle circular references in seed deletion ordering?
3. What is the performance difference between ORM delete and raw SQL delete for bulk operations?

### Q138. Why is product image upload a separate endpoint?

**Short Answer:** POST /products/ creates the product without an image; then POST /products/{id}/image uploads a multipart file to R2 and updates the image_url. This separates metadata creation from file upload.

**Detailed Answer:** The separation serves several purposes: (1) Decoupling: product creation (metadata: name, sku, price, etc.) is a simple JSON POST. Image upload is a multipart/form-data POST. Mixing them would require the create endpoint to accept both JSON fields and file data (multipart/form-data with mixed content), complicating the Pydantic schema and validation. (2) Partial updates: a user can create a product and add an image later. The product already exists in the system, can be searched, and appears in listings (with a placeholder or no image). (3) Error isolation: if the image upload to R2 fails (network issue, file too large, invalid type), the product record is still created. The user can retry the image upload without re-entering all product details. (4) Progressive enhancement: the frontend can show the product form as a simple form, then handle file upload as a separate step (or even a background upload). The image endpoint validates file type and size, uploads to R2, and updates Product.image_url. If a previous image exists, it deletes the old one from R2 to prevent orphaned files.

**Follow-up:**
1. How would you handle uploading multiple images for a single product?
2. What happens to the image in R2 when the product is deleted?
3. Could this be simplified with a pre-signed URL for direct browser-to-R2 upload?

### Q139. How is order status validated?

**Short Answer:** Currently there is no state machine -- any valid status string is allowed. For production, a VALID_TRANSITIONS dict would define allowed transitions per status.

**Detailed Answer:** The current OrderService.update_status method simply accepts a new_status string and sets it on the order: order.status = new_status; await db.commit(). There is no validation that the transition is valid (e.g., from "pending" to "shipped" is allowed, but from "delivered" to "pending" should not be). The validation is limited to checking that new_status is one of the OrderStatus enum values (via Pydantic validation on the request schema). For production, a state machine would be added: VALID_TRANSITIONS = { "pending": ["processing", "cancelled"], "processing": ["shipped", "cancelled"], "shipped": ["delivered", "cancelled"], "delivered": [], "cancelled": [] }. The update method would check: if new_status not in VALID_TRANSITIONS.get(order.status, []): raise HTTPException(400, detail="Invalid status transition"). This prevents business logic errors like skipping the "shipped" status or cancelling an already delivered order. The state machine would also trigger side effects: transitioning to "shipped" sends a notification, transitioning to "delivered" updates inventory analytics, etc.

### Q140. How is func.coalesce used in SQL queries?

**Short Answer:** SQL COALESCE prevents NULL from SUM on empty result sets. On the dashboard, func.coalesce(func.sum(price * qty), 0) ensures numeric output always, even when no records match.

**Detailed Answer:** In SQL, aggregate functions like SUM() return NULL when applied to an empty result set (no rows match the WHERE clause). If this NULL were passed directly to the Pydantic response model expecting an int or float, it would cause a serialization error or unexpected None value. The pattern used in KhataBox is: func.coalesce(func.sum(Product.price * OrderItem.quantity), 0). This generates SQL: SELECT COALESCE(SUM(price * quantity), 0) FROM ... . If the SUM returns NULL (no matching rows), COALESCE replaces it with 0. This ensures the API response always contains a numeric value for fields like total_revenue, total_orders, average_order_value. The COALESCE is used in dashboard queries, sales reports, and any aggregation that could return no results. The Python-side equivalent (using Python's None coalescing) is avoided because the NULL propagation would require post-processing every query result.

**Follow-up:**
1. What is the difference between COALESCE and IFNULL in SQL?
2. Why not use Python's or 0 instead of SQL COALESCE?
3. How would you handle COALESCE with multiple fallback values?

### Q141. Why does clientApi.delete return void?

**Short Answer:** DELETE returns Promise<void> because the backend returns 204 No Content. There is no res.json() call, unlike other HTTP methods that return JSON bodies.

**Detailed Answer:** The clientApi.delete method signature is delete(url: string, params?: Params): Promise<void>. This differs from get/post/put/patch which return Promise<T>. The reason is the FastAPI backend returns HTTP 204 No Content for successful DELETE operations, with an empty response body (no JSON). The clientApi.delete method checks the response status: if response.ok (status 2xx), it returns undefined (void). If not ok, it throws an error with the parsed error detail. This means callers cannot destructure a response: await api.products.delete(productId) -- no data variable. The pattern is consistent: delete returns nothing because there is nothing to return (the resource is gone). An alternative would be to return the deleted resource ID or a success confirmation, but REST convention favors 204 with no body for deletes. The frontend handles this by removing the deleted item from local state or triggering a refetch after the promise resolves.

**Follow-up:**
1. Would returning { success: true } be more useful than void?
2. How does the frontend update the UI after a successful delete with no response body?
3. What happens if the backend returns 200 with a body instead of 204?

### Q142. How does the cn() utility work?

**Short Answer:** cn() combines clsx for conditional classes with tailwind-merge for Tailwind conflict resolution. It enables the component className prop pattern.

**Detailed Answer:** The cn function is defined in src/lib/utils.ts: import { clsx, type ClassValue } from "clsx"; import { twMerge } from "tailwind-merge"; export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }. clsx handles conditional class joining (e.g., clsx("px-4", isActive && "bg-blue-500", className)) and returns a single string. tailwind-merge then resolves Tailwind CSS class conflicts by removing earlier classes when a later class sets the same CSS property (e.g., twMerge("px-4 px-6") returns "px-6" because the last padding-x wins). This is critical for component composition: a component can define default classes (like "px-4 py-2 text-sm") and merge user-supplied className props without style conflicts. Without twMerge, the user className would be appended, and both the default and user values would coexist, causing unexpected behavior (e.g., conflicting padding values). The cn function is used in every shadcn/ui component and custom component that accepts a className prop.

**Follow-up:**
1. What happens if two conflicting Tailwind classes are in the same cn() call?
2. Could this be replaced with inline styles or CSS modules?
3. How does twMerge handle responsive and state variants (hover:, md:)?

### Q143. How is the TSVECTOR column populated?

**Short Answer:** The search_vector column is populated via a PostgreSQL trigger (BEFORE INSERT OR UPDATE) that calls to_tsvector(). A GIN index provides fast full-text search.

**Detailed Answer:** The TSVECTOR column on the Product model is populated by a database trigger rather than calculated in Python. The trigger function is created in an Alembic migration: CREATE FUNCTION update_product_search_vector() RETURNS trigger AS  BEGIN NEW.search_vector := to_tsvector('english', coalesce(NEW.name, '') || ' ' || coalesce(NEW.description, '') || ' ' || coalesce(NEW.sku, '')); RETURN NEW; END;  LANGUAGE plpgsql;. Then: CREATE TRIGGER trg_product_search_vector BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_product_search_vector(). This ensures the search_vector is always in sync with the source columns, regardless of how the row is updated (direct SQL, ORM, admin tool). The GIN index (CREATE INDEX ix_product_search ON products USING GIN(search_vector)) enables fast full-text search queries using the @@ operator: Product.search_vector.op("@@")(func.plainto_tsquery("english", search_term)). The trigger approach is preferred over SQLAlchemy's Compute column because it works consistently outside the ORM and can be easily modified without code changes.

**Follow-up:**
1. Why use a trigger instead of SQLAlchemy's Compute column?
2. How would you add weighted search (name vs description)?
3. What happens to the search index performance on bulk inserts?

### Q144. How does the bulk order endpoint work?

**Short Answer:** POST /orders/bulk accepts an array of orders and creates them in a single transaction. It returns { created, failed, errors } with per-item results.

**Detailed Answer:** The bulk order endpoint accepts an array of OrderCreate schemas in the request body: List[OrderCreate]. The service iterates over the orders within a single database transaction. For each order, it attempts to create it (validate customer, check stock, decrement inventory, insert order + items). If an individual order fails validation (e.g., insufficient stock, invalid customer, duplicate SKU), the error is caught and recorded in the errors list, but the transaction continues processing remaining orders. After all orders are processed, the endpoint returns { created: number, failed: number, errors: Array<{ index: number, order: object, error: string }> }. The transaction is committed only once at the end, so all successful orders are persisted atomically. However, this means a failed order does not roll back successful ones. An alternative approach (all-or-nothing) would roll back the entire batch if any order fails. The current permissive approach was chosen for CSV import scenarios where the user expects partial success. The frontend displays the results in a summary dialog, allowing the user to fix failed orders and retry only those.

### Q145. How is soft delete implemented?

**Short Answer:** Uses an is_active flag instead of DELETE. All queries filter is_active == True. This makes records recoverable and preserves referential integrity.

**Detailed Answer:** Every major entity (Product, Order, Customer, Supplier, User) has an is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true")) column. Instead of DELETE, endpoints set is_active = False. All SELECT queries in the service layer include an implicit filter: await db.execute(select(Product).where(Product.is_active == True, Product.store_id == store_id)). This is enforced at the service level, not the database level (there is no partial index or row-level security enforcing it). Soft delete provides several benefits: (1) Recoverability: an admin can reactivate a deleted product or customer without data loss. (2) Referential integrity: foreign keys referencing soft-deleted records remain valid -- historical orders still reference the original product and customer records. (3) Audit trail: the is_active change is captured in the AuditLog, showing who deactivated the record and when. The downsides are: (a) all queries must remember to filter is_active == True (a forgotten filter leaks soft-deleted records). (b) Table size grows with soft-deleted records, though PostgreSQL handles this well with proper indexing. (c) Unique constraints on (store_id, sku) would prevent re-creating a product with the same SKU as a soft-deleted one unless the constraint is partial (WHERE is_active = true).

**Follow-up:**
1. How would you enforce the is_active filter at the database level (e.g., using a view)?
2. What is the performance impact of soft-deleted rows on queries?
3. How would you implement a permanent hard delete after 30 days?

### Q146. How is store_name displayed on the frontend?

**Short Answer:** store_name is batch-enriched, not stored in the DB. The frontend renders it as {product.store_name || "—"}. A dash (—) is shown for shared/no-store products.

**Detailed Answer:** The Product table does not have a store_name column -- it only has store_id (a foreign key to the stores table). The store name is enriched at the API layer (batch-loaded after querying products, as described in Q120). In the ProductResponse Pydantic model, store_name: Optional[str] = None. If the product has no store assigned (shared product) or the enrichment fails, store_name is None. The frontend table renders: <td>{product.store_name || "\u2014"}</td> -- the em dash (—) visually indicates that no store is associated. This pattern applies to all entities that display store-scoped data (orders, movements, transfers). The null handling is important because a raw "null" or "undefined" displayed in the table would be confusing. The conditional rendering also provides a visual cue for data quality issues -- if a product unexpectedly has no store_name, the dash highlights the anomaly for investigation.

**Follow-up:**
1. Would storing store_name redundantly on the Product table improve performance?
2. How would you handle store name changes -- would old enrichment data be stale?
3. What happens if the stores table is queried and the store has been soft-deleted?

### Q147. Why are numeric IDs converted to strings in Select components?

**Short Answer:** String(id) is used for the value prop, and parseInt(val) in the handler. This is required because shadcn/ui Select (Radix UI) uses string values only, not generic types.

**Detailed Answer:** Radix UI's Select primitive (and by extension shadcn/ui's Select) only accepts string values for the value and onValueChange types. The Select.Item component has a value prop that must be a string: <SelectItem value={String(product.id)}>{product.name}</SelectItem>. The onValueChange handler receives a string: const handleChange = (val: string) => { const id = val ? parseInt(val, 10) : null; ... }. Attempting to pass a numeric value directly causes TypeScript errors and runtime issues (the Select won't highlight the correct item). This string requirement applies to all shadcn/ui select variants (Select, MultiSelect, Combobox). For UUID primary keys (which are already strings), no conversion is needed -- they are passed directly. For numeric foreign keys (category_id, supplier_id), the String() conversion is applied. The parseInt(val, 10) uses base 10 explicitly to avoid octal interpretation of leading zeros. The conditional val && parseInt(val) prevents NaN when the value is cleared.

**Follow-up:**
1. How would you handle Select items with complex values (e.g., objects)?
2. Why does Radix UI enforce string values on Select?
3. Could this be abstracted into a generic Select wrapper that handles type conversion?

### Q148. How is the store list fetched in the dialog?

**Short Answer:** A useEffect triggered by the open prop fetches the store list. There is no caching or retry. Errors are silently ignored, resulting in an empty dropdown.

**Detailed Answer:** In the StoreSelectDialog (or any dialog that needs a store dropdown), the store list is fetched when the dialog opens: useEffect(() => { if (open) { setLoading(true); api.stores.list().then(setStores).catch(() => {}).finally(() => setLoading(false)); } }, [open]). The catch block is empty -- if the API call fails (network error, server error), the error is silently swallowed, stores remains as an empty array, and the dropdown simply shows no options. This design choice prioritizes non-blocking UX over error visibility: the dialog still opens, the user sees an empty or disabled dropdown, and no toast or error message appears. The rationale is that the store list is non-critical -- the user can close and reopen the dialog to retry. However, for production, better error handling would show a toast with "Failed to load stores. Please try again." and a retry button. There is no caching of the store list -- it is fetched anew each time the dialog opens, even if the user just closed and reopened it. A future optimization would cache the list in Zustand or React Query with a 5-minute stale time.

**Follow-up:**
1. How would you add retry logic to the store list fetch?
2. Should the store list be fetched once and cached globally instead of per-dialog?
3. What is the user experience when the dropdown is empty due to an error?

### Q149. How is the transfer status state machine enforced?

**Short Answer:** The state machine transitions are: pending -> approved/rejected, approved -> completed. Each transition validates the current status. Approval creates a TRANSFER_IN movement.

**Detailed Answer:** The TransferService enforces a state machine with explicit transition rules: (1) pending -> approved: allowed only if current status is "pending". Sets approved_at timestamp and approved_by user ID. Creates an InventoryMovement record with type="TRANSFER_IN", positive quantity (+quantity), at the destination store. (2) pending -> rejected: allowed only if current status is "pending". Sets rejected_at and rejected_by. No inventory changes. (3) approved -> completed: allowed only if current status is "approved". Sets completed_at. This is the final state -- no further transitions allowed. (4) No other transitions are permitted (e.g., approved -> rejected is not allowed). The validation is: VALID_TRANSITIONS = { "pending": ["approved", "rejected"], "approved": ["completed"] }. Before each status change, the service checks: if new_status not in VALID_TRANSITIONS.get(transfer.status, []): raise HTTPException(400, "Invalid status transition"). This prevents business logic errors like approving an already-approved transfer or completing a rejected one. The state machine also prevents re-entering the same status (e.g., approving twice would fail because approved is not a valid transition from approved).

**Follow-up:**
1. How would you add a "cancel" transition that reverses inventory movements?
2. What happens to the TRANSFER_IN movement if the transfer is rejected after approval?
3. How would you implement time-based auto-approval for transfers below a threshold?

### Q150. How does the transfer inbound movement work?

**Short Answer:** On approval, the service creates an InventoryMovement with type TRANSFER_IN and positive quantity. However, product.stock_quantity at the destination is NOT incremented -- physical receipt is a separate step that decouples authorization from the physical event.

**Detailed Answer:** When a transfer is approved, the service creates: movement = InventoryMovement(product_id=transfer.product_id, store_id=transfer.destination_store_id, type="TRANSFER_IN", quantity=transfer.quantity, transfer_id=transfer.id, created_by=approver_id). This records that a transfer is authorized and inbound. However, the destination product's stock_quantity is NOT incremented at approval time. The design philosophy is that stock quantities represent physically verified inventory. Incrementing stock on approval alone would mean the destination store's stock increases before the goods actually arrive, leading to phantom inventory. Instead, the stock increment happens only when the receiving store confirms receipt (a separate "receive transfer" step or automatic on "completed" status with verification). This decouples the authorization (business decision) from the physical event (goods received). The TRANSFER_IN movement serves as an audit trail showing authorized inbound stock. The actual stock reconciliation happens at the physical receipt step, where the receiving user can verify quantity and condition before confirming. This follows standard inventory management best practices.
