import { test, expect } from '@playwright/test';
import { LOCALES, scrollThrough } from './helpers';

const ROUTES = ['', '/shop', '/shop/notebooks', '/bundles', '/cart', '/wishlist', '/faq', '/product/study-set'];

test.describe('quality gates', () => {
  test.skip(({ isMobile }) => !isMobile, 'quality gates run on the mobile project');

  for (const locale of LOCALES) {
    test(`no horizontal scroll at 360 & 390 on any route [${locale}]`, async ({ page }) => {
      test.setTimeout(180_000);
      for (const width of [360, 390]) {
        await page.setViewportSize({ width, height: 800 });
        for (const r of ROUTES) {
          await page.goto(`/${locale}${r}`);
          await scrollThrough(page);
          const { sw, cw } = await page.evaluate(() => ({
            sw: document.documentElement.scrollWidth,
            cw: document.documentElement.clientWidth,
          }));
          expect(sw, `${locale}${r} @${width}px: ${sw} > ${cw}`).toBeLessThanOrEqual(cw + 1);
        }
      }
    });

    test(`tap targets ≥44px in header, bottom nav, cards [${locale}]`, async ({ page }) => {
      await page.goto(`/${locale}/shop`);
      const targets = page.locator(
        '.menu-toggle, .icon-btn, .bottom-tab, .quick-add-btn, .wish-btn, .filters-toggle'
      );
      const n = await targets.count();
      expect(n).toBeGreaterThan(5);
      for (let i = 0; i < n; i++) {
        const el = targets.nth(i);
        if (!(await el.isVisible())) continue;
        const box = await el.boundingBox();
        if (!box) continue;
        const label = await el.evaluate((e) => e.className.toString().split(' ')[0]);
        expect(Math.min(box.width, box.height), `${label} is ${box.width}x${box.height}`).toBeGreaterThanOrEqual(44);
      }
    });

    test(`images carry alt text; no clipped Arabic labels [${locale}]`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await scrollThrough(page);
      const missingAlt = await page.evaluate(() =>
        [...document.querySelectorAll('img')]
          .filter((i) => !i.closest('[aria-hidden="true"]') && i.getAttribute('alt') === null)
          .map((i) => i.src.slice(-40))
      );
      expect(missingAlt, `imgs without alt: ${missingAlt.join(', ')}`).toEqual([]);

      // no text node overflows its container horizontally (clipping proxy)
      const clipped = await page.evaluate(() => {
        const bad = [];
        document.querySelectorAll('h1,h2,h3,.btn,.chip,.price-chip,.bottom-tab').forEach((el) => {
          if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') {
            bad.push(`${el.tagName}.${el.className.toString().split(' ')[0]}`);
          }
        });
        return bad;
      });
      expect(clipped, `clipped: ${clipped.join(', ')}`).toEqual([]);
    });

    test(`layout shift on image load stays tiny [${locale}]`, async ({ page }) => {
      await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });
      const cls = await page.evaluate(
        () =>
          new Promise((resolve) => {
            let total = 0;
            new PerformanceObserver((list) => {
              for (const e of list.getEntries()) if (!e.hadRecentInput) total += e.value;
            }).observe({ type: 'layout-shift', buffered: true });
            setTimeout(() => resolve(total), 3500);
          })
      );
      expect(cls, `CLS ${cls}`).toBeLessThan(0.1);
    });
  }
});
