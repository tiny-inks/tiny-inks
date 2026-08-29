import { test, expect } from '@playwright/test';
import { LOCALES, watchErrors, assertClean } from './helpers';

const SLUGS = ['privacy', 'terms', 'shipping', 'returns'];

for (const locale of LOCALES) {
  test(`policy pages + FAQ render fully [${locale}]`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    for (const slug of SLUGS) {
      await page.goto(`/${locale}/policies/${slug}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.locator('.policy-h').count()).toBeGreaterThan(2);
    }
    await page.goto(`/${locale}/faq`);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.locator('.faq-item').count()).toBeGreaterThanOrEqual(5);
    // accordion opens
    const item = page.locator('.faq-item').first();
    await item.locator('summary').click();
    await expect(item.locator('p')).toBeVisible();
    assertClean(errors);
  });

  test(`WhatsApp CTAs carry wa.me links with prefilled text [${locale}]`, async ({ page }) => {
    // contact page: primary WhatsApp button
    await page.goto(`/${locale}/contact`);
    // scope to main content — the (closed) mobile drawer also holds a wa.me link
    const wa = page.locator('main a[href^="https://wa.me/"]').first();
    await expect(wa).toBeVisible();
    expect(await wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\d+/);

    // footer suggest-a-product + bulk: prefilled text params
    await page.goto(`/${locale}`);
    const suggest = page.locator('.footer-contact a.btn');
    const suggestHref = await suggest.getAttribute('href');
    expect(suggestHref).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(suggestHref.split('text=')[1]).length).toBeGreaterThan(10);

    const bulk = page.locator('.bulk-band a.btn');
    const bulkHref = await bulk.getAttribute('href');
    expect(bulkHref).toContain('wa.me');
    expect(decodeURIComponent(bulkHref.split('text=')[1]).length).toBeGreaterThan(10);
  });
}
