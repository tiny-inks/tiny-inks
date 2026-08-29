import { NextResponse } from 'next/server';
import { signedFileLink, LINK_TTL_HOURS } from '@/lib/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* POST { ref } → a fresh short-lived signed link for a stored file (staff only;
   the customer's original link may have expired). Demo refs open a sample PDF. */
export async function POST(req) {
  const { ref } = await req.json().catch(() => ({}));
  if (!ref || typeof ref !== 'string') return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  if (ref.startsWith('demo:')) return NextResponse.json({ ok: true, url: '/print/sample.pdf', demo: true });
  if (!/^(local|blob):/.test(ref)) return NextResponse.json({ ok: false, error: 'bad_ref' }, { status: 400 });
  return NextResponse.json({ ok: true, url: signedFileLink(ref, Math.min(LINK_TTL_HOURS, 4)), ttlHours: Math.min(LINK_TTL_HOURS, 4) });
}
