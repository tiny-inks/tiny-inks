import { test, expect } from '@playwright/test';

test.describe('keyboard-only', () => {
  test.skip(({ isMobile }) => !!isMobile, 'keyboard pass runs on desktop');

  test('tab reaches skip link, nav, search, cart; focus is visible', async ({ page }) => {
    await page.goto('/en');
    await page.keyboard.press('Tab'); // skip link first
    const first = await page.evaluate(() => document.activeElement?.className || '');
    expect(first).toContain('skip-link');

    // keep tabbing; collect the interactive stops in the header
    const seen = new Set();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        return { cls: el.className?.toString() || el.tagName, tag: el.tagName };
      });
      seen.add(`${info.tag}:${info.cls}`);
    }
    const all = [...seen].join(',');
    for (const cls of ['brand', 'hdr-link', 'icon-btn', 'locale-btn']) {
      expect(all, `expected tab stop ${cls}`).toContain(cls);
    }
    // search input reachable
    expect(all).toContain('INPUT');

    // focus ring visible on a focused nav link
    await page.locator('.hdr-link').first().focus();
    const ring = await page.evaluate(() => {
      const cs = getComputedStyle(document.activeElement);
      return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
    });
    expect(ring, 'focused control must show a visible outline').toBeTruthy();
  });

  test('header nav is exactly Home · Shop · Print · About · Contact', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('.hdr-nav .hdr-link')).toHaveText(['Home', 'Shop', 'Print', 'About', 'Contact']);
    await page.goto('/ar');
    await expect(page.locator('.hdr-nav .hdr-link')).toHaveCount(5);
  });

  test('Escape closes cart drawer and the phone menu', async ({ page }) => {
    await page.goto('/en/product/study-set');
    await page.locator('.buy-row .btn-primary').click();
    await expect(page.locator('.drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.drawer')).not.toBeInViewport();

    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/en');
    await page.locator('.menu-toggle').click();
    const menu = page.locator('.mk-drawer');
    await expect(menu).toBeVisible();
    await expect(menu.locator('a[href="/en/about"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  test('Escape closes the mobile filter sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/en/shop');
    await page.locator('.filters-toggle').click();
    await expect(page.locator('.filters')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.filters')).not.toBeInViewport();
  });
});
