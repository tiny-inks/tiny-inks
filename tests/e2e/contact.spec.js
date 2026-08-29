import { test, expect } from '@playwright/test';
import { LOCALES } from './helpers';

for (const locale of LOCALES) {
  test(`contact page: socials, address, hours, WhatsApp CTA, honest form [${locale}]`, async ({ page }) => {
    await page.goto(`/${locale}/contact`);

    // only Instagram / TikTok / WhatsApp icons — WhatsApp is always present
    const socials = page.locator('.socials .social-btn');
    expect(await socials.count()).toBeGreaterThanOrEqual(1);
    expect(await socials.count()).toBeLessThanOrEqual(3);
    for (let i = 0; i < await socials.count(); i++) {
      const href = await socials.nth(i).getAttribute('href');
      expect(href).toMatch(/instagram\.com|tiktok\.com|wa\.me/);
    }
    await expect(page.locator('a.btn-primary[href^="https://wa.me/"]').first()).toBeVisible();
    await expect(page.locator('.contact-facts')).toContainText(/Abu Dhabi|أبوظبي/);
    await expect(page.locator('.contact-facts a[href*="maps.google"]')).toHaveAttribute('href', /maps\.google\.com/);

    // the form submits to the real route and never fakes success:
    // with no delivery configured it must show the fallback (WhatsApp/email with the text)
    await page.locator('#cf-name').fill('Test Person');
    await page.locator('#cf-email').fill('test@example.com');
    await page.locator('#cf-msg').fill('Hello from the e2e suite');
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/contact')),
      page.locator('.contact-form button[type=submit], .contact-form .btn-primary').first().click(),
    ]);
    if (res.ok()) {
      await expect(page.locator('.form-ok')).toBeVisible();
    } else {
      expect([502, 503]).toContain(res.status());
      await expect(page.locator('.form-ok')).toHaveCount(0);
      const err = page.locator('.form-err');
      await expect(err).toBeVisible();
      const wa = err.locator('a[href^="https://wa.me/"]');
      await expect(wa).toBeVisible();
      expect(decodeURIComponent(await wa.getAttribute('href'))).toContain('Hello from the e2e suite');
      await expect(err.locator('a[href^="mailto:"]')).toBeVisible();
    }
  });
}

test('contact API validates input and never claims delivery it did not do', async ({ request }) => {
  const bad = await request.post('/api/contact', { data: { type: 'contact', name: 'x', email: 'nope', message: 'hi' } });
  expect(bad.status()).toBe(400);
  const r = await request.post('/api/contact', { data: { type: 'contact', name: 'Test', email: 'test@example.com', message: 'hello' } });
  const j = await r.json();
  if (r.ok()) expect(j.delivered).toMatch(/resend|formspree/);
  else { expect([502, 503]).toContain(r.status()); expect(j.ok).toBe(false); }
});
