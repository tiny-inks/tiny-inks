import { NextResponse } from 'next/server';
import { ADMIN_LIVE, setAdminStatus, loadDemoOrders, saveDemoOrders, STATUSES } from '@/lib/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* POST { id, status } → stores the status as an order tag (print:<status>).
   Protected by middleware. */
export async function POST(req) {
  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  try {
    if (ADMIN_LIVE && !String(id).startsWith('demo-')) {
      await setAdminStatus(id, status);
    } else {
      const list = await loadDemoOrders();
      const o = list.find((x) => x.id === id);
      if (!o) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
      o.status = status;
      o.updatedAt = new Date().toISOString();
      await saveDemoOrders(list);
    }
    return NextResponse.json({ ok: true, id, status });
  } catch (e) {
    console.error('status update', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}
