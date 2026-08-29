import { expect } from '@playwright/test';

export const LOCALES = ['en', 'ar'];

export const LIVE =
  process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' &&
  Boolean(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) &&
  Boolean(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN);

/* attach console/network watchers; call assertClean(errors) at test end */
export function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    // 3rd-party image CDNs can rate-limit; only same-origin failures are ours
    if (res.status() >= 400 && res.url().startsWith('http://localhost:3000')) {
      errors.push(`http ${res.status()}: ${res.url()}`);
    }
  });
  return errors;
}

export function assertClean(errors) {
  expect(errors, errors.join('\n')).toEqual([]);
}

export async function expectNoHScroll(page) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(sw, `scrollWidth ${sw} > clientWidth ${cw}`).toBeLessThanOrEqual(cw + 1);
}

export async function scrollThrough(page) {
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y <= h; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
}

export async function acceptCookiesNoop() {}

/* dismiss Next.js dev overlay etc. — noop in prod */
export async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
}
