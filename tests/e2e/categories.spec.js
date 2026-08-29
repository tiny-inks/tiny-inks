import { test, expect } from '@playwright/test';
import { LOCALES } from './helpers';

for (const locale of LOCALES) {
  test(`sidebar reaches every collection with matching counts [${locale}]`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/${locale}/shop`);

    // collection list from the sidebar (canonical source of handles + counts)
    const links = page.locator('.cat-list a.cat-link:not(:first-child)');
    await expect(links.first()).toBeAttached(); // the sidebar is client-rendered under Suspense
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

  test(`shop page category grid lists every collection with a count and reaches it [${locale}]`, async ({ page }) => {
    await page.goto(`/${locale}/shop`);
    const grid = page.locator('.colgrid');
    await expect(grid).toBeVisible();
    const tiles = grid.locator('a.coltile');
    const n = await tiles.count();
    expect(n).toBeGreaterThanOrEqual(5);

    // the grid sits above the product grid, and matches the sidebar's collections
    const gridTop = (await grid.boundingBox()).y;
    const productsTop = (await page.locator('.grid').first().boundingBox()).y;
    expect(gridTop).toBeLessThan(productsTop);
    const sidebarCount = await page.locator('.cat-list a.cat-link:not(:first-child)').count();
    expect(n).toBe(sidebarCount);

    for (let i = 0; i < n; i++) {
      await expect(tiles.nth(i).locator('.coltile-name')).not.toBeEmpty();
      await expect(tiles.nth(i).locator('.coltile-count')).toContainText(/\d/);
      await expect(tiles.nth(i).locator('.coltile-media img, .coltile-solid')).toHaveCount(1);
    }

    // tapping a tile lands on the collection page with that chip highlighted
    const href = await tiles.first().getAttribute('href');
    const name = (await tiles.first().locator('.coltile-name').textContent()).trim();
    await tiles.first().click();
    await expect(page).toHaveURL(new RegExp(href.replace(/[/.]/g, '\\$&') + '$'));
    await expect(page.locator('h1')).toHaveText(name);
    await expect(page.locator('.col-chips a.on')).toHaveText(name);
  });

  test(`categories are no longer on the home page, only on /shop [${locale}]`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator('.tiles-cats, .colgrid')).toHaveCount(0);
  });
}
