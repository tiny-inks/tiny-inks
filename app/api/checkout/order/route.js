import { NextResponse } from 'next/server';
import { findOrderForKey, retrievePaymentIntent, STRIPE_LIVE, cleanStr } from '@/lib/checkout-server';
import { rateLimit, clientIp } from '@/lib/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* GET ?pi=pi_... | ?cod=<key> → { found, orderName } — polled by the confirmation
   page. The browser NEVER creates orders; it only asks whether the webhook did. */
export async function GET(req) {
  const rl = rateLimit(`order:${clientIp(req)}`, { max: 120, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  const u = new URL(req.url);
  const pi = cleanStr(u.searchParams.get('pi'), 80).replace(/[^\w]/g, '');
  const cod = cleanStr(u.searchParams.get('cod'), 60).replace(/[^\w-]/g, '');
  const key = pi || (cod ? `cod_${cod}` : '');
  if (!key) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });

  const rec = await findOrderForKey(key);
  if (rec) return NextResponse.json({ ok: true, found: true, orderName: rec.orderName });

  /* order not there yet — report payment state so the page can reassure honestly */
  let paid = null;
  if (pi && STRIPE_LIVE) {
    try { paid = (await retrievePaymentIntent(pi)).status === 'succeeded'; } catch { paid = null; }
  }
  return NextResponse.json({ ok: true, found: false, paid });
}
