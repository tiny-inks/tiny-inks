import { test, expect } from '@playwright/test';
import { LOCALES } from './helpers';

/* One compact sticky header row on phones: never taller than 64px, never
   clipped at the top, never covering page content — on every page, both
   languages, at 360px. */
const ROUTES = ['', '/shop', '/shop/notebooks', '/about', '/contact', '/cart', '/product/study-set'];

test.describe('header', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone header checks run on the mobile project');

  for (const locale of LOCALES) {
    test(`one compact row, nothing clipped, no overlap [${locale}]`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 360, height: 740 });
      for (const r of ROUTES) {
        await page.goto(`/${locale}${r}`);
        const header = page.locator('.header');
        const row = page.locator('.hdr-row');
        const box = await header.boundingBox();
        expect(box.height, `${locale}${r}: header ${box.height}px tall`).toBeLessThanOrEqual(64);
        expect(box.y, `${locale}${r}: header top ${box.y}`).toBeGreaterThanOrEqual(0);
        expect(box.x, `${locale}${r}: header x ${box.x}`).toBeGreaterThanOrEqual(0);
        expect(box.width, `${locale}${r}: header width`).toBeLessThanOrEqual(360);

        // every control in the row is fully inside the viewport
        for (const sel of ['.menu-toggle', '.brand img', '.search-toggle', 'a.icon-btn', '.cart-btn-mk']) {
          const b = await row.locator(sel).first().boundingBox();
          expect(b, `${locale}${r}: ${sel} missing`).not.toBeNull();
          expect(b.x, `${locale}${r}: ${sel} clipped start`).toBeGreaterThanOrEqual(0);
          expect(b.x + b.width, `${locale}${r}: ${sel} clipped end`).toBeLessThanOrEqual(360.5);
          expect(b.y, `${locale}${r}: ${sel} clipped top`).toBeGreaterThanOrEqual(box.y - 0.5);
        }

        // the first content block starts below the header (no overlap)
        const first = page.locator('main .wrap').first();
        const fb = await first.boundingBox();
        expect(fb.y, `${locale}${r}: content y ${fb.y} vs header bottom ${box.y + box.height}`).toBeGreaterThanOrEqual(box.y + box.height - 0.5);

        // sticky: after scrolling, the header sits at the very top, still one row
        await page.evaluate(() => window.scrollTo(0, 400));
        await page.waitForTimeout(150);
        const stuck = await header.boundingBox();
        expect(Math.round(stuck.y), `${locale}${r}: sticky top`).toBe(0);
        expect(stuck.height).toBeLessThanOrEqual(64);
      }
    });

    test(`phone menu holds exactly Home · Shop · Print · About · Contact + language [${locale}]`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(`/${locale}/shop`);
      await page.locator('.menu-toggle').click();
      const menu = page.locator('.mk-drawer');
      await expect(menu).toBeVisible();
      await expect(menu.locator('> a')).toHaveCount(5);
      await expect(menu.locator('.mk-drawer-foot .locale-btn')).toBeVisible();
      await page.waitForTimeout(400); // let the slide-in transition finish before measuring
      // the menu is anchored under the header and stays inside the viewport
      const mb = await menu.boundingBox();
      const hb = await page.locator('.hdr-row').boundingBox();
      expect(mb.y).toBeGreaterThanOrEqual(hb.y + hb.height - 2); // sub-pixel rounding
      expect(mb.x).toBeGreaterThanOrEqual(0);
      expect(mb.x + mb.width).toBeLessThanOrEqual(360.5);
      await menu.locator('a[href$="/about"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
      await expect(menu).toBeHidden();
    });
  }

  test('no scroll-progress bar or stray element at the viewport edge', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);
      await expect(page.locator('.scroll-progress')).toHaveCount(0);
      // nothing fixed/absolute pokes past the right/left edge or forms a sliver at the top
      const stray = await page.evaluate(() => {
        const bad = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
          if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > innerWidth + 1 && r.left < innerWidth && !el.closest('.shelf, .carousel, .pmq, .marquee')) bad.push(`${el.className} overflows right`);
          if (r.height <= 3 && r.width >= innerWidth * 0.9 && r.top <= 3) bad.push(`${el.className} is a sliver at the top`);
        }
        return bad;
      });
      expect(stray, stray.join(', ')).toEqual([]);
    }
  });
});
