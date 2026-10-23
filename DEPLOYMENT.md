# Deploying DELLA

Recommended stack: **Vercel** (Next.js hosting) + **Supabase** (PostgreSQL + Storage). Both have free tiers for testing; for a commercial store plan on paid tiers (see costs below).

## 1. Database (Supabase Postgres)

1. Create a Supabase project (region close to Palestine, e.g. `eu-central-1` Frankfurt).
2. In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`.
3. Postgres search is case-sensitive: in `src/lib/catalog.ts` and `src/lib/admin-queries.ts`, add `mode: "insensitive"` to the `contains` filters.
4. Create the first migration against an empty database and commit it:
   ```bash
   DATABASE_URL="<direct connection string, port 5432>" npx prisma migrate dev --name init
   ```
5. Deploy migrations in CI/production with `npx prisma migrate deploy` (never `db push` in production).
6. Seed once: `npm run db:seed` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` set (12+ chars). Then remove `ADMIN_PASSWORD` from the environment.
7. Row Level Security: the app connects server-side with its own DB role and never exposes the database to browsers. Enable RLS on all tables with **no** policies for `anon`/`authenticated` so Supabase's auto-generated REST API cannot read data:
   ```sql
   do $$ declare r record; begin
     for r in select tablename from pg_tables where schemaname = 'public' loop
       execute format('alter table public.%I enable row level security', r.tablename);
     end loop; end $$;
   ```

## 2. Image storage

Create a **public** bucket `media` in Supabase Storage. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only!) and `SUPABASE_BUCKET`. Uploads are type-checked by magic bytes (JPG/PNG/WEBP/AVIF, ≤5MB; SVG rejected).

## 3. Hosting (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Set environment variables from `.env.example` (`DATABASE_URL` = pooled connection on port 6543 with `?pgbouncer=true`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL=https://<your domain>`, storage + notification keys).
3. Build command: `prisma generate && prisma migrate deploy && next build`.
4. HTTPS is automatic. Security headers (CSP, HSTS, frame-ancestors, nosniff, referrer policy) are set in `next.config.ts`.

**Rate limiting** is in-memory per instance. On serverless/multi-instance hosting, back `src/lib/rate-limit.ts` with Upstash Redis (free tier available) for consistent limits.

## 4. Custom domain

`della.com` is very likely already registered; confirm availability before planning around it. Alternatives: `della.ps` (Palestine ccTLD via PNINA-accredited registrars), `dellastore.com`, `shopdella.com`, `della-ps.com`.

1. Buy the domain from a registrar.
2. In Vercel → Project → Domains, add `yourdomain` and `www.yourdomain`.
3. At the registrar, set the DNS records Vercel shows (A record `76.76.21.21` for the apex, CNAME `cname.vercel-dns.com` for `www`).
4. Update `NEXT_PUBLIC_SITE_URL` and redeploy.
5. For email sending, verify the domain in Resend (SPF/DKIM DNS records).

## 5. Card payments (go-live checklist)

Card payments are **not live** until all of these are done:

1. Decide the merchant of record (partner or DELLA) and get written approval from the bank/gateway that a third-party storefront may process payments for that merchant.
2. Choose a gateway available to Palestinian merchants that offers **hosted checkout or tokenisation** (no card data on DELLA servers), **signed webhooks**, and a **refund API**. Ask local banks and gateways about their e-commerce acquiring options.
3. Implement an adapter in `src/lib/services/payments/` following `PaymentProvider` (see `sandbox.ts` for the exact contract: `createCheckout`, `verifyWebhook` over the raw body, `refund`) and register it in `payments/index.ts`.
4. Set `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`; register the webhook URL `https://<domain>/api/payments/webhook/<provider>`.
5. Run end-to-end tests in the gateway's sandbox: success, failure, duplicate webhook, amount mismatch, partial and full refund.
6. Only then enable **Card payment** in Admin → Settings.

## 6. Operations

- **Backups**: Supabase Pro includes daily backups and point-in-time recovery (add-on). Additionally run a weekly `pg_dump` to separate storage and test a restore quarterly.
- **Monitoring**: Vercel Analytics/Speed Insights for Core Web Vitals; an uptime monitor (e.g. UptimeRobot / Better Stack) on `/` and `/api/cart/quote`; error tracking (Sentry) for server and client errors.
- **Admin accounts**: create staff from Admin → Staff. To reset a lost Super Admin: `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:create` (bumps the session version, signing out old sessions).
- **Secrets rotation**: rotating `SESSION_SECRET` signs everyone out and invalidates existing order-tracking links (customers can still use the `/track` page).

## Costs (indicative; check current pricing)

| Service | Free tier | Commercial |
|---|---|---|
| Vercel | Hobby (non-commercial use only) | Pro ≈ $20/user/month (required for commercial use) |
| Supabase | Free (projects pause after inactivity, no backups) | Pro ≈ $25/month (daily backups) |
| Resend | 3,000 emails/month | from ≈ $20/month |
| WhatsApp Cloud API | — | per-conversation pricing set by Meta |
| Domain | — | ≈ $10–40/year (`.ps` typically more) |
| Payment gateway | — | per-transaction fees set by the acquirer |
