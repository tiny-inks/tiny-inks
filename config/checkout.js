/*
 * CHECKOUT CONFIG — one place for delivery + payment settings.
 * Amounts are AED. The server always recomputes from this file + Shopify data;
 * nothing the browser sends about prices is ever trusted.
 */
const CHECKOUT = {
  currency: 'AED',

  /* delivery: free over the threshold, flat fee under it (Abu Dhabi) */
  delivery: {
    freeOver: 150,
    fee: 15,
    title: { en: 'Abu Dhabi delivery', ar: 'توصيل أبوظبي' },
    collectTitle: { en: 'Collect from shop', ar: 'استلام من المتجر' },
  },

  /* UAE VAT is included in the catalogue prices; the Shopify order is created
     with taxes_included=true so Shopify derives the VAT portion itself.
     Keep Shopify's tax setting "All prices include tax" ON to match. */
  taxesIncludedInPrices: true,

  /* Cash on Delivery */
  cod: {
    enabled: true,
    /* optional surcharge in AED (0 = none) */
    fee: 0,
  },

  /* the Shopify order tags */
  tags: { web: 'web', cod: 'cod', print: 'print-service' },

  /* checkout endpoints rate limit (per IP) */
  rateLimit: { max: 30, windowMs: 10 * 60 * 1000 },
};

export default CHECKOUT;
