# DELLA · ديلا — Gadgets Made for Her

A bilingual (Arabic-first, RTL / English LTR) e-commerce platform for beauty tech and lifestyle gadgets in Palestine, with a complete admin dashboard. One codebase, one database: the storefront and `/admin` share the same data.

## Quick start (local)

```bash
npm install
cp .env.example .env          # then fill DATABASE_URL (absolute path), SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma db push            # create tables
npm run db:seed               # roles, Super Admin, categories, demo products, delivery areas, homepage content
npm run dev                   # http://localhost:3000  ·  admin: http://localhost:3000/admin
```

```bash
npm test             # unit + integration tests (uses a throwaway copy of the DB)
npm run typecheck
npm run build
```

## What's included

**Storefront**: editorial homepage driven entirely by the database, shop with search, suggestions, category/brand/price/availability filters, sorting by newest/price/real sales, pagination, quick view, wishlist (guest + account), product pages (zoom gallery, video, specs, variants, delivery/warranty/returns, verified reviews, sticky mobile buy bar, JSON-LD), cart drawer + cart page, one-page checkout (guest or account), Cash on Delivery, order confirmation, secure order tracking, customer accounts (register, sign-in, password reset, profile, saved addresses, order history, deletion request), contact form, policy pages, sitemap, robots.

**Admin (`/admin`)**: overview with live KPIs and charts by date range; orders (filters, search, state-machine actions, tracking/courier, COD collection, refunds, notes, history, print, CSV); products (full CRUD, images upload/reorder/alt text, variants, specs, SEO, commission override, duplicate, publish/archive); categories & brands; inventory (tracked quantities, verification, adjustment history, low-stock alerts); reviews moderation; customers (profiles, guests, support notes, suspend/anonymise); commissions (pending/earned/paid/void, by order/product/month, settlements, clawbacks, CSV); retail partners; coupons; delivery zones/localities/couriers; payments (records, gateway webhooks); homepage & page content editor; reports + CSV exports; notifications & inquiries; staff & role permissions; settings; audit log.

## Honesty rules built into the product

- Demo products are flagged (`isDemo`, `priceVerified=false`) and labelled on the storefront until an admin verifies them. Their images are illustrations, labelled as such.
- Inventory starts **UNVERIFIED** and is shown as "availability confirmed after ordering".
- "Best sellers" and reviews only appear when real, non-canceled sales / approved verified-purchase reviews exist.
- Card payment is shown as **awaiting configuration** until an approved gateway is configured. Card payments can only become *Paid* through a signed gateway webhook — staff cannot mark them paid.
- Unconfigured email/WhatsApp channels are logged as **Not sent — channel not configured**.
- All dashboard figures are computed from records; gross order value, collected payments, refunds and commission are reported separately.

## Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Styling / motion | Tailwind CSS with design tokens (`tailwind.config.ts`), Framer Motion (respects reduced motion) |
| Data | Prisma ORM — SQLite locally, PostgreSQL/Supabase in production (same schema) |
| Auth | bcrypt (cost 12) + HS256 JWT in httpOnly cookies; separate admin & customer sessions; session revocation via `sessionVersion` |
| Validation | Zod on every API route and server action |
| Charts | Recharts with a CVD-validated palette |

```
src/
  app/(store)/…        storefront routes          app/admin/(panel)/…   admin routes
  app/api/…            JSON APIs (quote, checkout, webhooks, exports, upload)
  app/actions/…        customer server actions    app/admin/actions/…   admin server actions
  lib/services/        pricing · orders (state machine) · commission · payments · notifications · analytics
  lib/                 auth · rbac · settings · i18n · validation · storage · rate-limit · audit
  components/          brand · store · product · home · admin · ui
prisma/schema.prisma   data model (all money in integer agorot)
tests/                 unit + integration tests
```

### Key flows

- **Pricing**: the client sends only variant IDs + quantities; `lib/services/pricing.ts` reprices, applies one coupon (date/limit/min-order/product/category/per-phone rules) and zone shipping (fees, free-shipping thresholds, COD availability) on the server.
- **Checkout** (`createOrder`): idempotency key → single DB transaction re-quotes, rejects anything that changed, atomically reserves tracked stock (conditional decrement: no overselling), records coupon usage, snapshots prices/addresses, computes per-line commission, creates payment + delivery + commission rows.
- **Order access**: tracking links carry an HMAC token; order numbers alone reveal nothing. The `/track` lookup requires number **and** phone and is rate limited.
- **Fulfilment** state machine: Pending → Confirmed → Preparing → Shipped → Out for delivery → Delivered (+ Canceled / Returned). Cancel/return restocks exactly what was reserved and voids commission; payment status is tracked separately.
- **Commission**: rule priority product → partner → default. Earned only when the order is **delivered and paid**; voided on cancel/return/full refund; scaled on partial refunds; returns after a payout are flagged as clawbacks.
- **Payments**: `PaymentProvider` interface (hosted checkout, signed webhook verification, refunds). The webhook route verifies the HMAC over the raw body, stores each event once (idempotent), and checks amount + currency.

### Roles

Super Admin · Store Manager · Product Manager · Order Manager · Fulfillment Partner (scoped to its partner's orders/inventory) · Finance Viewer. Permissions are editable per role (except Super Admin) and enforced server-side on every page, action and API. Admin accounts can only be created by a Super Admin (or the CLI).

See **DEPLOYMENT.md** for production setup and **STATUS.md** for what's complete and what needs your input.
