/* Capture key pages in both locales at mobile 390 and desktop 1440 for the
   design critique. Usage: node scripts/shots.mjs <outDir>  (server on :3000) */
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'shots';
mkdirSync(out, { recursive: true });

const ROUTES = [
  ['home', ''],
  ['shop', '/shop'],
  ['collection', '/shop/notebooks'],
  ['pdp', '/product/study-set'],
  ['bundles', '/bundles'],
  ['cart', '/cart'],
];

const browser = await chromium.launch();
for (const [device, opts] of [
  ['mobile', devices['iPhone 13']],
  ['desktop', { viewport: { width: 1440, height: 900 } }],
]) {
  for (const locale of ['en', 'ar']) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    for (const [name, route] of ROUTES) {
      await page.goto(`http://localhost:3000/${locale}${route}`, { waitUntil: 'networkidle' });
      // trigger reveals so the full page is visible
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y <= h; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 400));
      });
      await page.screenshot({ path: `${out}/${name}-${locale}-${device}.png`, fullPage: true });
    }
    await ctx.close();
  }
}
await browser.close();
console.log('shots written to', out);
