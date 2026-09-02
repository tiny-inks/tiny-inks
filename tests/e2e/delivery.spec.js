import { test, expect } from '@playwright/test';

/* Address capture lives on checkout step 2 now (contact → address → method → pay).
   "Locate me" uses browser geolocation + OpenStreetMap reverse geocoding with a
   manual fallback; everything persists on the device. */
async function toAddressStep(page) {
  await page.goto('/en/product/study-set');
  await page.locator('.buy-row .btn-primary').click();
  await page.keyboard.press('Escape');
  await page.goto('/en/checkout');
  await page.locator('#co-name').fill('Noor Test');
  await page.locator('#co-phone').fill('+971501234567');
  await page.locator('#co-email').fill('noor@example.com');
  await page.locator('[data-testid=co-next]').click();
  await expect(page.locator('#co-address')).toBeVisible();
}

test.describe('checkout delivery details', () => {
  test('fields persist, Locate me fills the address (permission granted), manual edit wins', async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 24.4539, longitude: 54.3773 });
    await page.route('https://nominatim.openstreetmap.org/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ address: { road: 'Corniche Road', suburb: 'Al Khalidiyah', city: 'Abu Dhabi', country: 'United Arab Emirates' } }) })
    );

    await toAddressStep(page);
    await page.locator('.locate-btn').click();
    await expect(page.locator('#co-address')).toHaveValue(/Corniche Road.*Abu Dhabi/s);
    await expect(page.locator('#co-address')).toHaveValue(/maps\.google\.com\/\?q=24\.4539/);
    await expect(page.locator('.field-note.done')).toContainText(/filled from your location/i);

    // manual fallback: the customer can overwrite what geolocation wrote
    await page.locator('#co-address').fill('Flat 12, Building 4, Al Reem Island, Abu Dhabi');

    // persisted on the device (name/phone/address survive a reload)
    await page.reload();
    await expect(page.locator('#co-name')).toHaveValue('Noor Test');
    await expect(page.locator('#co-phone')).toHaveValue('+971501234567');
    await page.locator('[data-testid=co-next]').click();
    await expect(page.locator('#co-address')).toHaveValue(/Al Reem Island/);
  });

  test('denied permission shows the manual fallback, not an error page', async ({ page, context }) => {
    await context.clearPermissions();
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (_ok, err) => err({ code: 1, message: 'denied' });
    });
    await toAddressStep(page);
    await page.locator('.locate-btn').click();
    await expect(page.locator('.field-note.denied')).toContainText(/declined/i);
    await expect(page.locator('#co-address')).toBeEditable();
  });

  test('AR: the address step is translated and the email is validated', async ({ page }) => {
    await page.goto('/ar/product/study-set');
    await page.locator('.buy-row .btn-primary').click();
    await page.keyboard.press('Escape');
    await page.goto('/ar/checkout');
    await expect(page.locator('h1')).toHaveText('إتمام الطلب');
    await page.locator('#co-email').fill('not-an-email');
    await page.locator('#co-email').blur();
    await expect(page.locator('.field-err')).toContainText('غير صحيح');
    await expect(page.locator('[data-testid=co-next]')).toBeDisabled();
  });
});
