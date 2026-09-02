import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import PRICING from '../../config/print-pricing.js';
import { LIVE, expectNoHScroll } from './helpers';

const SAMPLE = path.resolve('public/print/sample.pdf'); // 3 pages
const r2 = (n) => Math.round(n * 100) / 100;
/* reference implementation of the quote, straight from the config (mirrors lib/print.js) */
function expected({ pages, copies = 1, size = 'A4', color = 'bw', sided = 'single', finishing = 'none', fulfilment = 'collect', files = 1 }) {
  const totalPages = pages * copies;
  const rate = r2(PRICING.perPage[size][color] * (sided === 'double' ? PRICING.doubleSidedFactor : 1));
  const pagesCost = r2(totalPages * rate);
  const tier = [...PRICING.bulkTiers].sort((a, b) => b.minPages - a.minPages).find((t) => totalPages >= t.minPages);
  const discount = tier ? r2(pagesCost * tier.percent / 100) : 0;
  const fin = PRICING.finishing[finishing];
  const finishingCost = r2(fin.perSet * files * copies + fin.perPage * totalPages);
  const delivery = fulfilment === 'delivery' ? PRICING.delivery.fee : 0;
  const subtotal = r2(pagesCost - discount + finishingCost);
  const topup = subtotal > 0 && subtotal < PRICING.minimumOrder ? Math.ceil(r2(PRICING.minimumOrder - subtotal)) : 0;
  return { total: r2(subtotal + topup + delivery), pagesCost, discount, finishingCost, topup, delivery };
}
const num = (s) => Number(String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, ''));

async function uploadSample(page, file = SAMPLE) {
  await page.setInputFiles('[data-testid=print-file-input]', file);
}
async function total(page) { return num(await page.locator('[data-testid=quote-total]').textContent()); }
const next = (page) => page.locator('[data-testid=step-next]').click();

test.describe('print service — customer', () => {
  test('quote maths: several option combinations match the config', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/en/print');
    await uploadSample(page);
    await expect(page.locator('[data-testid=page-count]')).toHaveText('3');
    await expect(page.locator('.file-row.ready')).toHaveCount(1);

    // A4 · b/w · single · 1 copy → below minimum → top-up
    let e = expected({ pages: 3 });
    expect(await total(page)).toBeCloseTo(e.total, 2);
    expect(num(await page.locator('[data-testid=line-pages]').textContent())).toBeCloseTo(e.pagesCost, 2);
    if (e.topup) expect(num(await page.locator('[data-testid=line-minimum]').textContent())).toBeCloseTo(e.topup, 2);

    // step 2 — colour + double-sided + staple + 2 copies
    await next(page);
    await page.locator('[data-testid=opt-colour]').click();
    await page.locator('[data-testid=opt-double]').click();
    await page.locator('[data-testid=opt-staple]').click();
    await page.locator('[data-testid=copies]').fill('2');
    e = expected({ pages: 3, copies: 2, color: 'colour', sided: 'double', finishing: 'staple' });
    expect(await total(page)).toBeCloseTo(e.total, 2);
    expect(num(await page.locator('[data-testid=line-finishing]').textContent())).toBeCloseTo(e.finishingCost, 2);

    // step 3 — + delivery
    await next(page);
    await page.locator('[data-testid=fulfil-delivery]').click();
    e = expected({ pages: 3, copies: 2, color: 'colour', sided: 'double', finishing: 'staple', fulfilment: 'delivery' });
    expect(await total(page)).toBeCloseTo(e.total, 2);
    expect(num(await page.locator('[data-testid=line-delivery]').textContent())).toBeCloseTo(PRICING.delivery.fee, 2);

    // back to step 2 — A3 · colour · lamination · 100 copies → bulk tier kicks in
    await page.locator('[data-testid=fulfil-collect]').click();
    await page.locator('[data-testid=step-back]').click();
    await page.locator('[data-testid=opt-A3]').click();
    await page.locator('[data-testid=opt-single]').click();
    await page.locator('[data-testid=opt-lamination]').click();
    await page.locator('[data-testid=copies]').fill('100');
    e = expected({ pages: 3, copies: 100, size: 'A3', color: 'colour', finishing: 'lamination' });
    expect(await total(page)).toBeCloseTo(e.total, 2);
    if (e.discount) expect(num(await page.locator('[data-testid=line-discount]').textContent())).toBeCloseTo(e.discount, 2);
    // every line is itemised, not just a total
    expect(await page.locator('[data-testid=quote] .quote-line').count()).toBeGreaterThanOrEqual(3);
  });

  test('upload: PDF pages counted, images default to 1 page, DOCX asks, bad PDFs rejected', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/en/print');
    await uploadSample(page);
    await expect(page.locator('[data-testid=page-count]')).toHaveText('3');
    await expect(page.locator('.file-row.ready .page-pill')).toBeVisible(); // terracotta page-count pill

    // images: 1 page by default, still editable (we cannot count pages in non-PDFs)
    await uploadSample(page, path.resolve('public/staff/icon-192.png'));
    await expect(page.locator('.file-row').nth(1).locator('.file-pages input')).toHaveValue('1');
    await expect(page.locator('.file-row').nth(1).locator('.file-thumb img')).toBeVisible();

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-print-'));
    const docx = path.join(tmp, 'notes.docx');
    fs.writeFileSync(docx, Buffer.from('504b0304140000000800', 'hex')); // zip header = docx magic
    await uploadSample(page, docx);
    const docRow = page.locator('.file-row').nth(2);
    await expect(docRow.locator('.file-pages input')).toBeVisible();
    await expect(page.locator('[data-testid=step-next]')).toBeDisabled(); // pages unknown → cannot continue
    await docRow.locator('.file-pages input').fill('4');

    const encrypted = path.join(tmp, 'secret.pdf');
    fs.writeFileSync(encrypted, '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R /Encrypt 2 0 R >>\n%%EOF');
    await uploadSample(page, encrypted);
    await expect(page.locator('.file-row.error .file-status.err').last()).toContainText(/password/i);

    const corrupt = path.join(tmp, 'broken.pdf');
    fs.writeFileSync(corrupt, '%PDF-1.7\nthis is not really a pdf');
    await uploadSample(page, corrupt);
    await expect(page.locator('.file-row.error').last().locator('.file-status.err')).toContainText(/could not read/i);

    const txt = path.join(tmp, 'notes.txt');
    fs.writeFileSync(txt, 'hello');
    await uploadSample(page, txt);
    await expect(page.locator('.file-row.error').last().locator('.file-status.err')).toContainText(/not supported/i);

    // remove works
    const before = await page.locator('.file-row').count();
    await page.locator('.file-remove').last().click();
    await expect(page.locator('.file-row')).toHaveCount(before - 1);
  });

  test('print job rides the cart into the on-site checkout with its attributes', async ({ page }) => {
    test.skip(LIVE, 'demo-mode variant ids; live uses the hidden Shopify products');
    test.setTimeout(120_000);
    await page.goto('/en/print');
    await uploadSample(page);
    await expect(page.locator('[data-testid=page-count]')).toHaveText('3');
    await next(page);
    await page.locator('[data-testid=opt-colour]').click();
    await page.locator('[data-testid=opt-spiral]').click();
    await page.locator('#print-note').fill('clear cover please');
    await next(page);
    await page.locator('[data-testid=print-submit]').click();
    await expect(page).toHaveURL(/\/en\/checkout$/);
    // the server-priced summary shows the print lines
    await expect(page.locator('[data-testid=co-quote]')).toContainText(/print-page-a4-colour-single/);

    // the job is in the cart with its attributes
    const items = await page.evaluate(() => JSON.parse(localStorage.getItem('ti_demo_cart') || '[]'));
    const pageLine = items.find((i) => i.variantId?.startsWith('demo-print-page-'));
    expect(pageLine, 'per-page line').toBeTruthy();
    expect(pageLine.qty).toBe(3);
    const keys = pageLine.attributes.map((a) => a.key);
    for (const k of ['Files', 'File URL', 'Pages', 'Paper size', 'Colour', 'Sides', 'Copies', 'Finishing', 'Fulfilment', 'Customer note']) expect(keys, k).toContain(k);
    expect(pageLine.attributes.find((a) => a.key === 'File URL').value).toMatch(/\/api\/print\/file\?ref=.+&exp=\d+&sig=/);
    expect(items.some((i) => i.variantId === 'demo-print-finishing-spiral')).toBe(true);
    await page.goto('/en/cart');
    await expect(page.locator('.cart-row .line-attrs').first()).toContainText('Files:');

    // the signed link serves the file, a tampered one does not
    const url = pageLine.attributes.find((a) => a.key === 'File URL').value;
    const ok = await page.request.get(url);
    expect(ok.status()).toBe(200);
    expect(ok.headers()['content-type']).toContain('application/pdf');
    const bad = await page.request.get(url.replace(/sig=.{6}/, 'sig=XXXXXX'));
    expect(bad.status()).toBe(403);
  });

  for (const locale of ['en', 'ar']) {
    test(`360px: no horizontal scroll, keyboard reachable, privacy stated [${locale}]`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(`/${locale}/print`);
      await expect(page.locator('.dropzone')).toBeVisible();
      await expect(page.locator('.print-privacy')).toContainText(/24|٢٤/);
      await expect(page.locator('.print-privacy')).toContainText(/7|٧/);
      await expectNoHScroll(page);
      await uploadSample(page);
      await expect(page.locator('[data-testid=page-count]')).toHaveText('3');
      await expectNoHScroll(page);
      await expect(page.locator('.stepper-item.active')).toHaveCount(1);
      await next(page);
      // option controls are real buttons: reachable + operable from the keyboard
      await page.locator('[data-testid=opt-colour]').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid=opt-colour]')).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('.print-bar')).toBeVisible();
      await expect(page.locator('[data-testid=sticky-total]')).toBeVisible();
      // the breakdown opens from the sticky bar on phones
      await page.locator('.bar-total').click();
      await expect(page.locator('#quote-panel')).toBeVisible();
    });
  }
});
