/* Tap-count audit: home → shop → category → product → add to cart → checkout.
   Usage: node scripts/journey.mjs <en|ar>  (server on :3000, 360px phone) */
import { chromium } from '@playwright/test';
const [locale = 'en'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
let taps = 0;
const tap = async (sel, label) => { await page.locator(sel).first().click(); taps++; console.log(`${taps}. ${label}`); await page.waitForTimeout(700); };
await page.goto(`http://localhost:3000/${locale}`, { waitUntil: 'networkidle' });
await tap('.bottom-tab[href$="/shop"]', 'Shop (bottom bar)');
await page.waitForURL(/\/shop$/);
await tap('.colgrid a.coltile[href$="/shop/notebooks"]', 'Notebooks (category tile on /shop)');
await page.waitForURL(/\/shop\/notebooks/);
await tap('.grid .mcard .mcard-title', 'Open first notebook');
await page.waitForURL(/\/product\//);
await tap('.buy-row .btn-primary', 'Add to cart');
await page.locator('.drawer .btn-primary').first().click({ force: true }); taps++; console.log(`${taps}. Checkout (drawer)`);
console.log(`TOTAL TAPS (${locale}): ${taps}`);
await browser.close();
