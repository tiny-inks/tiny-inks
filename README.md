# Tiny Inks — Headless Shopify Storefront

Custom Next.js storefront for **Tiny Inks** (تايني انكس للقرطاسية) — bilingual (English + Arabic RTL),
built on the brand palette extracted from the logo, with Shopify as the backend for
products, cart, checkout, and order management.

**Pages:** Home · Shop (filters + search) · Gift Sets & Bundles · About · Contact · Product pages · Cart drawer · Cart page · Policies (privacy / terms / shipping / returns) · FAQ

---

## 1 · Run it right now (demo mode — no Shopify needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/en`. Use the language button in the header for Arabic (`/ar`).

Demo mode ships with 12 sample products and brand-styled covers so the whole design
works before Shopify exists. The cart works locally; only real checkout is disabled.

> If `npm run dev` shows any error, copy the message and send it back — small fixes take seconds.

---

## 2 · Connect the real Shopify store

### A. Create the store
1. Go to shopify.com → start a store (trial is fine to begin).
2. In **Settings → General**, set currency to **AED** and address to Abu Dhabi.
3. In **Settings → Markets**, make sure **United Arab Emirates** is your main market.

### B. Add products — follow these conventions (important!)

**The site's categories are your Shopify COLLECTIONS.** The header menu, the
home category grid, and the shop sidebar all read collections straight from the
store — add, rename, or remove a collection in Shopify and the site follows,
no code changes ever.

#### B1. Create the collections (once)
Shopify admin → **Products → Collections → Create collection**, type
**Automated**, with these handles and rules (handle = the URL slug, shown under
the title field):

| Collection title | Handle | Automated rule |
|---|---|---|
| Notebooks | `notebooks` | Product type equals `Notebooks` |
| Journals | `journals` | Product type equals `Journals` |
| Planners | `planners` | Product type equals `Planners` |
| Pens & Tools | `pens-tools` | Product type equals `Pens & Tools` |
| Desk & Notes | `desk-notes` | Product type equals `Desk & Notes` |
| Gift Sets | `gift-sets` | Product tag equals `bundle` |

Give each collection an **image** (it becomes the category tile photo).
You can add more collections any time — they appear on the site automatically.
A product in **no** collection still shows in **All Products** and in search —
nothing ever becomes invisible — but give every product a type so it lands in
a category page too.

#### B2. Bulk import with CSV (fastest way to load the catalog)
1. Shopify admin → **Products → Import** → upload a CSV.
2. Start from Shopify's sample CSV (linked in the import dialog) and fill
   **exactly these columns** (leave others empty):

   `Handle` · `Title` · `Body (HTML)` · `Vendor` (Tiny Inks) ·
   `Type` (one of the six types above) · `Tags` (see B3) ·
   `Published` (TRUE) · `Variant Price` · `Variant Compare At Price`
   (ONLY if there is a real old price — the site shows a strike-through
   automatically; never fake it) · `Variant Inventory Qty` ·
   `Variant Inventory Tracker` (shopify) · `Image Src` (public image URL) ·
   `Image Position` (1, 2, …) · `Image Alt Text` · `Status` (active)

   One row per product; add extra rows with the same `Handle` and only
   `Image Src`/`Image Position` filled for additional images (upload **at
   least 2** — the second shows on hover).
3. Import, then run `node scripts/catalog-check.mjs` (see B4).

#### B3. Tag conventions
- `color:blue` / `color:terracotta` / `color:cream` / `color:blush` /
  `color:mustard` / `color:sage` / `color:slate` / `color:ink` → powers the
  color filter swatches (no tag = no swatch, nothing breaks).
- `bestseller` → badge + home Best sellers row.
- `bundle` → Gift Sets collection + the Gift Sets & Bundles page + badge.

#### B4. Check your catalog health
```bash
node scripts/catalog-check.mjs
```
Prints every product that is missing images, a price, a product type, a
collection, or an Arabic translation — fix them in Shopify admin, rerun until
it says all good.

### C. Get the Storefront API token
1. Shopify admin → **Sales channels → add the "Headless" channel** (free, by Shopify).
2. Create a storefront inside it → copy the **public access token**.
   (Alternative: Settings → Apps → Develop apps → create app → enable Storefront API scopes → install → copy token.)

### D. Arabic content
1. Install Shopify's free **Translate & Adapt** app.
2. Add **Arabic** as a language and publish it (Settings → Languages).
3. Translate product titles/descriptions in Translate & Adapt.
   The site requests Arabic automatically on `/ar` pages via `@inContext(language: AR)` — untranslated products fall back to English.

### E. Point the site at the store
Copy `.env.example` → `.env.local`. Every variable is documented inline there,
grouped by feature and marked **required / optional** and **server-only**:

| Group | Variables |
|---|---|
| Mode | `NEXT_PUBLIC_DEMO_MODE` |
| Shopify Storefront | `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`, `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN`, `NEXT_PUBLIC_SHOPIFY_API_VERSION` |
| Shopify Admin (client-credentials grant, server-only) | `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_API_VERSION` (+ legacy `SHOPIFY_ADMIN_TOKEN`) |
| Stripe checkout | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, server-only `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `CHECKOUT_ALERT_WEBHOOK` |
| Print module (server-only) | `BLOB_READ_WRITE_TOKEN`, `PRINT_SIGNING_SECRET`, `PRINT_LINK_TTL_HOURS`, `PRINT_FILE_RETENTION_DAYS`, `CRON_SECRET` |
| Staff app (server-only) | `STAFF_PASSWORD` |
| Contact form (server-only) | `RESEND_API_KEY` + `CONTACT_TO_EMAIL` (+ `CONTACT_FROM_EMAIL`) or `FORMSPREE_FORM_ID` |
| Shop details | `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_TIKTOK_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_SHOP_ADDRESS`, `NEXT_PUBLIC_SHOP_MAPS_URL`, `NEXT_PUBLIC_SHOP_HOURS` |
| SEO | `NEXT_PUBLIC_SITE_URL` |

Server-only variables must never gain a `NEXT_PUBLIC_` prefix.

Restart `npm run dev`. Products, cart, and the **Checkout** button (real Shopify checkout,
payments, and orders in the admin) are now live.

### F. Payments & shipping (in Shopify admin)
- **Settings → Payments**: activate Shopify Payments (available in the UAE) or your preferred gateway; consider adding Tabby/Tamara later.
- **Settings → Shipping**: create a Abu Dhabi zone (1–2 days) and a UAE zone, with free shipping over AED 150 to match the site's marquee (or edit the marquee text in `lib/dictionaries.js`).

---

## 3 · Deploy (Vercel, ~10 minutes)
1. Push this folder to a GitHub repo.
2. vercel.com → **New Project** → import the repo (Next.js is auto-detected).
3. Add the same environment variables from `.env.local` in the Vercel project settings.
4. Deploy → connect her custom domain in Vercel when ready.

---

## 4 · Things you'll want to customize
| What | Where |
|---|---|
| WhatsApp number, Instagram, email | `.env.local` (`NEXT_PUBLIC_WHATSAPP_NUMBER` etc.) |
| Site URL (SEO/sitemap) | `NEXT_PUBLIC_SITE_URL` in `.env.local` |
| **All photos on the site** | **`lib/images.js` — one file, see below** |
| All wording (EN + AR) | `lib/dictionaries.js` |
| Policy pages & FAQ (EN + AR) | `content/policies/*.js` |
| Brand colors / spacing / animations | `app/globals.css` (top `:root` block) |
| Demo products | `lib/mock-data.js` |
| Hero shapes | `components/HeroAssembly.jsx` |

### 📷 Swapping in your real photos (do this before launch)
Every image on the site — hero photos, category tiles, the editorial photo, the
"From the desk" gallery, Instagram polaroids, and demo product photos — comes from
**one file: `lib/images.js`**. The current images are curated Unsplash placeholders.
Replace each `url` with your own photo (uploaded to Shopify Files, or `/public/photos/...`)
and update the `alt` texts (both EN and AR). Nothing else needs to change.
In live mode, product page photos come from Shopify product images automatically.

### 📄 Policies (template text — review before launch!)
`/policies/privacy` · `/policies/terms` · `/policies/shipping` · `/policies/returns` · `/faq`
live in `content/policies/*.js` in both languages. They contain placeholders —
`[LEGAL BUSINESS NAME]`, `[TRADE LICENSE NO.]`, `[EMAIL]`, `[ADDRESS]` — fill them in,
read every line (delivery fees, return window, etc. are sensible defaults, not legal advice),
and copy the same text into **Shopify Settings → Policies** so checkout shows matching policies.

### ✨ React Bits animations
The hero headline (SplitText — per-letter EN, whole-word AR), countdown digits (CountUp),
"From the desk" gallery (Masonry), section reveals (FadeContent), and the editorial photo
tilt (TiltedCard) use [React Bits](https://reactbits.dev) components, re-themed to the brand
and living in `components/reactbits/`. All of them turn off under `prefers-reduced-motion`.

**Honest notes**
- The 3 customer reviews on the home page are **sample placeholders** — replace them with real ones in `app/[locale]/page.jsx`.
- The newsletter + contact forms show a success message but don't send anywhere yet.
  Fastest real options: Shopify Email/Forms, Klaviyo (newsletter), or Formspree (contact). Ask me and I'll wire one in.
- Product images from Shopify load via plain `<img>` for reliability; we can switch to `next/image` optimization later.
- If Shopify ever retires API version `2026-01`, bump `NEXT_PUBLIC_SHOPIFY_API_VERSION` to a current one.

Made with ✦ for Tiny Inks.

## Contact form, delivery details and the home video

- **Contact form** (`/contact`) and the newsletter box post to `app/api/contact/route.js`. Set `RESEND_API_KEY` + `CONTACT_TO_EMAIL` in Vercel (or `FORMSPREE_FORM_ID`) to deliver messages by email. Until one of them is set the form never pretends to succeed — it shows WhatsApp / email buttons that carry the visitor's text.
- **Social icons** show only Instagram, TikTok and WhatsApp, from `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_TIKTOK_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`. Shop address and hours come from `NEXT_PUBLIC_SHOP_ADDRESS`, `NEXT_PUBLIC_SHOP_MAPS_URL`, `NEXT_PUBLIC_SHOP_HOURS`.
- **Delivery details on /cart** (name, phone, email, address, "Locate me") are saved on the device and, in live mode, attached to the Shopify cart as attributes + note + buyer identity right before the customer is sent to Shopify checkout. They appear on the order in Shopify admin under *Additional details*. Checkout itself is untouched.
- **Home video loop**: swap `public/video/tiny-inks-loop.webm` and `public/video/poster.jpg` (see `public/video/README.md`).

## Print service (/print) and staff app (/staff)

Customers upload PDF/DOCX/JPG/PNG on `/print`, get a live itemised quote (rates in `config/print-pricing.js`), and pay through the normal Shopify cart via hidden per-page products. Staff run the queue at `/staff` (installable PWA, shared password). Everything is documented in **print-report.md** — env vars, the Shopify products to create, how to change prices, how staff log in, and what could not be tested on this machine.
