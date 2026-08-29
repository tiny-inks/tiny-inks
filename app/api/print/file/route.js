import { NextResponse } from 'next/server';
import { verifyFileLink, readRef } from '@/lib/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

/* Private files are only reachable through a signed, expiring link. */
export async function GET(req) {
  const u = new URL(req.url);
  const v = verifyFileLink(u.searchParams.get('ref'), u.searchParams.get('exp'), u.searchParams.get('sig'));
  if (!v) return new NextResponse('Invalid link', { status: 403 });
  if (v.expired) return new NextResponse('This link has expired. Ask the shop for a fresh one.', { status: 410 });
  try {
    const { buf, name } = await readRef(v.ref);
    const ext = (name.split('.').pop() || '').toLowerCase();
    const inline = u.searchParams.get('dl') ? 'attachment' : 'inline';
    return new NextResponse(buf, {
      headers: {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Content-Disposition': `${inline}; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch {
    return new NextResponse('File not found (it may have been deleted after the retention period).', { status: 404 });
  }
}
