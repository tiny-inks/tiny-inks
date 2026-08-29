import { test, expect } from '@playwright/test';
import { watchErrors, assertClean } from './helpers';

/* phones: the search row is behind the header's search icon */
async function searchInput(page, testInfo) {
  if (testInfo.project.name === 'mobile') {
    await page.locator('.search-toggle').click();
    const input = page.locator('.mk-search-mobile input');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    return input;
  }
  return page.locator('.mk-search-desktop input');
}

test.describe('search', () => {
  test('EN: real word finds products', async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    const input = await searchInput(page, testInfo);
    await input.fill('notebook');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/en\/shop\?q=notebook/);
    const cards = page.locator('.grid .mcard');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
    assertClean(errors);
  });

  test('EN: misspelling shows designed empty state, clear restores', async ({ page }, testInfo) => {
    await page.goto('/en');
    const input = await searchInput(page, testInfo);
    await input.fill('notebok');
    await input.press('Enter');
    await expect(page.locator('.empty')).toBeVisible();
    // clear via the active chip ×
    await page.locator('.active-chips .chip-x').first().click();
    await expect(page.locator('.grid .mcard').first()).toBeVisible();
  });

  test('AR: Arabic word finds products', async ({ page }, testInfo) => {
    await page.goto('/ar');
    const input = await searchInput(page, testInfo);
    await input.fill('دفتر');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/ar\/shop\?q=/);
    const cards = page.locator('.grid .mcard');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('AR: no-results then clear all', async ({ page }, testInfo) => {
    await page.goto('/ar');
    const input = await searchInput(page, testInfo);
    await input.fill('xyzzy123');
    await input.press('Enter');
    await expect(page.locator('.empty')).toBeVisible();
    await page.locator('.empty .btn').click();
    await expect(page.locator('.grid .mcard').first()).toBeVisible();
  });

  test('bottom-bar Search tab opens the search row', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'bottom bar is phone-only');
    await page.goto('/en/about');
    await page.locator('.bottom-nav button.bottom-tab').click();
    await expect(page.locator('.mk-search-mobile input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mk-search-mobile input')).toBeHidden();
  });
});
