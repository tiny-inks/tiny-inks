/*
 * CHECKOUT CONFIG — one place for delivery + payment settings.
 * Amounts are AED. The server always recomputes from this file + Shopify data;
 * nothing the browser sends about prices is ever trusted.
 */
const CHECKOUT = {
  currency: 'AED',

  /* delivery: free over the threshold, flat fee under it (UAE-wide) */
  delivery: {
    freeOver: 150,
    fee: 0, // TEMPORARY for the live payment test — restore to 25 afterwards
    title: { en: 'UAE delivery', ar: 'توصيل داخل الإمارات' },
    collectTitle: { en: 'Collect from shop', ar: 'استلام من المتجر' },
  },

  /* UAE VAT is included in the catalogue prices; the Shopify order is created
     with taxes_included=true so Shopify derives the VAT portion itself.
     Keep Shopify's tax setting "All prices include tax" ON to match. */
  taxesIncludedInPrices: true,

  /* Cash on Delivery — backend kept intact, but NOT offered publicly.
     Flipping this to true re-exposes it in checkout with no other change. */
  cod: {
    enabled: false,
    /* optional surcharge in AED (0 = none) */
    fee: 0,
  },

  /* the Shopify order tags */
  tags: { web: 'web', cod: 'cod', print: 'print-service' },

  /* checkout endpoints rate limit (per IP) */
  rateLimit: { max: 30, windowMs: 10 * 60 * 1000 },
};

export default CHECKOUT;
