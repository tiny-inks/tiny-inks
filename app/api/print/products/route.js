import { NextResponse } from 'next/server';
import PRINT from '@/config/print-pricing';
import { isLive, shopifyFetch, PRODUCT_BY_HANDLE_QUERY, normalizeProduct } from '@/lib/shopify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Variant ids + live prices of the hidden print products, keyed by handle.
   Demo mode answers from the config so the page works without Shopify. */
export async function GET() {
  const handles = Object.keys(PRINT.products);
  if (!isLive()) {
    return NextResponse.json({ ok: true, live: false, products: Object.fromEntries(handles.map((h) => [h, { handle: h, variantId: `demo-${h}`, price: null, title: h }])) });
  }
  const out = {};
  const missing = [];
  await Promise.all(handles.map(async (h) => {
    try {
      const d = await shopifyFetch(PRODUCT_BY_HANDLE_QUERY, { language: 'EN', country: 'AE', handle: h }, { revalidate: 300 });
      const p = normalizeProduct(d.product);
      if (p?.variantId) out[h] = { handle: h, variantId: p.variantId, price: p.price, title: p.title, available: p.available };
      else missing.push(h);
    } catch { missing.push(h); }
  }));
  return NextResponse.json({ ok: true, live: true, products: out, missing });
}
