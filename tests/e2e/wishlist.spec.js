import { test, expect } from '@playwright/test';

test.describe('wishlist', () => {
  test('add from card + PDP, view, add-to-cart from wishlist, remove', async ({ page }) => {
    test.setTimeout(120_000);
    // add from a shop card
    await page.goto('/en/shop');
    await page.locator('.grid .mcard .wish-btn').first().click();
    await expect(page.locator('.grid .mcard .wish-btn').first()).toHaveAttribute('aria-pressed', 'true');

    // add from the PDP buy box
    await page.goto('/en/product/study-set');
    const pdpWish = page.locator('.pdp-wish');
    await pdpWish.click();
    await expect(pdpWish).toHaveAttribute('aria-pressed', 'true');

    // header heart shows the count and links to /wishlist
    const headerWish = page.locator('a.icon-btn[href="/en/wishlist"]');
    await expect(headerWish.locator('.cart-count')).toHaveText('2');
    await page.goto('/en/wishlist');
    await expect(page.locator('.grid .mcard')).toHaveCount(2);

    // "move to cart": quick-add works from the wishlist card
    await page.locator('.grid .mcard .quick-add-btn').first().click();
    await expect(page.locator('.cart-btn-mk .cart-count')).toHaveText('1');
    // adding opens the cart drawer — close it so its veil doesn't block clicks
    await page.keyboard.press('Escape');
    await expect(page.locator('.drawer')).not.toBeInViewport();

    // remove both via the hearts; empty state appears
    await page.locator('.grid .mcard .wish-btn').first().click();
    await expect(page.locator('.grid .mcard')).toHaveCount(1);
    await page.locator('.grid .mcard .wish-btn').first().click();
    await expect(page.locator('.empty')).toBeVisible();
  });
});
