import { NextResponse } from 'next/server';
import {
  quoteBasket, createOrderFromPayload, cleanPayload, validateContact, cleanStr, recordFailedOrder,
} from '@/lib/checkout-server';
import { rateLimit, clientIp } from '@/lib/print-server';
import CHECKOUT from '@/config/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* POST { key, items, method, contact, address, note, locale } → creates the order
   immediately with financial_status pending + tag "cod". `key` (client-generated,
   kept for the session) makes retries idempotent. */
export async function POST(req) {
  if (!CHECKOUT.cod.enabled) return NextResponse.json({ ok: false, error: 'cod_disabled' }, { status: 503 });
  const rl = rateLimit(`cod:${clientIp(req)}`, CHECKOUT.rateLimit);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  const key = cleanStr(body.key, 60).replace(/[^\w-]/g, '');
  if (key.length < 8) return NextResponse.json({ ok: false, error: 'bad_key' }, { status: 400 });
  const payload = cleanPayload(body, body.locale);
  const missing = validateContact(payload);
  if (missing.length) return NextResponse.json({ ok: false, error: 'contact', fields: missing }, { status: 400 });

  try {
    const quote = await quoteBasket(payload.items, payload.method);
    if (!quote.ok) return NextResponse.json(quote, { status: quote.error === 'items' ? 409 : 400 });
    const rec = await createOrderFromPayload(payload, quote, { kind: 'cod', key });
    return NextResponse.json({ ok: true, orderName: rec.orderName, duplicate: !!rec.duplicate });
  } catch (e) {
    await recordFailedOrder(`cod_${key}`, payload, e);
    return NextResponse.json({ ok: false, error: 'order_failed' }, { status: 502 });
  }
}
