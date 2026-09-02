import { NextResponse } from 'next/server';
import {
  quoteBasket, createPaymentIntent, cleanPayload, validateContact, STRIPE_LIVE, toAed,
} from '@/lib/checkout-server';
import { rateLimit, clientIp } from '@/lib/print-server';
import CHECKOUT from '@/config/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* POST { items, method, contact, address, note, locale } →
   re-quotes the basket (inventory re-checked), creates the PaymentIntent with the
   SERVER-computed amount, and returns the client secret. Any client-sent totals
   are ignored by design. */
export async function POST(req) {
  const rl = rateLimit(`intent:${clientIp(req)}`, CHECKOUT.rateLimit);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  if (!STRIPE_LIVE) return NextResponse.json({ ok: false, error: 'stripe_not_configured' }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  const payload = cleanPayload(body, body.locale);
  const missing = validateContact(payload);
  if (missing.length) return NextResponse.json({ ok: false, error: 'contact', fields: missing }, { status: 400 });

  try {
    const quote = await quoteBasket(payload.items, payload.method);
    if (!quote.ok) return NextResponse.json(quote, { status: quote.error === 'items' ? 409 : 400 });
    const pi = await createPaymentIntent({ amountFils: quote.totalFils, payload, locale: payload.locale });
    console.log(`payment_intent ${pi.id} created: ${toAed(quote.totalFils)} AED, ${quote.lines.length} lines`); // no card data is ever seen server-side
    return NextResponse.json({
      ok: true,
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      amountFils: quote.totalFils,
      quote: { subtotalFils: quote.subtotalFils, deliveryFils: quote.deliveryFils, totalFils: quote.totalFils, currency: quote.currency },
    });
  } catch (e) {
    console.error('intent failed:', e.code || '', e.message);
    return NextResponse.json({ ok: false, error: e.code === 'stripe_error' || e.status >= 500 ? 'stripe_error' : e.code || 'intent_failed' }, { status: 502 });
  }
}
