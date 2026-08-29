import { test, expect } from '@playwright/test';
import { LOCALES, watchErrors, assertClean, expectNoHScroll, scrollThrough } from './helpers';

for (const locale of LOCALES) {
  test.describe(`home ${locale}`, () => {
    test(`land, scroll, sections, no errors [${locale}]`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(`/${locale}`);
      await expect(page.locator('.carousel')).toBeVisible();
      await scrollThrough(page);

      // every key section exists
      for (const sel of [
        '.usp-bar', '.promo-tiles', '.pmq', '#best-sellers',
        '.color-strip', '.price-chips', '.gift-tiles', '.bulk-band',
        '.faq-list', '.tiles-cats', '.cards-3', '.ig-strip',
      ]) {
        await expect(page.locator(sel).first(), sel).toBeAttached();
      }
      await expectNoHScroll(page);
      assertClean(errors);
    });

    test(`section CTAs navigate correctly [${locale}]`, async ({ page }) => {
      await page.goto(`/${locale}`);

      // carousel CTA → shop
      const slideCta = page.locator('.carousel-slide').first().locator('a.btn');
      await expect(slideCta).toHaveAttribute('href', new RegExp(`/${locale}/(shop|bundles)`));

      // promo tiles link out
      const tiles = page.locator('.promo-tile');
      await expect(tiles).toHaveCount(2);
      await expect(tiles.nth(0)).toHaveAttribute('href', `/${locale}/shop`);
      await expect(tiles.nth(1)).toHaveAttribute('href', `/${locale}/bundles`);

      // color dot → shop?color=
      const dot = page.locator('.color-dot').first();
      await expect(dot).toHaveAttribute('href', new RegExp(`/${locale}/shop\\?color=`));

      // price chip → min/max params
      const chip = page.locator('.price-chip').first();
      await expect(chip).toHaveAttribute('href', new RegExp('(min|max)='));

      // bulk band → wa.me with prefilled text (never open it)
      const bulk = page.locator('.bulk-band a.btn');
      const bulkHref = await bulk.getAttribute('href');
      expect(bulkHref).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+/);
      expect(decodeURIComponent(bulkHref)).toMatch(/./); // decodes without throwing

      // faq accordion opens on click
      const firstFaq = page.locator('.faq-list .faq-item').first();
      await firstFaq.locator('summary').click();
      await expect(firstFaq).toHaveAttribute('open', '');

      // best sellers view-all navigates
      await page.locator('#best-sellers .section-head a.btn').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/shop$`));
    });

    test(`marquee links to a product and pauses on hover [${locale}]`, async ({ page }, testInfo) => {
      await page.goto(`/${locale}`);
      const item = page.locator('.pmq-item').first();
      await expect(item).toHaveAttribute('href', new RegExp(`/${locale}/product/`));
      if (testInfo.project.name === 'desktop') {
        await page.locator('.pmq').hover();
        const state = await page
          .locator('.pmq-rail')
          .evaluate((el) => getComputedStyle(el).animationPlayState);
        expect(state).toBe('paused');
      }
    });
  });
}
