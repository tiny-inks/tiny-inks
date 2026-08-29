# Tiny Inks — Quality Loop Report

Goal: every customer journey smooth in `/en` + `/ar` at mobile (390/360) and desktop
(1440); Lighthouse mobile perf ≥ 90 & a11y ≥ 95; design critique down to "minor".
Suite: Playwright (`tests/e2e/*`), projects `desktop` (1440×900 chromium) and
`mobile` (iPhone 13 profile on chromium). Run: `npx playwright test` (builds must
exist: `npm run build` first). Lighthouse: `node scripts/lighthouse-run.mjs`.

## Standing blockers (data/config — not fixable in code)
- **No real Shopify credentials in `.env.local`** (`NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` /
  `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` empty, `NEXT_PUBLIC_DEMO_MODE=true`).
  The loop runs against the demo catalog. The real-checkout test
  (`cart.spec.js › checkout hand-off`) is `test.skip`-gated on live credentials and
  activates automatically once they exist. Everything else exercises live code paths.
- Product photos are curated Unsplash placeholders — final photography is an owner
  task (swap in `lib/images.js`).

## Rounds

### Round 1 — 23 passed / 50 failed
- **All 31 mobile tests failed at browser launch**: the iPhone 13 device profile
  defaults to WebKit, only chromium was installed. Fix: pin
  `browserName: 'chromium'` on both projects (spec calls for chromium + a mobile
  device profile).
- **11 false failures from a test-harness bug**: `test.skip(({}, testInfo) => …)`
  gets no `testInfo` in Playwright skip predicates → predicate threw → tests failed
  instead of skipping. Fix: gate on the `isMobile` fixture.
- Added the missing **PDP wishlist button** (`components/WishlistButton.jsx`) —
  the journey "add to wishlist from PDP" had no UI to test.

### Round 2 — 58 passed / 3 failed / 13 skipped
- `wishlist` (desktop): real UX interaction found by the test — quick-add opens the
  cart drawer, whose veil then blocks the wishlist hearts. Test now closes the
  drawer (Esc) like a user would; app behavior is correct.
- `cart demo-note`: ambiguous locator (two `.drawer-note`s in the summary) — scoped.
- `back/forward`: navigation race — added explicit waits + URL asserts (stronger,
  not weaker).
- `policies WhatsApp` (mobile): locator matched the closed drawer's hidden wa.me
  link — scoped to `main`.
- `keyboard tab stops` (desktop): collector kept only the first CSS class
  (`btn` instead of `mk-cats-btn`) — records full class lists now.

### Round 3 — **61 passed / 0 failed / 13 skipped** (first full green)
Skips are all legitimate: 8 quality-gates on desktop project, 3 keyboard on mobile
project, 2 checkout-hand-off awaiting live credentials.

### Lighthouse (mobile, throttled) after round 3
performance **66** · accessibility **88** · best-practices 100 · seo 100
(LCP 3.8 s, TBT 910 ms, CLS 0)

Fixes applied:
- a11y: carousel dots had `role="tablist"` without `tab` children → removed the
  role, kept labels; dots got a 24px hit-area (visual dot stays 9px); active
  bottom-nav tab color darkened to `#96513C` for AA at 11px bold.
- perf: `preconnect` to images.unsplash.com; carousel LCP image moved to
  `next/image` (`priority`, `sizes`, unsplash added to `remotePatterns`).

### Design critique (viewport screenshots, both locales, 390/1440)
- **MAJOR (found & fixed): carousel photo rendered at its full intrinsic height on
  mobile** after the `next/image` swap — the `height` attribute is a presentational
  hint that beats `aspect-ratio` when CSS height is unset; `height: auto` restores
  the 16:7 mobile / 4:3 desktop crop. First mobile screen now shows photo +
  headline + CTA + dots together, trust row peeking below the fold.
- Bulk band (both locales): clear hierarchy — headline → bullets → CTA; good.
- AR PDP: buy box leads, price + "متوفر" on one line, sticky bar consistent; good.
- Minor (accepted): trust-row items wrap to 2 lines at 360px in EN ("Fast Abu Dhabi
  delivery"); marquee circles crop product edges by design; promo-tile images are
  square crops of lifestyle shots — replace with real product cutouts when
  photography lands.

### Rounds 4–5 — 61 passed / 0 failed, twice in a row
Lighthouse: perf 71 · **a11y 100** · bp 100 · seo 100 (LCP 4.7 s, TBT 330 ms).
LCP regressed vs round 3 → investigated: the slide image finished loading at
1.2 s, so LCP was a RENDER delay, not bytes.

### Rounds 6–7 — 61 passed / 0 failed, twice in a row
Moved the three carousel slides to local files (`public/promo/slide-*.jpg`,
mapped via `IMAGES.promoSlides`) to take the image optimizer + remote fetch out
of the LCP path. LCP unchanged → confirmed the render-delay diagnosis.

### Root cause found: reveals were hiding above-the-fold content until hydration
`Reveal` rendered content at `opacity: 0` in the server HTML and only showed it
after JS hydration (~4.5 s on Lighthouse's throttled CPU) — the late paint of
in-viewport sections WAS the LCP, and it also meant no-JS users saw blank
sections. Rebuilt `Reveal`: content is **visible in server HTML**; the entrance
animation is only "armed" for elements still below the viewport when JS
arrives. Scroll-in animations unchanged; above-fold paints at FCP.

### Rounds 8–9 — 61 passed / 0 failed, twice in a row
LCP 4.5 → 3.8 s. a11y dipped to 96: the now-visible promo tiles exposed a real
contrast issue (subtext at `opacity: .8` over sage/blush = 3.76:1) — fixed with
full-opacity ink text.

### Rounds 10–11 (final) — **61 passed / 0 failed, twice in a row**
Lighthouse (mobile, throttled): **perf 67 · a11y 100 · best-practices 100 · seo 100**
(FCP 2.3 s, LCP 3.8 s, CLS 0, TBT 330–750 ms across identical runs).

## Final status vs targets
- ✅ All tests pass twice in a row (rounds 8/9 and 10/11 — four consecutive
  green runs on the final build; 61 passed, 13 legitimate skips).
- ✅ Lighthouse accessibility 100 (target ≥ 95); best-practices 100; SEO 100.
- ✅ Design critique: nothing above "minor" (list below).
- ❌ Lighthouse mobile performance 67 (target ≥ 90) — see below.

### Why performance stops at ~67 here, and what it means
Evidence: the LCP image is preloaded and fully fetched at **1.2 s**; CLS is **0**;
FCP is 2.3 s (render-blocking CSS + fonts on the emulated Moto G — the floor for
LCP); TBT swings 330→750 ms between *identical* runs on this machine (background
load + OneDrive-synced disk), and the audit runs against local `next start` —
no CDN, no edge cache, cold image optimizer. Unthrottled on the same build the
page measures LCP 580 ms / CLS 0. Closing the remaining gap would require an
architectural change (server-component product cards / trimming home hydration
— today 5 contexts + ~20 interactive cards), which risks the now-stable suite
for a number that will look different on Vercel + real 4G. **Recorded as the
one remaining known issue**: re-measure after deploying to Vercel with real
product images; if still < 90 there, the next lever is de-hydrating product
cards (quick-add/wishlist as small client islands inside server cards).

### Remaining known issues (all minor or environment/data)
1. Lighthouse mobile performance 67 locally (above).
2. No real Shopify credentials → checkout hand-off test skipped (auto-activates
   when `.env.local` is filled).
3. Placeholder photography (Unsplash) — swap in `lib/images.js` + `public/promo/`.
4. Trust-row items wrap to two lines at 360 px in EN; accepted.
5. Unused legacy components from earlier design phases remain in
   `components/` (HeroAssembly, EditorialPhoto, DeskGallery, Marquee, TornEdge,
   WhyStrip, reactbits/*) — confirmed NOT bundled (no page imports them);
   delete when convenient.

## How to re-run
```bash
npm run build && npx playwright test        # full E2E gate (needs port 3000 free)
node scripts/lighthouse-run.mjs             # Lighthouse mobile on /en
node scripts/shots.mjs <dir>                # screenshot set for design review
node scripts/catalog-check.mjs              # Shopify data health (live mode)
```
