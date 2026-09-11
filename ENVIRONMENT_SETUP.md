# Tiny Inks — environment setup

Where every environment variable comes from, what it must contain, and which
environment needs it. Verified against every `process.env` read in the code.

- Placeholders: [.env.example](.env.example)
- Check a real configuration without printing secrets: [scripts/check-production-env.mjs](scripts/check-production-env.mjs)

---

## Rules that apply to every variable

1. **Values are used verbatim.** The code does not trim or normalise anything.
   No quotes, no leading/trailing spaces, no trailing newline. Paste values into
   the Vercel dashboard field; piping with `echo … | vercel env add` appends a newline.
2. **A change in Vercel does nothing until you redeploy.** Running deployments
   keep the values they were built with.
3. **`NEXT_PUBLIC_*` variables are public.** They are inlined into the browser
   bundle at build time. A secret must never have this prefix.
4. **server-only** variables are read only by server code: `lib/checkout-server.js`,
   `lib/print-server.js`, `lib/order-email.js`, `app/api/**`, `middleware.js`.
5. **Sensitive variables cannot be read back.** Vercel stores Production and
   Preview variables added from the CLI as *Sensitive* by default; their values
   cannot be viewed later in the dashboard or with `vercel env ls`. To be sure a
   Sensitive value is right, overwrite it with a freshly copied value.

## Environments

| Environment | Where the values live | `NEXT_PUBLIC_DEMO_MODE` | Stripe keys |
|---|---|---|---|
| **Production** — www.tinyinks.ae | Vercel → project → Settings → Environment Variables → *Production* | `false` | live (`pk_live_` / `sk_live_`) |
| **Preview** | Vercel → … → *Preview* | `true`, or `false` with test keys | test only |
| **Local** | `.env.local` (git-ignored) — copy `.env.example` | `true` | test, or none |

---

## How checkout uses the variables

```
Browser  /[locale]/checkout  (components/checkout/CheckoutClient.jsx)
  │
  ├─ GET  /api/checkout/quote ─────────── returns flags + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  │
  ├─ POST /api/checkout/intent  (app/api/checkout/intent/route.js)
  │    ├─ quoteBasket()  →  POST https://{NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/api/{NEXT_PUBLIC_SHOPIFY_API_VERSION}/graphql.json
  │    │                    header X-Shopify-Storefront-Access-Token: NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN
  │    └─ createPaymentIntent() → POST https://api.stripe.com/v1/payment_intents
  │                               Authorization: Bearer STRIPE_SECRET_KEY
  │                               basket + contact stored in metadata o0…oN
  │
  └─ Stripe Payment Element confirms the payment (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

Stripe ──► POST https://www.tinyinks.ae/api/stripe/webhook   (payment_intent.succeeded)
           (app/api/stripe/webhook/route.js)
  ├─ verify Stripe-Signature with STRIPE_WEBHOOK_SECRET
  ├─ findOrderForKey(pi)      → Admin GraphQL search for tag pi-<id>   (needs an Admin token)
  ├─ quoteBasket() again      → Storefront API (as above)
  ├─ createOrderFromPayload() → adminRequest('/orders.json')
  │    └─ getAdminToken()   (lib/print-server.js)
  │         if SHOPIFY_ADMIN_TOKEN is set → use it, no request
  │         else POST https://{ADMIN_HOST}/admin/oauth/access_token
  │              Content-Type: application/x-www-form-urlencoded
  │              grant_type=client_credentials
  │              client_id=SHOPIFY_CLIENT_ID
  │              client_secret=SHOPIFY_CLIENT_SECRET
  │    └─ POST https://{ADMIN_HOST}/admin/api/{SHOPIFY_ADMIN_API_VERSION}/orders.json
  │         header X-Shopify-Access-Token: <token from above>
  └─ Resend: customer confirmation + staff notification (RESEND_API_KEY)

ADMIN_HOST = SHOPIFY_SHOP_DOMAIN || SHOPIFY_STORE_DOMAIN || NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
```

Admin order creation is switched on (`shopifyOrders: true`) when ADMIN_HOST is set
**and** either `SHOPIFY_ADMIN_TOKEN` or both `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` are set.

---

## Variables

"Production" column: **required** = checkout, orders or security break without it ·
*recommended* = a feature degrades · optional = has a sensible default.

### Mode

| Variable | Exposure | Production | Contains | Read in |
|---|---|---|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | public | **required: `false`** | Flag. Only the exact string `true` enables the sample catalogue. | `lib/shopify.js:6` |

### Shopify Storefront API (catalogue and prices)

| Variable | Exposure | Production | Contains / format | Where it comes from | Read in |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | public | **required** | Bare hostname `tiny-inks-stationery.myshopify.com` | Shopify admin → Settings → Domains (the `.myshopify.com` one) | `lib/shopify.js:1`; last fallback for ADMIN_HOST |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` | public | **required** | Storefront API **public** access token | Shopify admin → Sales channels → Headless → your storefront → Storefront API | `lib/shopify.js:2` |
| `NEXT_PUBLIC_SHOPIFY_API_VERSION` | public | optional (`2026-01`) | `YYYY-MM` | shopify.dev API versions | `lib/shopify.js:3` |

### Shopify Admin API (order creation, staff queue)

| Variable | Exposure | Production | Contains / format | Where it comes from | Read in |
|---|---|---|---|---|---|
| `SHOPIFY_CLIENT_ID` | server | **required** | Client ID of the Dev Dashboard app — exact characters, nothing else | Dev Dashboard → **Tiny Inks Website Backend** → Settings → *Client ID* | `lib/print-server.js:26` → sent as `client_id` |
| `SHOPIFY_CLIENT_SECRET` | server | **required** | Client secret of the **same** app | Same Settings page → *Client secret* | `lib/print-server.js:27` → sent as `client_secret` |
| `SHOPIFY_SHOP_DOMAIN` | server | **required** | Bare hostname `tiny-inks-stationery.myshopify.com` — no `https://`, no `/`, no `/admin` | The store the app is installed on | `lib/print-server.js:28` |
| `SHOPIFY_ADMIN_API_VERSION` | server | optional (`2026-01`) | `YYYY-MM` | shopify.dev API versions | `lib/print-server.js:29` |
| `SHOPIFY_ADMIN_TOKEN` | server | **leave empty** (Dev Dashboard app) | Static `shpat_` token of a *legacy admin-created* custom app | Shopify admin → Settings → Apps → Develop apps → app → API credentials | `lib/print-server.js:25,54` — **overrides** the client ID/secret |
| `SHOPIFY_STORE_DOMAIN` | server | do not set | Older fallback name for `SHOPIFY_SHOP_DOMAIN` | — | `lib/print-server.js:28` |

The same Admin token is also used by the staff app (`app/api/staff/orders`, `app/api/staff/status`).

### Stripe

| Variable | Exposure | Production | Contains / format | Where it comes from | Read in |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | **required** | `pk_live_…`, same mode as the secret key | Stripe Dashboard (live mode) → API keys | `lib/checkout-server.js:18`, `app/api/checkout/quote/route.js:11` |
| `STRIPE_SECRET_KEY` | server | **required** | `sk_live_…` | Stripe Dashboard (live mode) → API keys | `lib/checkout-server.js:17` |
| `STRIPE_WEBHOOK_SECRET` | server | **required** | `whsec_…` | Workbench → Webhooks → endpoint `https://www.tinyinks.ae/api/stripe/webhook` → Signing secret | `lib/checkout-server.js:19`, `app/api/stripe/webhook/route.js` |
| `CHECKOUT_ALERT_WEBHOOK` | server | optional | `https://` URL (Slack/Discord incoming webhook) | Slack / Discord | `lib/checkout-server.js:21` |

The webhook endpoint must be **www**: `https://tinyinks.ae/...` answers with a 308
redirect, and Stripe treats any redirect as a failed delivery. Each endpoint (and
each mode) has its own signing secret.

### Email (Resend)

| Variable | Exposure | Production | Contains / format | Where it comes from | Read in |
|---|---|---|---|---|---|
| `RESEND_API_KEY` | server | *recommended* | `re_…` | resend.com → API Keys | `lib/order-email.js:13`, `app/api/contact/route.js:36` |
| `RESEND_FROM_EMAIL` | server | *recommended* | `Tiny Inks <orders@tinyinks.ae>` on a domain verified in Resend | Resend → Domains | `lib/order-email.js:14` |
| `ORDER_NOTIFICATION_EMAIL` | server | *recommended* | Staff inbox for new orders | — | `lib/order-email.js:15` |
| `CONTACT_TO_EMAIL` | server | *recommended* | Contact-form inbox; fallback staff order recipient | — | `app/api/contact/route.js:37`, `lib/order-email.js:15` |
| `CONTACT_FROM_EMAIL` | server | optional | Contact-form sender; fallback order sender | Resend → Domains | `app/api/contact/route.js:38`, `lib/order-email.js:14` |
| `FORMSPREE_FORM_ID` | server | optional | Formspree form id — used only when `RESEND_API_KEY` is empty | formspree.io | `app/api/contact/route.js:50` |

Without a sender variable, mail goes out from `onboarding@resend.dev`, Resend's
shared testing address. Without `RESEND_API_KEY`, order emails are skipped; the
order itself is still created.

### Staff app, signed links, cron

| Variable | Exposure | Production | Contains / format | Where it comes from | Read in |
|---|---|---|---|---|---|
| `STAFF_PASSWORD` | server | **required** | Long shared password | You choose | `lib/print-server.js:244` — unset = demo password from the source code |
| `PRINT_SIGNING_SECRET` | server | **required** | ≥ 32 random characters (`openssl rand -hex 32`) | You generate | `lib/print-server.js:17`, `middleware.js:8` — unset = default secret from the source code |
| `STAFF_SESSION_SECRET` | server | do not set | Older fallback name for `PRINT_SIGNING_SECRET` | — | same lines |
| `CRON_SECRET` | server | *recommended* | Random string; Vercel sends it as `Authorization: Bearer` | You generate | `app/api/print/cleanup/route.js:11` |
| `BLOB_READ_WRITE_TOKEN` | server | optional | `vercel_blob_rw_…` | Vercel → Storage → Blob | `lib/print-server.js:13` |
| `PRINT_LINK_TTL_HOURS` | server | optional (`24`) | Number | — | `lib/print-server.js:15` |
| `PRINT_FILE_RETENTION_DAYS` | server | optional (`7`) | Number | — | `lib/print-server.js:16` |

### Site details (public)

| Variable | Production | Contains / format | Read in |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | *recommended* | Origin only: `https://www.tinyinks.ae` (default is the apex, which redirects) | `lib/site.js:1` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | *recommended* | Digits with country code; unset = placeholder `971500000000` | `lib/site.js:9`, `app/[locale]/bundles/page.jsx:31`, `components/HomeSections.jsx:90` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | optional (`hello@tinyinks.ae`) | Email | `lib/site.js:13`; last fallback mail recipient |
| `NEXT_PUBLIC_INSTAGRAM_URL` | optional | `https://` URL | `lib/site.js:14`, `app/[locale]/page.jsx:310` |
| `NEXT_PUBLIC_TIKTOK_URL` | optional | `https://` URL | `lib/site.js:15` |
| `NEXT_PUBLIC_SHOP_ADDRESS` | optional | Text | `lib/site.js:19` |
| `NEXT_PUBLIC_SHOP_MAPS_URL` | optional | `https://` URL | `lib/site.js:20` |
| `NEXT_PUBLIC_SHOP_MAP_EMBED_URL` | optional | Google Maps embed URL | `lib/site.js:26` |
| `NEXT_PUBLIC_SHOP_HOURS` | optional | Text | `app/[locale]/about/page.jsx:72`, `app/[locale]/contact/page.jsx:17` |

### Set automatically — do not add

`NODE_ENV`, `VERCEL` (read in `app/api/staff/login/route.js`, `app/api/print/cleanup/route.js`).
Tooling only: `CHROME_PATH` (set by `scripts/lighthouse-run.mjs`); the Playwright tests read
`STAFF_PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the Storefront variables.

---

## Shopify Admin credentials — making sure they belong to the right app

The token request only works when **all** of these point at the same thing:

1. **Store** — Shopify admin of `tiny-inks-stationery` → Settings → Apps: *Tiny Inks
   Website Backend* is installed.
2. **App type** — Shopify admin → Settings → Apps → **Develop apps**. If the app is
   listed there with an *API credentials* tab showing an *Admin API access token*, it is a
   legacy admin-created app: use `SHOPIFY_ADMIN_TOKEN`, not the client ID/secret.
   If it is managed in the Dev Dashboard (dev.shopify.com), use the client ID/secret.
3. **Organization** — in the Dev Dashboard, make sure you are in the organization that
   owns the store. Client credentials only work for stores in the app's own organization.
4. **Credentials** — Dev Dashboard → Apps → *Tiny Inks Website Backend* → Settings →
   copy *Client ID* and *Client secret* from that one page.
5. **Scopes** — the app's active version must include `write_orders` (and `read_orders`).
6. **Compare** — run the check script. It prints the Client ID masked as
   `first4…last4 (length)`; compare that with the Dev Dashboard value.
7. **Apply** — paste into Vercel → Production, then **redeploy**.

### What the webhook's `stage` / `detail` means

| Webhook detail | Meaning | Fix |
|---|---|---|
| `stage: shopify_token`, `400 … application_cannot_be_found` | Shopify has **no app with the Client ID that was sent** ("Could not find Shopify API application with api_key …"). Checked before the secret, the organization or the scopes. | `SHOPIFY_CLIENT_ID` in Vercel Production is not this app's Client ID (wrong app, wrong field, extra characters, or changed without redeploy). Copy it again from step 4 and redeploy. |
| `stage: shopify_token`, `shop_not_permitted` | The app and the store are not in the same organization. | Use an app created in the organization that owns the store. |
| `stage: shopify_token`, `404 … Store unavailable` | The Admin host is not a live store. | Fix `SHOPIFY_SHOP_DOMAIN`. |
| `stage: shopify_token`, `request failed before Shopify answered … ENOTFOUND` | The host is malformed, e.g. it includes `https://` or a path. | Bare hostname only. |
| `stage: shopify_order_create`, `status 4xx` | Token worked; Shopify rejected the order. The full Shopify response is in the Vercel log line `SHOPIFY ORDER CREATE REJECTED`. | Depends on the body (e.g. missing `write_orders`, invalid field). |

The successful path logs `shopify admin: token granted host=… scope=…`, which shows the
scopes the token actually has.

---

## Running the environment check

The script never prints a secret (only "set, N chars, prefix"), masks identifiers to
first/last 4 characters, makes **no network request** unless asked, and never creates a
payment or an order. Exit code is `1` when any check fails.

```bash
# Production values, without writing them to disk (project must be linked: vercel link)
vercel env run -e production -- node scripts/check-production-env.mjs

# A dotenv file — keep pulled production files OUTSIDE the repo and delete them after
vercel env pull ../tinyinks-production.env --environment=production
node scripts/check-production-env.mjs --file ../tinyinks-production.env

# Local development rules
node scripts/check-production-env.mjs --file .env.local --env development

# Optional: also ask Shopify for an Admin token with those exact values.
# Prints only the HTTP status, Shopify's error code, or the granted scopes.
node scripts/check-production-env.mjs --file ../tinyinks-production.env --probe-shopify-token
```

If the script reports a Sensitive variable as empty when run on your machine, its value may
simply not be readable outside Vercel — confirm it in the dashboard instead of assuming it
is missing. `.gitignore` only covers `.env.local`, so do not pull production values into a
file inside the repository.
