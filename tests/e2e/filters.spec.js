import { test, expect } from '@playwright/test';

/* On mobile the sidebar is a bottom sheet behind the Filters button. */
async function openFilters(page, testInfo) {
  if (testInfo.project.name === 'mobile') {
    await page.locator('.filters-toggle').click();
    await expect(page.locator('.filters')).toBeVisible();
  }
}
async function closeFilters(page, testInfo) {
  if (testInfo.project.name === 'mobile') {
    await page.locator('.sheet-apply').click();
  }
}

async function cardPrices(page) {
  return page.locator('.grid .mcard-price').evaluateAll((els) =>
    els.map((e) => Number((e.textContent || '').replace(/[^0-9٠-٩]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
  );
}

test.describe('shop filters', () => {
  test('color, price, stock filters combine, chips clear, URL restores', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto('/en/shop');
    await expect(page.locator('.load-more')).toBeVisible(); // first page fully rendered (catalogue > one page)
    const count0 = await page.locator('.grid .mcard').count();
    expect(count0).toBeGreaterThan(5);

    // color swatch
    await openFilters(page, testInfo);
    await page.locator('.swatch-btn').first().click();
    await closeFilters(page, testInfo);
    await expect(page).toHaveURL(/color=/);
    const colorCount = await page.locator('.grid .mcard').count();
    expect(colorCount).toBeLessThan(count0);

    // + price range
    await openFilters(page, testInfo);
    await page.locator('.price-form input').first().fill('50');
    await page.locator('.price-form input').nth(1).fill('100');
    await page.locator('.price-form button[type=submit]').click();
    await closeFilters(page, testInfo);
    await expect(page).toHaveURL(/min=50/);
    await expect(page).toHaveURL(/max=100/);

    // + in stock only
    await openFilters(page, testInfo);
    await page.locator('.avail-toggle input').check();
    await closeFilters(page, testInfo);
    await expect(page).toHaveURL(/avail=1/);

    // chips reflect active filters
    const chips = page.locator('.active-chips .chip-x');
    expect(await chips.count()).toBeGreaterThanOrEqual(3);

    // reload restores every filter from the URL
    const url = page.url();
    await page.reload();
    expect(page.url()).toBe(url);
    expect(await page.locator('.active-chips .chip-x').count()).toBeGreaterThanOrEqual(3);

    // clear all → everything back
    await page.locator('.active-chips .chip:not(.chip-x)').click();
    await expect(page.locator('.grid .mcard')).toHaveCount(Math.min(count0, 12));
    await expect(page).not.toHaveURL(/color=|min=|max=|avail=/);
  });

  test('every sort option orders the grid', async ({ page }) => {
    await page.goto('/en/shop');
    const sortSelect = page.locator('.toolbar-actions select').last();

    await sortSelect.selectOption('low');
    let prices = await cardPrices(page);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    await sortSelect.selectOption('high');
    prices = await cardPrices(page);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));

    await sortSelect.selectOption('new');
    await expect(page).toHaveURL(/sort=new/);

    await sortSelect.selectOption('featured');
    await expect(page).not.toHaveURL(/sort=/);
  });

  test('per-page + load more paginate without losing items', async ({ page }) => {
    await page.goto('/en/shop');
    const total = Number(await page.locator('.result-count strong').first().textContent());
    expect(total).toBeGreaterThan(12);
    await expect(page.locator('.grid .mcard')).toHaveCount(12);
    await page.locator('.load-more .btn').click();
    await expect(page.locator('.grid .mcard')).toHaveCount(total);
    await expect(page.locator('.load-more')).toHaveCount(0);

    // per-page 24 shows everything at once
    await page.goto('/en/shop');
    await page.locator('.perpage-label select').selectOption('24');
    await expect(page.locator('.grid .mcard')).toHaveCount(total);
  });
});
