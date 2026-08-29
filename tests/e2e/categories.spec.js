import { test, expect } from '@playwright/test';
import { LOCALES } from './helpers';

for (const locale of LOCALES) {
  test(`all-categories menu reaches every collection with matching counts [${locale}]`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto(`/${locale}/shop`);

    // collection list from the sidebar (canonical source of handles + counts)
    const links = page.locator('.cat-list a.cat-link:not(:first-child)');
    const n = await links.count();
    expect(n).toBeGreaterThanOrEqual(5);

    const cols = [];
    for (let i = 0; i < n; i++) {
      const href = await links.nth(i).getAttribute('href');
      const count = Number((await links.nth(i).locator('span').textContent()) || '0');
      cols.push({ href, count });
    }

    for (const c of cols) {
      await page.goto(c.href);
      // count line matches the sidebar count
      const line = page.locator('.result-count strong').first();
      await expect(line).toHaveText(String(c.count));
      // grid shows exactly that many cards (demo catalog < one page)
      await expect(page.locator('.grid .mcard')).toHaveCount(Math.min(c.count, 12));
    }
  });

  test(`header All-Categories control opens and lists collections [${locale}]`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}`);
    if (testInfo.project.name === 'desktop') {
      await page.locator('.mk-shop-caret').click();
      const dd = page.locator('.mk-shop-dd');
      await expect(dd).toBeVisible();
      expect(await dd.locator('a').count()).toBeGreaterThanOrEqual(7);
      await page.keyboard.press('Escape');
      await page.mouse.move(5, 400);
      await expect(dd).toBeHidden();
    } else {
      await page.locator('.menu-toggle').click();
      const drawer = page.locator('.mk-drawer');
      await expect(drawer).toBeVisible();
      expect(await drawer.locator('a').count()).toBeGreaterThanOrEqual(9);
      await page.keyboard.press('Escape');
      await expect(drawer).not.toBeInViewport();
    }
  });
}
