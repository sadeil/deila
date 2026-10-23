# DELLA — build status (2026-10-23)

## Verified

| Check | How |
|---|---|
| Typecheck, production build | `npm run typecheck`, `npm run build` — pass |
| 22 automated tests | `npm test` — pass. Unit: money parsing, phone validation, commission rules/allocation/refund scaling, webhook HMAC (tamper, wrong secret, replay window), state machine, CSV escaping & formula-injection, upload sniffing (SVG rejected). Integration (real DB copy): server pricing ignores client prices, zone fees, free-shipping threshold, unserviceable areas, COD order creation, idempotency, transition rules, commission pending→earned only after delivery + COD collection, double-collection blocked, full refund voids commission, cancel voids commission, tracked stock reservation / oversell prevention / restock, coupon per-phone limit + release on cancel, card order blocked from confirmation until paid, webhook signature verification, idempotent payment application |
| Storefront purchase in browser | product → add to bag (drawer) → checkout (governorate/city, disabled unserved city, coupon, terms) → COD order → confirmation page with timeline |
| Admin in browser | orders search/filter, order detail, Confirm action via state machine, product edit + save (audited) |
| Access control (HTTP) | admin pages/APIs without session → redirect/401; forged or customer token → rejected; order page without valid token → 404 |
| Route smoke test | all 22 admin pages + exports and 17 storefront routes return 200; unknown route 404; no server errors in log |
| Mobile layout | no horizontal overflow at 360 px on 9 storefront and 6 admin pages; Arabic RTL and English LTR both exercised |
| Chart palette | validated with the colour-vision validator (lightness, chroma, CVD separation, contrast) |

## Not yet verified
- Fulfillment-partner restricted login (scoping is implemented in queries/actions; not exercised end to end).
- Image upload through the browser UI (upload API and sniffing are implemented and unit-tested; the click-through wasn't run).
- Lighthouse / Core Web Vitals, screen-reader pass, automated a11y audit.
- Every admin form individually (smoke-tested for rendering; core actions exercised).

## Needs your input before launch
1. **Products**: real photos, verified prices, specs, warranty terms → then untick "Demo" and tick "Price verified" per product.
2. **Partner agreement**: legal name, contacts, real commission rate (seeded 10% is a placeholder).
3. **Delivery**: confirm served localities, zone fees (seeded 20–25 ₪) and ETAs with the courier/partner.
4. **Card payments**: choose an approved gateway for the merchant of record and obtain credentials — see DEPLOYMENT.md §5. Until then the site correctly shows card payment as "awaiting configuration".
5. **Email / WhatsApp**: Resend key + verified domain; WhatsApp Cloud API + approved templates.
6. **Legal**: privacy policy, terms and returns policy are drafts (editable in Admin → Site content).
7. **Domain**: confirm availability (della.com is very likely taken; consider della.ps).
8. **Contacts & socials**: Admin → Settings / Site content.

## Known limitations / next phase
- Cart persists per browser (localStorage); the `Cart` tables exist but cross-device cart sync for signed-in customers isn't wired.
- An order is assigned to one partner (the first item's); splitting mixed-partner carts is needed only when a second partner is added.
- Rate limiting is in-memory — back it with Redis for multi-instance hosting.
- Local image uploads go to `/public/uploads`; production must use Supabase Storage (env vars ready).
- Customer messages are plain text; branded HTML email templates are a follow-up.
- No Open Graph share image yet.
