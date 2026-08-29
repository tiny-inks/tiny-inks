import { test, expect } from '@playwright/test';
import { watchErrors, assertClean } from './helpers';

function searchInput(page, testInfo) {
  return testInfo.project.name === 'mobile'
    ? page.locator('.mk-search-mobile input')
    : page.locator('.mk-search-desktop input');
}

test.describe('search', () => {
  test('EN: real word finds products', async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await page.goto('/en');
    const input = searchInput(page, testInfo);
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
    const input = searchInput(page, testInfo);
    await input.fill('notebok');
    await input.press('Enter');
    await expect(page.locator('.empty')).toBeVisible();
    // clear via the active chip ×
    await page.locator('.active-chips .chip-x').first().click();
    await expect(page.locator('.grid .mcard').first()).toBeVisible();
  });

  test('AR: Arabic word finds products', async ({ page }, testInfo) => {
    await page.goto('/ar');
    const input = searchInput(page, testInfo);
    await input.fill('دفتر');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/ar\/shop\?q=/);
    const cards = page.locator('.grid .mcard');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('AR: no-results then clear all', async ({ page }, testInfo) => {
    await page.goto('/ar');
    const input = searchInput(page, testInfo);
    await input.fill('xyzzy123');
    await input.press('Enter');
    await expect(page.locator('.empty')).toBeVisible();
    await page.locator('.empty .btn').click();
    await expect(page.locator('.grid .mcard').first()).toBeVisible();
  });
});
