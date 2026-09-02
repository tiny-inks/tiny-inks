/* TEMP script — 360px EN+AR screenshots of every page for the Citron rebuild
   self-review. Run with the dev/prod server on :3000, then delete. */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = process.env.SHOT_DIR || 'C:/Users/nhatt/AppData/Local/Temp/claude/c--Users-nhatt-OneDrive-Desktop-website-in-rabdan-tinyinks-ae/7b3bc0f6-9950-422e-b93a-a9b56c50f6cf/scratchpad/shots';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['home', ''],
  ['shop', '/shop'],
  ['collection', '/shop/notebooks'],
  ['product', '/product/everyday-notebook-dusty-blue'],
  ['bundles', '/bundles'],
  ['print', '/print'],
  ['about', '/about'],
  ['contact', '/contact'],
  ['cart', '/cart'],
  ['checkout', '/checkout'],
  ['faq', '/faq'],
  ['wishlist', '/wishlist'],
];

const browser = await chromium.launch();
for (const locale of ['en', 'ar']) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [name, path] of PAGES) {
    try {
      await page.goto(`http://localhost:3000/${locale}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/${name}-${locale}.png`, fullPage: true });
      console.log('shot', name, locale);
    } catch (e) {
      console.log('FAIL', name, locale, e.message.split('\n')[0]);
    }
  }
  // extra: open mobile drawer on home (menu accordions)
  try {
    await page.goto(`http://localhost:3000/${locale}`, { waitUntil: 'networkidle' });
    await page.locator('.mk-burger, [aria-controls="site-menu"]').first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/drawer-${locale}.png` });
    console.log('shot drawer', locale);
  } catch (e) { console.log('FAIL drawer', locale, e.message.split('\n')[0]); }
  await ctx.close();
}
// desktop mega menu, EN only
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dpage = await dctx.newPage();
try {
  await dpage.goto('http://localhost:3000/en', { waitUntil: 'networkidle' });
  await dpage.locator('.mega-toggle').click();
  await dpage.waitForTimeout(400);
  await dpage.screenshot({ path: `${OUT}/mega-desktop.png` });
  await dpage.keyboard.press('Escape');
  await dpage.screenshot({ path: `${OUT}/home-desktop.png`, fullPage: true });
  console.log('shot mega + desktop home');
} catch (e) { console.log('FAIL mega', e.message.split('\n')[0]); }
await dctx.close();
await browser.close();
console.log('DONE →', OUT);
