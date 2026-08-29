import { test, expect } from '@playwright/test';
import { LIVE, watchErrors, assertClean } from './helpers';

test.describe('product → cart journey', () => {
  test('PDP qty, add, drawer, cart page, remove, empty, re-add', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await page.goto('/en/product/daily-ritual-planner');

    // buy box: qty up then add 2
    const buyBox = page.locator('.pdp-buy');
    await buyBox.locator('.qty button').nth(1).click();
    await expect(buyBox.locator('.qty span')).toHaveText('2');
    await buyBox.locator('.buy-row .btn-primary').click();

    // drawer opens with the line and correct qty
    const drawer = page.locator('.drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.line-item')).toHaveCount(1);
    await expect(drawer.locator('.line-item .qty span')).toHaveText('2');

    // badge shows 2
    await expect(page.locator('.cart-btn-mk .cart-count')).toHaveText('2');

    // Esc closes the drawer
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeInViewport();

    // full cart page
    await page.goto('/en/cart');
    const row = page.locator('.cart-row');
    await expect(row).toHaveCount(1);
    await row.locator('.qty button').nth(1).click(); // 3
    await expect(row.locator('.qty span')).toHaveText('3');
    await row.locator('.line-remove').click();
    await expect(page.locator('.cart-row')).toHaveCount(0);
    await expect(page.locator('.empty')).toBeVisible();

    // re-add from a card quick-add on shop
    await page.goto('/en/shop');
    await page.locator('.grid .mcard .quick-add-btn').first().click();
    await expect(page.locator('.cart-btn-mk .cart-count')).toHaveText('1');
    assertClean(errors);
  });

  test('checkout hand-off', async ({ page }) => {
    test.skip(
      !LIVE,
      'Requires real Shopify credentials in .env.local — recorded as a config blocker in quality-report.md'
    );
    await page.goto('/en/product/daily-ritual-planner');
    await page.locator('.buy-row .btn-primary').click();
    await page.goto('/en/cart');
    await page.locator('.cart-summary .btn-primary').click();
    // reach Shopify checkout, never pay
    await page.waitForURL(/checkout|myshopify/, { timeout: 20_000 });
  });

  test('demo checkout is clearly disabled with a note', async ({ page }) => {
    test.skip(LIVE, 'live mode has a real checkout instead');
    await page.goto('/en/product/daily-ritual-planner');
    await page.locator('.buy-row .btn-primary').click();
    await page.keyboard.press('Escape');
    await page.goto('/en/cart');
    await expect(page.locator('.cart-summary .btn-primary')).toBeDisabled();
    // two notes exist (shipping + demo); the demo note is the last one
    await expect(page.locator('.cart-summary .drawer-note').last()).toBeVisible();
  });

  test('cart survives reload and back/forward', async ({ page }) => {
    await page.goto('/en/product/study-set');
    await page.locator('.buy-row .btn-primary').click();
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('.cart-btn-mk .cart-count')).toHaveText('1');
    await page.goto('/en/shop');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/product\/study-set/);
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/shop/);
    await expect(page.locator('.cart-btn-mk .cart-count')).toHaveText('1');
  });
});
