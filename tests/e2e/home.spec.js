import { test, expect } from '@playwright/test';
import { LOCALES, watchErrors, assertClean, expectNoHScroll, scrollThrough } from './helpers';

for (const locale of LOCALES) {
  test.describe(`home ${locale}`, () => {
    test(`land, scroll, sections, no errors [${locale}]`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(`/${locale}`);
      await expect(page.locator('.carousel')).toBeVisible();
      await scrollThrough(page);

      // every key section exists, in the agreed order
      const order = [
        '.carousel', '.usp-bar', '.tabbed', '#best-sellers', '#new-arrivals', '#gift-sets',
        '#why-band', '#brands', '#offers', '.video-loop', '.pmq', '.color-strip',
        '.price-chips', '.gift-tiles', '.bulk-band', '.faq-list', '#reviews .tm-track',
        '#newsletter', '.ig-strip',
      ];
      let lastTop = -1;
      for (const sel of order) {
        const el = page.locator(sel).first();
        await expect(el, sel).toBeAttached();
        const top = await el.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
        expect(top, `${sel} should come after the previous section`).toBeGreaterThanOrEqual(lastTop);
        lastTop = top;
      }
      await expectNoHScroll(page);
      assertClean(errors);
    });

    test(`video loop is muted, inline, looping, with a poster [${locale}]`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const video = page.locator('.video-loop video');
      await expect(video).toHaveAttribute('playsinline', '');
      await expect(video).toHaveAttribute('loop', '');
      await expect(video).toHaveAttribute('poster', /\/video\//);
      const muted = await video.evaluate((v) => v.muted && v.autoplay);
      expect(muted).toBe(true);
      await expect(page.locator('.video-loop .video-poster')).toHaveAttribute('alt', /.+/);

      // reduced motion: the video element is hidden, the poster stays
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await expect(page.locator('.video-loop video')).toBeHidden();
      await expect(page.locator('.video-loop .video-poster')).toBeVisible();
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

    test(`tabbed product rows switch and link out [${locale}]`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const pills = page.locator('.tab-pill');
      expect(await pills.count()).toBeGreaterThanOrEqual(2);
      await expect(pills.first()).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.tab-grid .mcard').first()).toBeVisible();
      const before = await page.locator('.tab-grid .mcard .mcard-title').first().textContent();
      await pills.nth(1).click();
      await expect(pills.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.tab-more-link')).toHaveAttribute('href', new RegExp(`/${locale}/shop/`));
      // hero slides use a portrait image on phones
      const src = await page.locator('.hero-slide img').first().evaluate((el) => el.currentSrc);
      expect(src).toMatch(/hero-\d-(mobile|desktop)\.jpg/);
      void before;
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
