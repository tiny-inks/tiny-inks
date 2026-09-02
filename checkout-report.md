# On-site checkout (Stripe) — build report

Built 2026-09-02. Payment now happens on tinyinks.ae (Stripe Payment Element / Cash on Delivery); Shopify remains the catalogue, inventory and order book. Bilingual EN/AR, mobile-first, brand tokens. Everything works in demo mode with **zero credentials** and lights up per env var. All work left uncommitted.

---

## 1. Architecture (what was built)

| Piece | Where |
|---|---|
| Checkout page `/en/checkout` `/ar/checkout` — 4 steps: contact → address (with the existing **Locate me** geolocation + manual fallback) → delivery method → payment; sticky order summary (card on desktop, expandable bottom bar on phones) | `app/[locale]/checkout/page.jsx`, `components/checkout/CheckoutClient.jsx` |
| **Server-side pricing** — the browser only ever sends `variantId + qty`; the server resolves each variant via Storefront API (`nodes()`): exists, `availableForSale`, `quantityAvailable` (insufficient stock → 409 with per-item reasons), then computes subtotal → delivery (free ≥ AED 150, else flat AED 15, from `config/checkout.js`) → total in **AED fils** | `lib/checkout-server.js → quoteBasket()`, `app/api/checkout/quote/route.js` |
| **Stripe** — PaymentIntent created server-side with the computed amount (`automatic_payment_methods` → cards + Apple Pay + Google Pay); Payment Element rendered client-side from js.stripe.com with the publishable key only; 3-D Secure via `stripe.confirmPayment` redirect flow. No Stripe SDK on the server — plain REST | `app/api/checkout/intent/route.js`, `CheckoutClient.jsx` |
| **Webhook = source of truth** — `/api/stripe/webhook` verifies the `stripe-signature` (HMAC-SHA256 over `t.rawBody`, 5-min tolerance, constant-time compare); on `payment_intent.succeeded` creates the Shopify order. The full order payload rides in the PaymentIntent **metadata** (chunked `o0..oN`), so any server instance can rebuild it | `app/api/stripe/webhook/route.js`, `chunkPayload()` |
| **Idempotency** — every order is tagged `pi-<payment_intent>` (or `pi-cod_<key>`); before creating, the webhook checks a local map **and** searches Shopify by that tag. Same event twice → same order, `duplicate: true` | `findOrderForKey()`, `rememberOrder()` |
| Shopify order — Admin REST `POST /orders.json`: line items by numeric variant id + qty, **line-item properties carried through** (print file URL/ref, pages, options), customer name/email/phone, shipping address, shipping line, `financial_status: paid` + a success transaction (gateway "Stripe (tinyinks.ae)"), `taxes_included: true` (UAE VAT is in the prices — keep Shopify's "all prices include tax" ON), note + `note_attributes.stripe_payment_intent`, **metafield** `checkout.stripe_payment_intent`, tags `web`, `pi-…`, `print-service` for print jobs, `cod` for COD, `inventory_behaviour: decrement_obeying_policy` | `createOrderFromPayload()` |
| Order-creation failure — logged, written to `tmp/tiny-inks-print/failed-orders/`, optional POST to `CHECKOUT_ALERT_WEBHOOK`, webhook returns **500 so Stripe retries** (idempotent). The customer still sees success: their money was taken, recovery is ours | `recordFailedOrder()` |
| Confirmation `/[locale]/order/confirmed?payment_intent=…` — **polls** `/api/checkout/order?pi=` (the browser never creates orders); shows order number + next steps + WhatsApp; honest "number on its way" state if the webhook is slow; `redirect_status=failed` → bilingual retry screen | `components/checkout/OrderConfirmed.jsx`, `app/api/checkout/order/route.js` |
| **COD** — creates the order immediately with `financial_status: pending` + tag `cod`; idempotent per session key | `app/api/checkout/cod/route.js` |
| **Print module** — the print flow now pushes its lines (with all attributes) into the normal cart and continues to this checkout; print orders pay on-site and appear in the staff queue tagged `print-service` | `components/print/PrintOrder.jsx` |
| Demo mode — no Stripe keys → card option hidden with a clear note, COD works and lands in the staff app's order book; no Admin credentials → same | demo bridge in `createOrderFromPayload()` |

### Failure paths (bilingual messages in `dict.checkout.errors`)
declined card (Stripe error surfaced inline, nothing charged) · insufficient/sold-out/vanished items (re-checked at quote AND again when creating the intent → 409 + per-item message + "back to cart") · Stripe/webhook not configured (503 + honest UI note) · network drop (retryable message; PaymentIntent metadata means a webhook can still land the order if payment actually went through) · expired/failed redirect (`redirect_status=failed` screen with retry) · webhook retry (idempotent) · rate limiting (429 message).

### Security
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SHOPIFY_CLIENT_SECRET`/`SHOPIFY_ADMIN_TOKEN` are read only in server files (`lib/checkout-server.js`, `lib/print-server.js`, route handlers). Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` reaches the browser.
- All checkout endpoints rate-limited per IP (30/10 min; polling endpoint 120/10 min).
- Card data never touches our server (Payment Element → Stripe directly); logs contain payment-intent ids and amounts, never card numbers.
- Webhook signature: timestamp tolerance + `crypto.timingSafeEqual`.

### Shopify Admin auth (updated per Dev Dashboard change)
Dev Dashboard apps no longer expose a static `shpat_` token. `lib/print-server.js` now implements the **client credentials grant**:
`POST https://{SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token` with form fields `grant_type=client_credentials`, `client_id`, `client_secret` → `{ access_token, scope, expires_in: 86399 }`. The token is cached in memory and refreshed 60 s before expiry; a 401 forces one re-fetch + retry (`adminRequest()`), and every Admin call (GraphQL + REST) goes through it. A legacy `SHOPIFY_ADMIN_TOKEN` still works as a fallback. Note Shopify's constraint: **the app and the store must be in the same Shopify organization**.

---

## 2. Every environment variable

| Variable | Side | Purpose |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | browser | Renders the Payment Element (`pk_test_…` first) |
| `STRIPE_SECRET_KEY` | server | Creates/reads PaymentIntents (`sk_test_…` first) |
| `STRIPE_WEBHOOK_SECRET` | server | Verifies webhook signatures (`whsec_…`) |
| `CHECKOUT_ALERT_WEBHOOK` | server, optional | POSTed when a paid order fails to reach Shopify |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | server | Dev Dashboard app credentials for the client-credentials grant |
| `SHOPIFY_SHOP_DOMAIN` | server | `your-store.myshopify.com` (falls back to `SHOPIFY_STORE_DOMAIN` / the public storefront domain) |
| `SHOPIFY_ADMIN_API_VERSION` | server | default `2026-01` |
| `SHOPIFY_ADMIN_TOKEN` | server, legacy | optional static-token fallback |
| existing | | `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`, `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN`, `NEXT_PUBLIC_DEMO_MODE`, print-service vars (`BLOB_READ_WRITE_TOKEN`, `PRINT_SIGNING_SECRET`, `STAFF_PASSWORD`, `CRON_SECRET`…) |

## 3. Shopify app scopes (Dev Dashboard app)
- `write_orders` + `read_orders` — create paid/pending orders, idempotency tag search, staff queue
- `read_products` — variant verification (Admin side, if you later move quote checks to Admin)
- Storefront API (existing token): `unauthenticated_read_product_listings`, `unauthenticated_read_product_inventory` (for `quantityAvailable`), `unauthenticated_read_product_tags`
- Nothing else. No customer-write scope is needed (customers are created implicitly by orders).

## 4. Registering the Stripe webhook
1. Stripe Dashboard (test mode) → Developers → Webhooks → **Add endpoint**.
2. URL: `https://tinyinks.ae/api/stripe/webhook`. Events: `payment_intent.succeeded` (others are acknowledged and ignored).
3. Copy the signing secret → `STRIPE_WEBHOOK_SECRET` in Vercel.
4. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the printed `whsec_…`.
5. Keep the payment methods you want (cards, Apple Pay, Google Pay) enabled in Stripe's payment-method settings; Apple Pay needs the domain registered under Stripe → Settings → Payment method domains.

## 5. Tests (`tests/e2e/checkout.spec.js`, plus updated cart/print/delivery specs)
- **Price tampering**: client sends fake prices/totals in every field — quote returns catalogue prices; delivery free ≥ AED 150, flat AED 15 under; collect = 0.
- **Out-of-stock / unknown variant** → 409 with per-item reasons.
- **COD journey** at 360px in **EN and AR**: 4 steps, Locate me (mocked geocoder), order confirmed with number, cart cleared.
- **COD idempotency**: same session key posted twice → one order; the order appears in the staff book as PENDING with the server total.
- **Webhook**: bad signature → 400; valid signed `payment_intent.succeeded` → order; the exact same event again → same order (`duplicate: true`); other event types ignored; the confirmation poller finds the order by `pi`.
- **Failed-payment redirect** shows the bilingual retry screen.
- **Stripe card journeys** (success `4242…4242`, declined `4000…0002`, 3DS `4000 0027 6000 3184`) are written but **skip unless test keys are set** — see §6.

## 6. Not tested here (no credentials on this machine)
- Real Stripe calls: PaymentIntent creation, Payment Element rendering, Apple/Google Pay, 3-D Secure — the card specs auto-skip without `STRIPE_SECRET_KEY` + publishable key. Run them after adding **test-mode** keys.
- Real webhook deliveries from Stripe (tests sign events themselves against the test secret `whsec_test_e2e` that the Playwright web server injects when none is set).
- Live Shopify order creation / tag search / metafield write, and the client-credentials token grant + refresh + 401 retry (implemented per the current shopify.dev docs, exercised only against the demo bridge).
- `quantityAvailable` behaviour against a real store (depends on the storefront inventory scope).
- VAT numbers on real orders (relies on Shopify's "prices include tax" setting matching `config/checkout.js → taxesIncludedInPrices`).

## 7. Config / how to change things
- Delivery fee, free-over threshold, COD on/off: `config/checkout.js`.
- The legacy Shopify-hosted checkout path was removed from the UI (cart/drawer now link to `/checkout`); `cart.checkout()` remains in `CartContext` but nothing calls it.
- Print pricing is still `config/print-pricing.js`; print orders flow through this checkout (in live mode the 13 hidden print products from print-report.md §3 are still required).
