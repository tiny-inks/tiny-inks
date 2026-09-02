import { NextResponse } from 'next/server';
import { quoteBasket, checkoutStatus } from '@/lib/checkout-server';
import { rateLimit, clientIp } from '@/lib/print-server';
import CHECKOUT from '@/config/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* GET → what payment options this deployment offers (never exposes secrets) */
export async function GET() {
  return NextResponse.json({ ok: true, ...checkoutStatus(), publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null });
}

/* POST { items:[{variantId,qty}], method } → server-priced quote.
   Client prices are never read — only variant ids and quantities. */
export async function POST(req) {
  const rl = rateLimit(`quote:${clientIp(req)}`, { max: 120, windowMs: CHECKOUT.rateLimit.windowMs }); // read-only + polled by the UI, so roomier than intent/cod
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  try {
    const quote = await quoteBasket(body.items, body.method);
    if (!quote.ok) return NextResponse.json(quote, { status: quote.error === 'items' ? 409 : 400 });
    return NextResponse.json(quote);
  } catch (e) {
    console.error('quote failed:', e.message);
    return NextResponse.json({ ok: false, error: 'quote_failed' }, { status: 502 });
  }
}
