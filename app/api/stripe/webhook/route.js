import { NextResponse } from 'next/server';
import {
  verifyStripeSignature, unchunkPayload, quoteBasket, chargedQuote, createOrderFromPayload,
  findOrderForKey, recordFailedOrder, STRIPE_WEBHOOK_SECRET,
} from '@/lib/checkout-server';
import { sendCustomerOrderEmail, sendStaffOrderEmail } from '@/lib/order-email';
import { redactSecrets } from '@/lib/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Stripe webhook — THE source of truth for order creation.
   - signature verified against STRIPE_WEBHOOK_SECRET (raw body)
   - payment_intent.succeeded → create the Shopify order (idempotent per payment_intent)
   - creation failure → recorded + alerted + 500 so Stripe retries; the customer
     already sees success because their money was taken — recovery is our job. */
export async function POST(req) {
  if (!STRIPE_WEBHOOK_SECRET) return NextResponse.json({ ok: false, error: 'webhook_not_configured' }, { status: 503 });
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!verifyStripeSignature(rawBody, sig)) {
    console.error('webhook: bad signature');
    return NextResponse.json({ ok: false, error: 'bad_signature' }, { status: 400 });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }); }

  if (event.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const pi = event.data?.object;
  if (!pi?.id) return NextResponse.json({ ok: false, error: 'no_intent' }, { status: 400 });

  /* idempotency: same payment_intent never creates two orders (retries, double sends) */
  const existing = await findOrderForKey(pi.id);
  if (existing) return NextResponse.json({ ok: true, orderName: existing.orderName, duplicate: true });

  const payload = unchunkPayload(pi.metadata);
  if (!payload?.items?.length) {
    await recordFailedOrder(pi.id, { metadata: pi.metadata }, new Error('missing payload metadata'));
    return NextResponse.json({ ok: false, error: 'missing_payload' }, { status: 500 });
  }

  try {
    /* re-quote for titles and flags only. The MONEY on the order is what Stripe
       charged: the price snapshot stored on the PaymentIntent, checked against
       pi.amount (see chargedQuote). Today's prices never reach the order. */
    const fresh = await quoteBasket(payload.items, payload.method);
    if (!fresh.ok) {
      throw Object.assign(new Error(`re-quote failed: ${fresh.error}${fresh.issues ? ` ${JSON.stringify(fresh.issues)}` : ''}`), { stage: 'requote' });
    }
    const quote = chargedQuote(fresh, payload.pricing, pi.amount);
    const rec = await createOrderFromPayload(payload, quote, { kind: 'stripe', pi: pi.id });
    console.log(`webhook: order ${rec.orderName} for ${pi.id}${rec.duplicate ? ' (duplicate)' : ''}`);

    /* Order emails: only for a payment that succeeded AND produced a REAL
       Shopify order. Skipped on a duplicate (a webhook retry must not email
       twice) and on the demo bridge (no real order exists).
       Deliberately awaited but never allowed to throw — a non-2xx here would
       make Stripe retry and re-attempt order creation. */
    if (!rec.duplicate && !rec.demo) {
      await Promise.allSettled([
        sendCustomerOrderEmail({ payload, quote, orderName: rec.orderName }),
        sendStaffOrderEmail({
          payload, quote,
          orderName: rec.orderName, orderId: rec.orderId,
          paymentRef: pi.id, financialStatus: 'paid',
        }),
      ]);
    }

    return NextResponse.json({ ok: true, orderName: rec.orderName, duplicate: !!rec.duplicate });
  } catch (e) {
    const stage = e.stage || 'unknown';
    const detail = redactSecrets(e?.message || e, 500);
    console.error('WEBHOOK ORDER FAILED', JSON.stringify({ paymentIntent: pi.id, stage, status: e.status || null, detail }));
    await recordFailedOrder(pi.id, payload, e);
    /* 500 → Stripe retries with backoff; each retry re-runs the idempotent path.
       stage/status/detail are sanitised and only ever returned AFTER the Stripe
       signature check above, so they appear in Stripe's delivery log only. */
    return NextResponse.json({ ok: false, error: 'order_failed', stage, status: e.status || null, detail }, { status: 500 });
  }
}
