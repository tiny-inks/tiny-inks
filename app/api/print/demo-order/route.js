import { NextResponse } from 'next/server';
import { addDemoOrder, rateLimit, clientIp } from '@/lib/print-server';
import { isLive } from '@/lib/shopify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Demo mode only: records a simulated print order so the staff queue shows it.
   In live mode the real order is created by Shopify checkout. */
export async function POST(req) {
  if (isLive()) return NextResponse.json({ ok: false, error: 'live_mode' }, { status: 400 });
  const rl = rateLimit(clientIp(req), { max: 20, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || !body.items.length) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  const clean = (v, n) => String(v ?? '').slice(0, n);
  const order = await addDemoOrder({
    total: Number(body.total) || 0,
    currency: 'AED',
    customer: { name: clean(body.customer?.name, 120), phone: clean(body.customer?.phone, 40), email: clean(body.customer?.email, 200) },
    fulfilment: body.fulfilment === 'delivery' ? 'delivery' : 'collect',
    address: clean(body.address, 300),
    note: clean(body.note, 500),
    pagesPrinted: Number(body.pagesPrinted) || 0,
    items: body.items.slice(0, 20).map((i) => ({
      title: clean(i.title, 120), quantity: Number(i.quantity) || 1, amount: Number(i.amount) || 0,
      attributes: (i.attributes || []).slice(0, 20).map((a) => ({ key: clean(a.key, 60), value: clean(a.value, 600) })),
    })),
  });
  return NextResponse.json({ ok: true, order: { id: order.id, name: order.name, createdAt: order.createdAt } });
}
