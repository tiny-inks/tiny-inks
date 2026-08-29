/*
 * PRINT SERVICE PRICING — the one file to edit.
 * Every number below is a PLACEHOLDER until the owner confirms real rates.
 * Amounts are AED. The Shopify products listed in `products` must carry the
 * same prices (see print-report.md) so the cart total matches the quote.
 */
const PRINT_PRICING = {
  currency: 'AED',

  /* price per printed page (single-sided). PLACEHOLDER */
  perPage: {
    A4: { bw: 0.5, colour: 2.0 },
    A3: { bw: 1.0, colour: 4.0 },
  },
  /* double-sided pages cost this fraction of the single-sided rate (0.9 = 10% off). PLACEHOLDER */
  doubleSidedFactor: 0.9,

  /* finishing — perSet is charged once per printed copy of each file,
     perPage once per printed page. PLACEHOLDER */
  finishing: {
    none: { perSet: 0, perPage: 0 },
    staple: { perSet: 1.0, perPage: 0 },
    spiral: { perSet: 12.0, perPage: 0 },
    lamination: { perSet: 0, perPage: 3.0 },
  },

  /* fulfilment */
  delivery: { fee: 15.0, note: 'Abu Dhabi only, 1–2 working days' }, // PLACEHOLDER
  pickup: { readyInHours: 3 }, // "ready in about X hours" PLACEHOLDER

  /* smallest print order we accept (topped up to this amount) — PLACEHOLDER */
  minimumOrder: 10.0,

  /* optional bulk discount on the page cost — first matching tier (highest first) wins. PLACEHOLDER */
  bulkTiers: [
    { minPages: 1000, percent: 15 },
    { minPages: 500, percent: 10 },
    { minPages: 200, percent: 5 },
  ],

  /* upload limits */
  limits: {
    maxFileBytes: 50 * 1024 * 1024,
    maxFiles: 10,
    maxCopies: 200,
    accept: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'],
    extensions: ['pdf', 'docx', 'jpg', 'jpeg', 'png'],
  },

  /* hidden Shopify products (handle → what it charges). Create these in Shopify
     admin with EXACTLY these handles and the prices above; keep them out of all
     collections and the search index (see print-report.md). */
  products: {
    'print-page-a4-bw-single': { size: 'A4', color: 'bw', sided: 'single' },
    'print-page-a4-bw-double': { size: 'A4', color: 'bw', sided: 'double' },
    'print-page-a4-colour-single': { size: 'A4', color: 'colour', sided: 'single' },
    'print-page-a4-colour-double': { size: 'A4', color: 'colour', sided: 'double' },
    'print-page-a3-bw-single': { size: 'A3', color: 'bw', sided: 'single' },
    'print-page-a3-bw-double': { size: 'A3', color: 'bw', sided: 'double' },
    'print-page-a3-colour-single': { size: 'A3', color: 'colour', sided: 'single' },
    'print-page-a3-colour-double': { size: 'A3', color: 'colour', sided: 'double' },
    'print-finishing-staple': { finishing: 'staple' },
    'print-finishing-spiral': { finishing: 'spiral' },
    'print-finishing-lamination': { finishing: 'lamination' },
    'print-delivery': { delivery: true },
    'print-minimum-topup': { topup: true }, // priced AED 1.00, quantity = whole AED of top-up
  },

  /* orders from /print carry this tag so the staff app can find them */
  orderTag: 'print-service',
};

export default PRINT_PRICING;
