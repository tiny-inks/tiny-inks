import { test, expect } from '@playwright/test';

const PASSWORD = process.env.STAFF_PASSWORD || 'tinyinks';

async function login(page) {
  await page.goto('/staff/login');
  await page.locator('#staff-pw').fill(PASSWORD);
  await page.locator('.staff-form button').click();
  await expect(page).toHaveURL(/\/staff$/);
}

test.describe('staff app', () => {
  test('protected: redirect to login, API 401, wrong password, login, logout', async ({ page, request }) => {
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/staff\/login\?next=%2Fstaff/);
    const api = await request.get('/api/staff/orders');
    expect(api.status()).toBe(401);

    await page.locator('#staff-pw').fill('definitely-wrong');
    await page.locator('.staff-form button').click();
    await expect(page.locator('.staff-err')).toBeVisible();
    await expect(page).toHaveURL(/\/staff\/login/);

    await page.locator('#staff-pw').fill(PASSWORD);
    await page.locator('.staff-form button').click();
    await expect(page).toHaveURL(/\/staff$/);
    await expect(page.locator('.staff-totals')).toBeVisible();
    // the password never reaches the client bundle
    const html = await page.content();
    expect(html).not.toContain(PASSWORD.length > 4 ? PASSWORD : 'STAFF_PASSWORD=');

    await page.locator('[data-testid=staff-logout]').click();
    await expect(page).toHaveURL(/\/staff\/login/);
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/staff\/login/);
  });

  test('queue: cards show job details, status flow advances and persists, notify + file links', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    const cards = page.locator('[data-testid=job-card]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(3);

    const card = cards.first();
    await expect(card.locator('.job-no')).toHaveText(/#P\d+/);
    await expect(card.locator('[data-testid=job-chips]')).toContainText(/A4|A3/);
    await expect(card.locator('.job-contact a[href^="tel:"]')).toBeVisible();
    await expect(card.locator('.job-contact a[href^="https://wa.me/"]')).toBeVisible();
    await expect(card.locator('[data-testid=open-file]').first()).toBeVisible();
    const notify = card.locator('[data-testid=notify]');
    const href = decodeURIComponent(await notify.getAttribute('href'));
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(href).toContain('#P');
    expect(href).toMatch(/تايني انكس/);

    // status flow: new → printing → ready → done (one tap each), persists after reload
    const no = (await cards.filter({ has: page.locator('.job-status.s-new') }).first().locator('.job-no').textContent()).trim();
    const fresh = cards.filter({ hasText: no }).first(); // pin the card by order number — its status is about to change
    await fresh.locator('[data-testid=next-status]').click();
    await expect(fresh.locator('.job-status')).toHaveText(/Printing/);
    await page.reload();
    const again = page.locator('[data-testid=job-card]').filter({ hasText: no }).first();
    await expect(again.locator('.job-status')).toHaveText(/Printing/);
    await again.locator('[data-testid=next-status]').click();
    await expect(again.locator('.job-status')).toHaveText(/Ready/);
    await again.locator('[data-testid=next-status]').click();
    await expect(again.locator('.job-status')).toHaveText(/Done/);
    await expect(again.locator('.job-done')).toBeVisible();
    // and back, so the seed order is restored for other tests
    await again.locator('.job-actions .ghost').click();
    await expect(again.locator('.job-status')).toHaveText(/Ready/);
    await again.locator('.job-actions .ghost').click();
    await again.locator('.job-actions .ghost').click();
    await expect(again.locator('.job-status')).toHaveText(/New/);

    // "Open file" asks the server for a fresh link and opens it; the link must serve a PDF
    // (headless Chromium downloads PDFs instead of showing a tab, so verify the link itself)
    const [linkRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/staff/file-link')),
      again.locator('[data-testid=open-file]').first().click(),
    ]);
    const link = await linkRes.json();
    expect(link.ok).toBe(true);
    expect(link.url).toMatch(/sample\.pdf$|\/api\/print\/file\?ref=/);
    const file = await page.request.get(link.url);
    expect(file.ok()).toBe(true);
    expect(file.headers()['content-type']).toContain('pdf');

    // filters + search + empty state
    await page.locator('[data-testid=filter-done]').click();
    await page.locator('[data-testid=filter-all]').click();
    await page.locator('[data-testid=staff-search]').fill('zzzz-no-such-order');
    await expect(page.locator('[data-testid=staff-empty]')).toBeVisible();
    await page.locator('[data-testid=staff-search]').fill('');
    await expect(cards.first()).toBeVisible();

    // arabic toggle mirrors the app
    await page.locator('.staff-top-actions button', { hasText: 'العربية' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.locator('.staff-top-actions button', { hasText: 'English' }).click();
  });

  test('installable PWA: manifest, icons, service worker script', async ({ page, request }) => {
    await login(page);
    await expect(page.locator('link[rel=manifest]')).toHaveAttribute('href', '/staff/manifest.webmanifest');
    const m = await request.get('/staff/manifest.webmanifest');
    expect(m.ok()).toBe(true);
    const j = await m.json();
    expect(j.display).toBe('standalone');
    expect(j.icons.length).toBeGreaterThanOrEqual(2);
    for (const i of j.icons) expect((await request.get(i.src)).ok()).toBe(true);
    const sw = await request.get('/staff-sw.js');
    expect(sw.ok()).toBe(true);
    expect(await sw.text()).toContain('addEventListener(\'fetch\'');
  });

  test('360px phone: big tap targets, no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await login(page);
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(sw).toBeLessThanOrEqual(cw + 1);
    const btns = page.locator('[data-testid=next-status], .staff-chip, .staff-btn');
    for (let i = 0; i < Math.min(await btns.count(), 12); i++) {
      const b = await btns.nth(i).boundingBox();
      if (b) expect(b.height).toBeGreaterThanOrEqual(44);
    }
  });
});
