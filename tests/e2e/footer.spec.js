import { test, expect } from '@playwright/test';
import { LOCALES } from './helpers';

test.describe('footer', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone footer layout');

  for (const locale of LOCALES) {
    test(`2-column grid, full-width strips, under two screens tall, mirrored in RTL [${locale}]`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(`/${locale}/about`);
      const footer = page.locator('.footer');
      await footer.scrollIntoViewIfNeeded();
      const fb = await footer.boundingBox();
      expect(fb.height, `footer is ${fb.height}px tall`).toBeLessThanOrEqual(740 * 2);

      // link columns sit side by side (2 per row)
      const cols = page.locator('.footer-col');
      await expect(cols).toHaveCount(4);
      const b0 = await cols.nth(0).boundingBox();
      const b1 = await cols.nth(1).boundingBox();
      const b2 = await cols.nth(2).boundingBox();
      expect(Math.abs(b0.y - b1.y)).toBeLessThan(2);
      expect(b2.y).toBeGreaterThan(b0.y + 40);
      // RTL: the first column starts on the right
      if (locale === 'ar') expect(b0.x).toBeGreaterThan(b1.x); else expect(b0.x).toBeLessThan(b1.x);

      // contact strip and payment row span the full width
      for (const sel of ['.footer-contact', '.footer-pay']) {
        const b = await page.locator(sel).boundingBox();
        expect(b.width).toBeGreaterThan(300);
      }
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      expect(sw).toBeLessThanOrEqual(cw + 1);
    });
  }
});
