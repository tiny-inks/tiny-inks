import { chromium } from 'playwright';
const OUT = 'C:/Users/nhatt/AppData/Local/Temp/claude/c--Users-nhatt-OneDrive-Desktop-website-in-rabdan-tinyinks-ae/7b3bc0f6-9950-422e-b93a-a9b56c50f6cf/scratchpad';
const browser = await chromium.launch();
const shots = async (width, height, name, actions) => {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' });
  const page = await ctx.newPage();
  await page.goto('https://citron.ae', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('[aria-label*="lose"], .modal__close, [class*="popup"] [class*="close"]').first().click({ timeout: 2000 }).catch(() => {});
  await page.screenshot({ path: `${OUT}/citron-${name}-top.png` });
  for (let i = 1; i <= 5; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * height * 1.6);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/citron-${name}-s${i}.png` });
  }
  if (actions) await actions(page);
  await ctx.close();
};
await shots(1440, 900, 'desktop', async (page) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  const shop = page.locator('nav a, header a').filter({ hasText: /^Shop$/i }).first();
  await shop.hover({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/citron-desktop-megamenu.png` });
});
await shots(360, 780, 'mobile', async (page) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('header button, [aria-label*="enu"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/citron-mobile-menu.png` });
});
await browser.close();
console.log('citron shots done');
