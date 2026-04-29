# Order Hub

A multi-brand, multi-platform inventory and order management dashboard for Indian eCommerce sellers operating on Meesho, Flipkart, and Amazon. The workspace hosts an unlimited number of independent **companies** (brands) — seeded with **Feni Creation**, **Ambika Creation**, and **Jyot Fashion** — each with fully isolated inventory, orders, dashboards, and accounting. Admins can add or remove companies at runtime from the **Companies** page (`/companies`).

## Architecture

This is a pnpm monorepo containing the following artifacts and shared libraries.

### Artifacts
- **artifacts/order-hub** — React + Vite web app (the user-facing dashboard). Mounted at `/`. Uses `react-router-dom` for client-side routing.
- **artifacts/api-server** — Express API server. Exposes `/api/*` routes, including JWT-based auth endpoints under `/api/auth/*`. Uses the shared `@workspace/db` and `@workspace/api-zod` packages.
- **artifacts/mockup-sandbox** — Component sandbox for designing/iterating UI on the canvas (development only).

### Shared libraries
- **lib/api-spec** — OpenAPI 3 spec at `lib/api-spec/openapi.yaml`. Source of truth for the API. Codegen via `pnpm --filter @workspace/api-spec run codegen`.
- **lib/api-client-react** — Generated TanStack Query hooks (Orval) used by the web app.
- **lib/api-zod** — Generated Zod schemas (Orval) used server-side for request validation.
- **lib/db** — Mongoose ODM and MongoDB connection. Models: `User`, `Order`, `Inventory`, `Company`, `Counter` (provides numeric auto-incrementing `id` fields). `Order` and `Inventory` carry a required `brand` field (a `Company.slug`, plain string — no enum); the inventory unique index is `{ brand, platform, sku }`. The `Company` model owns the dynamic list of brands (slug, name). Default seed companies live in `lib/db/src/brand.ts` (`DEFAULT_COMPANIES`); only `isBrand()` slug-format validation is enforced at the type level. Connection is established by calling `connectDB()` in the API server's startup.
- **scripts** — Workspace scripts. `tsx ./src/seed.ts` populates demo inventory and 30 days of orders.

## Auth

Authentication is **custom JWT** (HS256) with bcrypt-hashed passwords. The API server signs tokens in `/api/auth/login` and `/api/auth/register` and verifies them with the `requireAuth` middleware. The web app stores the token in `localStorage` (key `orderhub_auth_token`) and attaches it as a `Bearer` token via `customFetch.setAuthTokenGetter`.

The first user to register becomes `admin`; everyone after is `staff`. Admin-only endpoints (user management) are gated by `requireAdmin`. Frontend route protection is handled by the `ProtectedRoute` and `GuestOnly` wrappers around `react-router-dom` routes.

## Multi-brand (workspace separation)

Every domain route (`/api/inventory`, `/api/orders`, `/api/upload`, `/api/dashboard/*` except `/dashboard/all-companies`, `/api/accounting/*`) sits behind both `requireAuth` and the `requireBrand` middleware. The active brand is read from the `X-Brand` header (or `?brand=` query param), validated as a slug (`/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/`), and exposed as `req.brand`. All Mongoose queries scope by `{ brand: req.brand }`, so each brand's data is fully isolated. The middleware does not hit the DB to validate the slug exists — tampered slugs simply return empty results.

`/api/companies` (GET for any authed user, POST/DELETE admin-only) manages the dynamic company list. Delete is blocked if it's the last remaining company OR if it still has orders/inventory. `/api/dashboard/all-companies` returns per-company aggregated stats plus a grand total — used by the dashboard's "All Companies Overview" section and does NOT require an `X-Brand` header.

On the web app, `BrandProvider` (in `artifacts/order-hub/src/lib/brand-context.tsx`) fetches the company list from `/api/companies`, persists the active brand in `localStorage` (`orderhub_active_brand`, default `feni`), and registers an extra-headers getter that injects `X-Brand` on every request. The header getter reads from a **`useRef`** (not React state) so the new brand is visible to refetches that fire synchronously after `setBrand()` — this is what makes brand switching feel instant without a page reload. On switch, `setBrand()` calls `queryClient.removeQueries()` (drops stale cached data) followed by `invalidateQueries({ refetchType: 'active' })` (forces in-flight refetches). If the persisted brand no longer exists in the company list (e.g. an admin deleted it), the provider falls back to the first available company. The brand switcher lives in the topbar with a "Manage" button (admin) linking to `/companies`.

A one-time startup migration (`artifacts/api-server/src/lib/migrations.ts`) seeds `DEFAULT_COMPANIES` on an empty DB, backfills any pre-existing inventory/order documents to `feni`, drops the legacy `{platform, sku}` unique index on inventory in favour of `{brand, platform, sku}`, and is idempotent on every boot.

Required env (configured in `.replit` shared userenv):
- `MONGODB_URI` — MongoDB connection string (Atlas).
- `JWT_SECRET` — random secret for signing JWTs.

## Features

- **Co. Dashboard** (`/co-dashboard`) — Cross-company table listing every brand with order count, revenue, inventory units and distinct SKUs (driven by `/api/dashboard/all-companies`). Click a row to switch the active brand.
- **Product Purchase** (`/product-purchase`) — Manual purchase-entry form (brand, product name, sku, qty, rate, vendor, date, notes) backed by the new `Purchase` Mongoose model and `/api/purchases` routes. Brand-scoped via `requireBrand`; supports listing with running totals and row delete with confirm.
- **Dashboard** — KPI tiles (Total Orders, Total Revenue, Inventory Units, Distinct SKUs), 30-day revenue area chart, sales-by-platform donut, per-platform breakdown cards, top SKUs, recent orders.
- **Orders** — Paginated/sortable/filterable table with platform tabs, search, edit/delete row actions, "Add Order" dialog. Creating an order automatically decrements the matching inventory row. Now displays Sub Order No (mono pill), Order Source (yellow badge), Reason for Credit Entry (color-coded status badge).
- **Pagination** — Shared `<DataTablePagination>` (`artifacts/order-hub/src/components/data-table-pagination.tsx`) provides Showing X to Y of Z, Rows per page (10/25/50/100), Previous/Next, Page X of Y. Used by Orders, Accounting, Product Purchase (server-side via `/api/*?page&pageSize`) and Return Orders (client-side over local rows).
- **Inventory** — Paginated/sortable/filterable table, inline edit, "Add Item" upserts on (platform, sku). Photo uploads go through `artifacts/api-server/src/lib/mega.ts` (Mega.nz storage; needs valid `MEGA_EMAIL`/`MEGA_PASSWORD` secrets).
- **Upload** — Drop a `.xlsx` or `.csv` of orders, parsed client-side via `xlsx`. Imports decrement inventory; response shows inserted/skipped/error counts.
- **Users** (admin-only) — Promote/demote roles, delete users.
- **Account** — Profile view and sign out.

Sidebar order (top-down): Co. Dashboard, Product Purchase, Dashboard, Orders, Return Orders, Inventory, Accounting, Upload, Companies, Users, Account.

## Branding

Dark navy/slate sidebar with an indigo brand accent. Platform colors are consistent across the app: Meesho = pink, Flipkart = blue, Amazon = orange. Money is formatted in INR with Indian number grouping (e.g. `₹1,32,475`).

## Development

- API server runs on `PORT` (assigned per-artifact, internal `8080`). Web app runs on its own `PORT` and reaches the API server via the workspace proxy at `/api/*`.
- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks and Zod schemas.
- After editing `lib/db/src/models/*`, no migration step is needed — Mongoose creates collections lazily. Index changes are reconciled on boot via `runStartupMigrations()`.
- Seed demo data with `pnpm --filter @workspace/scripts run seed`.
