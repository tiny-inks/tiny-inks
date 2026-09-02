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

  test('checkout buttons lead to the on-site checkout (cart page + drawer)', async ({ page }) => {
    await page.goto('/en/product/daily-ritual-planner');
    await page.locator('.buy-row .btn-primary').click();
    // drawer checkout → /checkout
    await page.locator('.drawer [data-testid=go-checkout]').click();
    await expect(page).toHaveURL(/\/en\/checkout$/);
    await expect(page.locator('.stepper.four')).toBeVisible();
    // cart page checkout → /checkout
    await page.goto('/en/cart');
    await page.locator('.cart-summary [data-testid=go-checkout]').click();
    await expect(page).toHaveURL(/\/en\/checkout$/);
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
