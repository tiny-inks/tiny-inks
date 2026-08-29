import { test, expect } from '@playwright/test';
import { LIVE } from './helpers';

test.describe('cart delivery details', () => {
  test('fields persist, Locate me fills the address (permission granted), manual edit wins', async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 24.4539, longitude: 54.3773 });
    // reverse geocoding is an external service — answer it locally
    await page.route('https://nominatim.openstreetmap.org/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ address: { road: 'Corniche Road', suburb: 'Al Khalidiyah', city: 'Abu Dhabi', country: 'United Arab Emirates' } }) })
    );

    await page.goto('/en/product/study-set');
    await page.locator('.buy-row .btn-primary').click();
    await page.keyboard.press('Escape');
    await page.goto('/en/cart');

    const block = page.locator('#delivery-details');
    await expect(block).toBeVisible();
    await block.locator('#dd-name').fill('Noor Test');
    await block.locator('#dd-phone').fill('+971501234567');
    await block.locator('#dd-email').fill('noor@example.com');
    await block.locator('.locate-btn').click();
    await expect(block.locator('#dd-address')).toHaveValue(/Corniche Road.*Abu Dhabi/s);
    await expect(block.locator('#dd-address')).toHaveValue(/maps\.google\.com\/\?q=24\.4539/);
    await expect(block.locator('#dd-geo-note')).toContainText(/filled from your location/i);

    // manual fallback: the customer can overwrite what geolocation wrote
    await block.locator('#dd-address').fill('Flat 12, Building 4, Al Reem Island, Abu Dhabi');

    // persisted on the device
    await page.reload();
    await expect(page.locator('#dd-name')).toHaveValue('Noor Test');
    await expect(page.locator('#dd-phone')).toHaveValue('+971501234567');
    await expect(page.locator('#dd-address')).toHaveValue(/Al Reem Island/);
  });

  test('denied permission shows the manual fallback, not an error page', async ({ page, context }) => {
    await context.clearPermissions();
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (_ok, err) => err({ code: 1, message: 'denied' });
    });
    await page.goto('/en/product/study-set');
    await page.locator('.buy-row .btn-primary').click();
    await page.keyboard.press('Escape');
    await page.goto('/en/cart');
    await page.locator('.locate-btn').click();
    await expect(page.locator('#dd-geo-note')).toContainText(/declined/i);
    await expect(page.locator('#dd-address')).toBeEditable();
  });

  test('AR: the block is translated and validates phone', async ({ page }) => {
    await page.goto('/ar/product/study-set');
    await page.locator('.buy-row .btn-primary').click();
    await page.keyboard.press('Escape');
    await page.goto('/ar/cart');
    await expect(page.locator('#delivery-details h3')).toHaveText('بيانات التوصيل');
    await page.locator('#dd-phone').fill('12');
    await page.locator('#dd-phone').blur();
    await expect(page.locator('#delivery-details .field-err')).toBeVisible();
  });

  test('live checkout attaches the details to the Shopify cart', async ({ page }) => {
    test.skip(!LIVE, 'needs real Shopify credentials');
    await page.goto('/en/product/study-set');
    await page.locator('.buy-row .btn-primary').click();
    await page.goto('/en/cart');
    // incomplete details block the hand-off with a message
    await page.locator('.cart-summary .btn-primary').click();
    await expect(page.locator('.cart-summary .form-err')).toBeVisible();
    await page.locator('#dd-name').fill('Noor Test');
    await page.locator('#dd-phone').fill('+971501234567');
    await page.locator('#dd-address').fill('Al Reem Island, Abu Dhabi');
    const [attrs] = await Promise.all([
      page.waitForRequest((r) => r.postData()?.includes('cartAttributesUpdate')),
      page.locator('.cart-summary .btn-primary').click(),
    ]);
    expect(attrs.postData()).toContain('Delivery address');
    await page.waitForURL(/checkout|myshopify/, { timeout: 20_000 });
  });
});
