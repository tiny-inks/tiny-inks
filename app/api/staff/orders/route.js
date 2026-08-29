import { NextResponse } from 'next/server';
import { ADMIN_LIVE, fetchAdminOrders, loadDemoOrders, storageStatus } from '@/lib/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Protected by middleware (staff cookie). Live: Shopify Admin API orders tagged
   print-service. Demo: the local order store seeded with sample jobs. */
export async function GET() {
  try {
    const orders = ADMIN_LIVE ? await fetchAdminOrders() : await loadDemoOrders();
    return NextResponse.json({ ok: true, live: ADMIN_LIVE, storage: storageStatus().mode, orders });
  } catch (e) {
    console.error('staff orders', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}
