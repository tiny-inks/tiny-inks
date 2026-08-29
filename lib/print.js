/* Print service — pure helpers shared by the customer page, the cart and the
   tests. No Node APIs here (this file ships to the browser). */
import PRINT_PRICING from '@/config/print-pricing';

export const PRINT = PRINT_PRICING;
export const SIZES = ['A4', 'A3'];
export const COLORS = ['bw', 'colour'];
export const SIDES = ['single', 'double'];
export const FINISHING = ['none', 'staple', 'spiral', 'lamination'];
export const FULFILMENT = ['collect', 'delivery'];

const r2 = (n) => Math.round(n * 100) / 100;

export function fmtMoney(amount, locale = 'en', currency = PRINT.currency) {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function pageProductHandle({ size, color, sided }) {
  return `print-page-${size.toLowerCase()}-${color}-${sided}`;
}

/* The live quote. job = { files: [{ pages }], size, color, sided, copies, finishing, fulfilment }
   Returns line-by-line breakdown + totals; every number is rounded to fils. */
export function computeQuote(job, cfg = PRINT) {
  const files = (job.files || []).filter((f) => Number(f.pages) > 0);
  const pages = files.reduce((s, f) => s + Number(f.pages), 0);
  const copies = Math.max(1, Math.min(cfg.limits.maxCopies, Number(job.copies) || 1));
  const totalPages = pages * copies;
  const size = SIZES.includes(job.size) ? job.size : 'A4';
  const color = COLORS.includes(job.color) ? job.color : 'bw';
  const sided = SIDES.includes(job.sided) ? job.sided : 'single';
  const finishing = FINISHING.includes(job.finishing) ? job.finishing : 'none';
  const fulfilment = FULFILMENT.includes(job.fulfilment) ? job.fulfilment : 'collect';

  const baseRate = cfg.perPage[size][color];
  const rate = r2(baseRate * (sided === 'double' ? cfg.doubleSidedFactor : 1));
  const pagesCost = r2(totalPages * rate);

  const tier = [...cfg.bulkTiers].sort((a, b) => b.minPages - a.minPages).find((t) => totalPages >= t.minPages) || null;
  const discount = tier ? r2(pagesCost * (tier.percent / 100)) : 0;

  const fin = cfg.finishing[finishing];
  const sets = files.length * copies;
  const finishingCost = r2(fin.perSet * sets + fin.perPage * totalPages);

  const delivery = fulfilment === 'delivery' ? r2(cfg.delivery.fee) : 0;

  const subtotal = r2(pagesCost - discount + finishingCost);
  /* minimum order: topped up in whole AED so it maps to the AED 1.00 top-up product */
  const topup = subtotal > 0 && subtotal < cfg.minimumOrder ? Math.ceil(r2(cfg.minimumOrder - subtotal)) : 0;
  const total = r2(subtotal + topup + delivery);

  const lines = [];
  lines.push({ key: 'pages', qty: totalPages, unit: rate, amount: pagesCost, meta: { pages, copies, size, color, sided } });
  if (discount > 0) lines.push({ key: 'discount', percent: tier.percent, amount: -discount });
  if (finishingCost > 0) lines.push({ key: 'finishing', finishing, qty: fin.perPage ? totalPages : sets, unit: fin.perPage || fin.perSet, amount: finishingCost });
  if (topup > 0) lines.push({ key: 'minimum', amount: topup, minimum: cfg.minimumOrder });
  if (delivery > 0) lines.push({ key: 'delivery', amount: delivery });

  return { pages, copies, totalPages, size, color, sided, finishing, fulfilment, rate, pagesCost, discount, tier, finishingCost, topup, delivery, subtotal, total, lines, sets, empty: totalPages === 0 };
}

/* Cart lines for the quote: hidden per-page product (qty = total pages),
   finishing products, delivery, minimum top-up. `resolve(handle)` returns
   { variantId, price, title } for a handle (Shopify in live mode, a demo stub
   otherwise). attributes go on every line so staff see the job on the order. */
export function buildCartLines(quote, job, resolve, attributes) {
  const lines = [];
  const page = resolve(pageProductHandle(quote));
  if (page && quote.totalPages > 0) lines.push({ ...page, qty: quote.totalPages, attributes });
  if (quote.finishing !== 'none' && quote.finishingCost > 0) {
    const fin = resolve(`print-finishing-${quote.finishing}`);
    const finQty = PRINT.finishing[quote.finishing].perPage ? quote.totalPages : quote.sets;
    if (fin) lines.push({ ...fin, qty: finQty, attributes: attributes.slice(0, 2) });
  }
  if (quote.delivery > 0) {
    const d = resolve('print-delivery');
    if (d) lines.push({ ...d, qty: 1, attributes: attributes.slice(0, 2) });
  }
  if (quote.topup > 0) {
    const t = resolve('print-minimum-topup');
    if (t) lines.push({ ...t, qty: quote.topup, attributes: attributes.slice(0, 2) });
  }
  return lines;
}

/* Line-item attributes (what the staff app and Shopify admin will show) */
export function jobAttributes(job, quote, files, t) {
  const L = t || {};
  const fileList = files.map((f) => f.name).join(' | ');
  const refList = files.map((f) => f.ref).filter(Boolean).join(' | ');
  const urlList = files.map((f) => f.url).filter(Boolean).join(' | ');
  return [
    { key: L.order || 'Print order', value: `${quote.totalPages} pages` },
    { key: L.files || 'Files', value: fileList || '-' },
    ...(urlList ? [{ key: L.fileUrl || 'File URL', value: urlList }] : []),
    ...(refList ? [{ key: L.fileRef || 'File ref', value: refList }] : []),
    { key: L.pages || 'Pages', value: files.map((f) => `${f.name}: ${f.pages}`).join(' | ') },
    { key: L.size || 'Paper size', value: quote.size },
    { key: L.color || 'Colour', value: quote.color === 'bw' ? 'Black & white' : 'Colour' },
    { key: L.sided || 'Sides', value: quote.sided === 'double' ? 'Double-sided' : 'Single-sided' },
    { key: L.copies || 'Copies', value: String(quote.copies) },
    { key: L.finishing || 'Finishing', value: quote.finishing },
    { key: L.fulfilment || 'Fulfilment', value: quote.fulfilment === 'delivery' ? 'Delivery' : 'Collect from shop' },
    ...(job.note ? [{ key: L.note || 'Customer note', value: String(job.note).slice(0, 500) }] : []),
  ];
}

export const FILE_EXT_RE = /\.(pdf|docx|jpe?g|png)$/i;
export const isPdf = (file) => /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
