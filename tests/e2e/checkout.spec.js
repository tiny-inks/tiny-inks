import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';

const STRIPE_UI = Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_e2e';

/* demo catalogue facts (lib/mock-data.js): planner AED 95 in stock, sticky-note-trio sold out */
const PLANNER = { variantId: 'mock-variant-3', priceFils: 9500 };
const SOLD_OUT = { variantId: 'mock-variant-6' };
const DELIVERY_FILS = 1500; // config/checkout.js fee
const FREE_OVER_FILS = 15000;

async function seedCart(page, items) {
  await page.goto('/en');
  /* wait until the cart provider has hydrated AND saved once — otherwise its
     post-hydration save overwrites what we are about to seed */
  await page.waitForFunction(() => localStorage.getItem('ti_demo_cart') !== null);
  await page.evaluate((list) => {
    localStorage.setItem('ti_demo_cart', JSON.stringify(list.map((i, n) => ({
      variantId: i.variantId, lineId: `${i.variantId}-${n}`, title: i.title || i.variantId, handle: i.handle || 'x',
      price: i.price || 0, image: null, qty: i.qty || 1, attributes: i.attributes || [],
    }))));
  }, items);
}
async function fillContact(page, { name = 'Noor Tester', email = 'noor@example.com', phone = '+971501234567' } = {}) {
  await page.locator('#co-name').fill(name);
  await page.locator('#co-phone').fill(phone);
  await page.locator('#co-email').fill(email);
}
const signedEvent = (payloadObj, secret = WEBHOOK_SECRET) => {
  const body = JSON.stringify(payloadObj);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return { body, header: `t=${t},v1=${v1}` };
};
/* mirror of lib/checkout-server chunkPayload */
const chunk = (payload) => {
  const json = JSON.stringify(payload);
  const md = {};
  for (let i = 0; i * 450 < json.length; i++) md[`o${i}`] = json.slice(i * 450, (i + 1) * 450);
  md.oCount = String(Math.ceil(json.length / 450));
  return md;
};

test.describe('on-site checkout', () => {
  test('server-side pricing: client prices and totals are ignored (tamper attempt)', async ({ request }) => {
    // the request lies about prices in every field it can think of
    const r = await request.post('/api/checkout/quote', {
      data: {
        items: [{ variantId: PLANNER.variantId, qty: 2, price: 0.01, totalFils: 1, unitFils: 1 }],
        method: 'delivery',
        total: 0.01, totalFils: 1, amount: 1,
      },
    });
    expect(r.ok()).toBe(true);
    const q = await r.json();
    expect(q.subtotalFils).toBe(2 * PLANNER.priceFils); // catalogue price, not the client's
    expect(q.deliveryFils).toBe(0); // 190 AED ≥ free-over threshold
    expect(q.totalFils).toBe(2 * PLANNER.priceFils);

    // under the threshold the flat fee applies
    const r2 = await request.post('/api/checkout/quote', { data: { items: [{ variantId: PLANNER.variantId, qty: 1 }], method: 'delivery' } });
    const q2 = await r2.json();
    expect(q2.subtotalFils).toBe(PLANNER.priceFils);
    expect(q2.deliveryFils).toBe(DELIVERY_FILS);
    expect(q2.totalFils).toBe(PLANNER.priceFils + DELIVERY_FILS);
    expect(q2.freeOverFils).toBe(FREE_OVER_FILS);

    // collect = no delivery fee
    const r3 = await request.post('/api/checkout/quote', { data: { items: [{ variantId: PLANNER.variantId, qty: 1 }], method: 'collect' } });
    expect((await r3.json()).deliveryFils).toBe(0);
  });

  test('out-of-stock and unknown items are rejected before payment', async ({ request }) => {
    const r = await request.post('/api/checkout/quote', { data: { items: [{ variantId: SOLD_OUT.variantId, qty: 1 }], method: 'delivery' } });
    expect(r.status()).toBe(409);
    const j = await r.json();
    expect(j.issues[0].issue).toBe('unavailable');

    const r2 = await request.post('/api/checkout/quote', { data: { items: [{ variantId: 'mock-variant-does-not-exist', qty: 1 }], method: 'delivery' } });
    expect(r2.status()).toBe(409);
    expect((await r2.json()).issues[0].issue).toBe('not_found');
  });

  for (const locale of ['en', 'ar']) {
    test(`COD journey at 360px [${locale}]: 4 steps, Locate me, order created once`, async ({ page, context }) => {
      test.setTimeout(150_000);
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 24.4539, longitude: 54.3773 });
      await page.route('https://nominatim.openstreetmap.org/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ address: { road: 'Corniche Road', city: 'Abu Dhabi', country: 'UAE' } }) })
      );
      await page.setViewportSize({ width: 360, height: 740 });
      await seedCart(page, [{ variantId: PLANNER.variantId, qty: 1, title: 'Daily Ritual Planner', price: 95 }]);
      await page.goto(`/${locale}/checkout`);

      // no horizontal scroll, stepper visible, summary bar shows the server total
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      expect(sw).toBeLessThanOrEqual(cw + 1);
      await expect(page.locator('.stepper.four')).toBeVisible();
      await expect(page.locator('[data-testid=co-sticky-total]')).toContainText(/110|١١٠/); // 95 + 15 delivery

      // 1 contact
      await fillContact(page);
      await page.locator('[data-testid=co-next]').click();
      // 2 address via Locate me (manual edit still possible)
      await page.locator('.locate-btn').click();
      await expect(page.locator('#co-address')).toHaveValue(/Corniche Road/);
      await expect(page.locator('#co-address')).toHaveValue(/maps\.google\.com/);
      await page.locator('#co-address').fill('Flat 5, Reem Island, Abu Dhabi');
      await page.locator('[data-testid=co-next]').click();
      // 3 delivery method
      await expect(page.locator('[data-testid=method-delivery]')).toHaveAttribute('aria-checked', 'true');
      await page.locator('[data-testid=co-next]').click();
      // 4 payment — COD (card is hidden without Stripe keys, preselected COD then)
      await page.locator('[data-testid=pay-cod]').click();
      await page.locator('[data-testid=co-place-cod]').click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/order/confirmed`));
      await expect(page.locator('[data-testid=order-confirmed]')).toBeVisible();
      await expect(page.locator('[data-testid=order-name]')).toHaveText(/#P\d+/);
      // cart wiped after the order
      const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('ti_demo_cart') || '[]'));
      expect(cart).toEqual([]);
    });
  }

  test('COD is idempotent per session key and lands in the staff order book (tag cod path)', async ({ page, request }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 360, height: 740 });
    await seedCart(page, [{ variantId: PLANNER.variantId, qty: 2, title: 'Daily Ritual Planner', price: 95 }]);
    await page.goto('/en/checkout');
    await fillContact(page, { name: 'Cod Tester' });
    await page.locator('[data-testid=co-next]').click();
    await page.locator('#co-address').fill('Somewhere in Abu Dhabi');
    await page.locator('[data-testid=co-next]').click();
    await page.locator('[data-testid=co-next]').click();
    await page.locator('[data-testid=pay-cod]').click();
    /* the session key is minted when the order is placed — read it afterwards */
    const keyPromise = page.waitForFunction(() => sessionStorage.getItem('ti_cod_key'));
    await page.locator('[data-testid=co-place-cod]').click();
    await expect(page.locator('[data-testid=order-name]')).toHaveText(/#P\d+/);
    const orderName = (await page.locator('[data-testid=order-name]').textContent()).trim();
    const key = await (await keyPromise).jsonValue();

    // same key again (double-submit / retry) → the same order, no duplicate
    const again = await request.post('/api/checkout/cod', {
      data: {
        key, items: [{ variantId: PLANNER.variantId, qty: 2 }], method: 'delivery',
        contact: { name: 'Cod Tester', email: 'noor@example.com', phone: '+971501234567' },
        address: { line: 'Somewhere in Abu Dhabi' }, locale: 'en',
      },
    });
    const j = await again.json();
    expect(j.ok).toBe(true);
    expect(j.duplicate).toBe(true);
    expect(j.orderName).toBe(orderName);

    // the staff order book shows it as a pending web order with the server total (2×95 = 190, free delivery)
    const login = await request.post('/api/staff/login', { data: { password: process.env.STAFF_PASSWORD || 'tinyinks' } });
    expect(login.ok()).toBe(true);
    const orders = await (await request.get('/api/staff/orders')).json();
    const mine = orders.orders.find((o) => o.name === orderName);
    expect(mine, orderName).toBeTruthy();
    expect(mine.financialStatus).toBe('PENDING');
    expect(mine.total).toBeCloseTo(190, 2);
  });

  test('webhook: bad signature rejected; same payment_intent never creates two orders', async ({ request }) => {
    const payload = {
      items: [{ variantId: PLANNER.variantId, qty: 1 }],
      contact: { name: 'Hook Tester', email: 'hook@example.com', phone: '+971501234567' },
      address: { line: 'Reem Island, Abu Dhabi' }, method: 'delivery', note: '', locale: 'en',
    };
    const piId = `pi_e2e_${Date.now().toString(36)}`;
    const event = {
      id: `evt_${piId}`, type: 'payment_intent.succeeded',
      data: { object: { id: piId, object: 'payment_intent', amount: PLANNER.priceFils + DELIVERY_FILS, currency: 'aed', metadata: { site: 'tinyinks.ae', locale: 'en', ...chunk(payload) } } },
    };

    // wrong signature → 400, no order
    const bad = signedEvent(event, 'whsec_wrong');
    const rBad = await request.post('/api/stripe/webhook', { data: bad.body, headers: { 'stripe-signature': bad.header, 'content-type': 'application/json' } });
    expect(rBad.status()).toBe(400);

    // valid signature → order created
    const good = signedEvent(event);
    const r1 = await request.post('/api/stripe/webhook', { data: good.body, headers: { 'stripe-signature': good.header, 'content-type': 'application/json' } });
    expect(r1.ok()).toBe(true);
    const j1 = await r1.json();
    expect(j1.orderName).toMatch(/#P\d+/);
    expect(j1.duplicate).toBeFalsy();

    // the exact same event delivered again (Stripe retry) → same order, duplicate flag
    const good2 = signedEvent(event);
    const r2 = await request.post('/api/stripe/webhook', { data: good2.body, headers: { 'stripe-signature': good2.header, 'content-type': 'application/json' } });
    expect(r2.ok()).toBe(true);
    const j2 = await r2.json();
    expect(j2.duplicate).toBe(true);
    expect(j2.orderName).toBe(j1.orderName);

    // other event types are acknowledged and ignored
    const other = signedEvent({ id: 'evt_x', type: 'charge.refunded', data: { object: {} } });
    const r3 = await request.post('/api/stripe/webhook', { data: other.body, headers: { 'stripe-signature': other.header, 'content-type': 'application/json' } });
    expect((await r3.json()).ignored).toBe('charge.refunded');

    // the confirmation poller finds the order by payment intent
    const poll = await (await request.get(`/api/checkout/order?pi=${piId}`)).json();
    expect(poll.found).toBe(true);
    expect(poll.orderName).toBe(j1.orderName);
  });

  test('confirmation page: failed redirect shows a clear retry path', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await seedCart(page, [{ variantId: PLANNER.variantId, qty: 1, title: 'Planner', price: 95 }]);
    await page.goto('/en/order/confirmed?payment_intent=pi_x&redirect_status=failed');
    await expect(page.locator('h1')).toContainText(/did not go through/i);
    await expect(page.locator(`.print-confirm a[href='/en/checkout']`)).toBeVisible(); // the retry CTA (the drawer link also targets /checkout)
    await page.goto('/ar/order/confirmed?payment_intent=pi_x&redirect_status=failed');
    await expect(page.locator('h1')).toContainText('لم تتم');
  });

  test.describe('Stripe card journeys (need test keys)', () => {
    test.skip(!STRIPE_UI, 'Set STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test mode) to run the card flows — see checkout-report.md');

    for (const [label, card, outcome] of [
      ['success', '4242424242424242', 'confirmed'],
      ['declined', '4000000000000002', 'error'],
      ['3DS required', '4000002760003184', '3ds'],
    ]) {
      test(`card ${label}`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width: 360, height: 740 });
        await seedCart(page, [{ variantId: PLANNER.variantId, qty: 1, title: 'Planner', price: 95 }]);
        await page.goto('/en/checkout');
        await fillContact(page);
        await page.locator('[data-testid=co-next]').click();
        await page.locator('#co-address').fill('Reem Island, Abu Dhabi');
        await page.locator('[data-testid=co-next]').click();
        await page.locator('[data-testid=co-next]').click();
        const frame = page.frameLocator('#payment-element iframe').first();
        await frame.locator('[name="number"]').fill(card);
        await frame.locator('[name="expiry"]').fill('12/34');
        await frame.locator('[name="cvc"]').fill('123');
        await page.locator('[data-testid=co-pay-now]').click();
        if (outcome === 'error') {
          await expect(page.locator('[data-testid=pay-error]')).toBeVisible();
        } else {
          if (outcome === '3ds') {
            const threeDs = page.frameLocator('iframe[name*="stripe-challenge"], iframe[src*="3ds"]').first();
            await threeDs.locator('button:has-text("Complete")').click({ timeout: 30_000 });
          }
          await page.waitForURL(/order\/confirmed/, { timeout: 60_000 });
          await expect(page.locator('[data-testid=order-confirmed]')).toBeVisible({ timeout: 45_000 });
        }
      });
    }
  });
});
