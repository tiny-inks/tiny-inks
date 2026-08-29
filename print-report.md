# Print service module — build report

Built 2026-08-30 into the Tiny Inks storefront (Next.js 14, demo + live Shopify). Everything works in **demo mode with no credentials**; each integration lights up when its env var exists. All work is uncommitted.

---

## 1. What was built

### A. Customer page `/en/print` · `/ar/print` (in the header nav as **Print / طباعة**)
| Item | Where | Notes |
|---|---|---|
| Options: A4/A3, colour/b&w, single/double, copies, finishing (none/staple/spiral/lamination), notes | `components/print/PrintOrder.jsx` | Segmented buttons are real `role=radio` buttons (keyboard + screen reader) |
| Upload: PDF/DOCX/JPG/PNG ≤ 50 MB, drag-drop + tap, multiple files, per-file progress, thumbnail, remove | `PrintOrder.jsx`, `lib/print-client.js`, `app/api/print/upload/route.js` | Images preview via object URL; PDF first-page thumbnail via pdf.js loaded from cdnjs (best-effort, falls back to a PDF badge) |
| Automatic page count | `lib/print-client.js` (`pdf-lib` in the browser) + server re-check in local mode | Non-PDFs get an editable page field pre-filled with 1 (images) or empty (DOCX) with a clear note; submit is blocked until every file has a count |
| Live itemised quote | `lib/print.js → computeQuote()` | Lines: pages × rate, bulk discount, finishing, minimum-order top-up, delivery; every number from `config/print-pricing.js` |
| Fulfilment: collect (free, "ready in about X hours") or delivery (fee from config) | config `pickup.readyInHours`, `delivery.fee` | |
| Storage | `lib/print-server.js` | Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (browser uploads straight to Blob, so the 4.5 MB serverless body limit never applies); otherwise `/tmp/tiny-inks-print` with a **visible warning** on the page and in the staff app |
| Private files, short-lived signed links | `app/api/print/file/route.js` | Files are only ever served through `/api/print/file?ref&exp&sig` (HMAC-SHA256, default 24 h). Blob URLs are random and never shown; local files never leave `/tmp` except through this route |
| Checkout through Shopify | `lib/print.js → buildCartLines()`, `CartContext.addLines()` | Hidden per-page product with quantity = total pages + separate finishing / delivery / top-up lines, each carrying line-item attributes (file URL, file ref, file names, page counts, size, colour, sides, copies, finishing, fulfilment, note) |
| Demo mode | `app/api/print/demo-order/route.js` | Simulates a paid order (stored in the demo order file) and shows the same confirmation page; the job is also added to the demo cart |
| Confirmation `/print/confirmation` | `components/print/PrintConfirmation.jsx` | Summary, what happens next, WhatsApp button with order number, "go to cart & pay" in live mode |

### B. Staff app `/staff` (password-protected PWA)
| Item | Where |
|---|---|
| Auth: shared password → httpOnly cookie; middleware protects `/staff/*` and `/api/staff/*`; logout | `app/api/staff/login/route.js`, `middleware.js` (Web Crypto HMAC), `components/staff/StaffLogin.jsx` |
| Queue: today first, then older; card = order no., time, name, phone (tap to call / WhatsApp), items with all options, page count, amount + payment status, collect/delivery, **Open file** (fresh signed link) | `components/staff/StaffApp.jsx`, `app/api/staff/orders/route.js`, `app/api/staff/file-link/route.js` |
| Status flow New → Printing → Ready → Done, one tap, optimistic with rollback; stored as order tags `print:new|printing|ready|done` through the Admin API (server-side only) | `app/api/staff/status/route.js`, `lib/print-server.js → setAdminStatus()` |
| Notify customer: WhatsApp with bilingual message incl. order number + total | `StaffApp.jsx → notifyHref()` |
| Filters: status, today/week/all, collect/delivery; search by order no., phone or name | `StaffApp.jsx` |
| Daily totals: orders, pages, revenue | `StaffApp.jsx` |
| PWA: manifest, 192/512 icons, service worker (`/staff-sw.js`, scope `/staff/`), standalone display, EN/AR toggle, 44–60 px targets, high contrast | `app/staff/layout.jsx`, `public/staff/*`, `app/staff/staff.css` |

### C. Privacy & safety
- Signed links expire (`PRINT_LINK_TTL_HOURS`, default 24). Staff links are capped at 4 h.
- Daily cleanup cron (`vercel.json` → `/api/print/cleanup`, 03:00 UTC, Bearer `CRON_SECRET`) deletes files older than `PRINT_FILE_RETENTION_DAYS` (default 7) — Blob and local.
- `/print` states what is uploaded, who can see it and when it is deleted; the same text is in the **Privacy Policy → "Printing service (file uploads)"** section (EN + AR, `content/policies/privacy.js`).
- Upload rejects: unsupported types (magic-byte sniffing, not just the extension), > 50 MB, password-protected PDFs (`/Encrypt` + pdf-lib), unparsable PDFs — with a clear message per file.
- Rate limiting per IP (in-memory, per instance): 30 uploads / 10 min, 10 login attempts / 15 min, 20 demo orders / 10 min.
- Staff password is compared with a constant-time check and never reaches the browser; the demo fallback password is announced on the login page.

### D. Quality
- Playwright: `tests/e2e/print.spec.js` (quote maths across 4 option combinations checked against the config, upload + page count for PDF/image/DOCX, encrypted + corrupt + unsupported rejection, demo order → attributes on cart lines → signed link 200 / tampered 403, 360 px EN + AR with keyboard checks), `tests/e2e/staff.spec.js` (redirect, API 401, wrong password, login, logout, card contents, full status flow with persistence + rollback path, notify link, demo file link, filters/search/empty state, AR toggle, manifest/icons/SW, 360 px targets), `tests/e2e/footer.spec.js`.
- `npm run build` clean (36 routes). Full suite: see the final numbers in the chat summary.

---

## 2. Every environment variable

| Variable | Needed for | Default / behaviour without it |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | Private file storage on Vercel Blob | Files go to `/tmp` (lost on redeploy); page + staff app show a warning |
| `PRINT_SIGNING_SECRET` | HMAC for signed file links **and** the staff session cookie | Falls back to `STAFF_SESSION_SECRET`, then a hard-coded dev secret — **set it in production** |
| `PRINT_LINK_TTL_HOURS` | Signed link lifetime | 24 |
| `PRINT_FILE_RETENTION_DAYS` | Cleanup threshold | 7 |
| `CRON_SECRET` | Authorises `/api/print/cleanup` (Vercel sends it automatically to cron jobs) | Route refuses on Vercel production until set |
| `STAFF_PASSWORD` | Staff login | Demo password `tinyinks` (warning shown) |
| `SHOPIFY_ADMIN_TOKEN` | Staff queue reads real orders + writes status tags (Admin API custom app with `read_orders`, `write_orders`) | Queue shows demo orders from the local store |
| `SHOPIFY_STORE_DOMAIN` | Admin API host | Falls back to `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` |
| `SHOPIFY_ADMIN_API_VERSION` | Admin API version | `2026-01` |
| `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`, `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` | (existing) live cart/checkout | Demo cart |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | (existing) WhatsApp buttons | placeholder number |

All are listed in `.env.example`.

---

## 3. Shopify products to create (exact handles)

Create these as **hidden** products (not in any collection, `Online Store` sales channel enabled so the Storefront API can sell them, tag them `hidden` and exclude from search/theme). Prices must equal `config/print-pricing.js` — the cart total is what Shopify charges.

| Handle | Title | Price (AED, placeholder) |
|---|---|---|
| `print-page-a4-bw-single` | Printing — A4 black & white, single-sided (per page) | 0.50 |
| `print-page-a4-bw-double` | Printing — A4 black & white, double-sided (per page) | 0.45 |
| `print-page-a4-colour-single` | Printing — A4 colour, single-sided (per page) | 2.00 |
| `print-page-a4-colour-double` | Printing — A4 colour, double-sided (per page) | 1.80 |
| `print-page-a3-bw-single` | Printing — A3 black & white, single-sided (per page) | 1.00 |
| `print-page-a3-bw-double` | Printing — A3 black & white, double-sided (per page) | 0.90 |
| `print-page-a3-colour-single` | Printing — A3 colour, single-sided (per page) | 4.00 |
| `print-page-a3-colour-double` | Printing — A3 colour, double-sided (per page) | 3.60 |
| `print-finishing-staple` | Print finishing — stapling (per copy) | 1.00 |
| `print-finishing-spiral` | Print finishing — spiral binding (per copy) | 12.00 |
| `print-finishing-lamination` | Print finishing — lamination (per page) | 3.00 |
| `print-delivery` | Print delivery — Abu Dhabi | 15.00 |
| `print-minimum-topup` | Minimum order top-up | 1.00 (quantity = whole AED of the top-up) |

Also in Shopify admin:
- **Bulk discount** (5% ≥ 200 pages, 10% ≥ 500, 15% ≥ 1000 in the config) cannot be applied from the Storefront cart. Create matching *automatic discounts* ("quantity of print-page-* ≥ 200 → 5% off those products") or set the config tiers to `[]` so the quote never promises a discount checkout won't give.
- **Order tag**: checkout does not add tags automatically. Either add a Shopify Flow "when order created and line item attributes contain 'Print order' → add tag `print-service`", or the staff queue query (`tag:print-service`) can be changed to `line_items_attribute` search in `lib/print-server.js`.
- Shipping: the `print-delivery` product replaces a shipping rate; mark print products as not requiring shipping, or accept a second shipping line at checkout.

---

## 4. How to change prices
Edit **`config/print-pricing.js`** only — per-page rates, double-sided factor, finishing per set/page, delivery fee, "ready in X hours", minimum order, bulk tiers, limits. Then update the matching Shopify product prices. The quote, cart lines, confirmation and tests all read from that file.

## 5. How staff log in
1. Open `https://<site>/staff` on the shop phone → redirected to `/staff/login`.
2. Enter the shared password (`STAFF_PASSWORD`; demo: `tinyinks`). The session cookie lasts 30 days; **Log out** button top-right.
3. Chrome menu → *Add to Home screen* (manifest + service worker are in place) → opens full-screen with the Tiny Inks icon.
4. Language toggle (EN/العربية) in the top bar; RTL is mirrored.

---

## 6. What I could NOT test on this machine (no credentials / not on Vercel)
- **Vercel Blob** upload path (`@vercel/blob/client` → `handleUpload` token flow, `finalize`, `list/del` in cleanup). Written against the documented API (`@vercel/blob@0.27.3`) but only the `/tmp` path was exercised. Note: in Blob mode PDFs are validated in the browser only (the server never sees the bytes); the `/tmp` path validates on both sides.
- **Shopify live cart with attributes** (`cartLinesAdd` with `attributes`), the hidden products lookup (`/api/print/products`) and the checkout hand-off — demo cart only.
- **Shopify Admin API** order listing (`tag:print-service`) and `tagsAdd/tagsRemove` status writes — the demo order store was used instead. The `financialStatus`, phone and address mapping from real orders should be checked against one real order.
- **Vercel cron** trigger of `/api/print/cleanup` (the route itself was exercised locally by the retention logic).
- The **pdf.js thumbnail** loads from cdnjs at runtime — it worked in headless Chromium here; a blocked CDN just hides the preview.
- **50 MB uploads** through Vercel: the Blob client path is designed for it; the `/tmp` fallback on Vercel would hit the 4.5 MB serverless limit, which is one more reason to set the Blob token.
- **Real Android phone install** of the PWA — verified manifest/icons/SW by test and a 360 px headless run only.
- Rate limiting is per serverless instance (in-memory); for strict limits on Vercel use Upstash/KV.

## 7. Files added / changed for this module
New: `config/print-pricing.js`, `lib/print.js`, `lib/print-client.js`, `lib/print-server.js`, `lib/staff-dict.js`, `app/[locale]/print/page.jsx`, `app/[locale]/print/confirmation/page.jsx`, `components/print/PrintOrder.jsx`, `components/print/PrintConfirmation.jsx`, `app/api/print/{upload,file,cleanup,demo-order,products}/route.js`, `app/api/staff/{login,orders,status,file-link}/route.js`, `app/staff/{layout,page}.jsx`, `app/staff/login/page.jsx`, `app/staff/staff.css`, `components/staff/{StaffApp,StaffLogin,RegisterSW}.jsx`, `public/staff/{manifest.webmanifest,icon-192.png,icon-512.png}`, `public/staff-sw.js`, `public/print/sample.pdf`, `vercel.json`, `tests/e2e/{print,staff}.spec.js`.
Changed: `middleware.js` (staff protection), `components/CartContext.jsx` (`addLines`), `lib/shopify.js` (line attributes), `components/CartDrawer.jsx` + `CartPageClient.jsx` (show attributes), `components/Header.jsx` (Print nav), `lib/dictionaries.js` (`print` section, `nav.print`), `content/policies/privacy.js` (Printing section EN/AR), `.env.example`, `README.md`, `package.json` (+ `pdf-lib`, `@vercel/blob`).
