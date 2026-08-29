import { NextResponse } from 'next/server';
import { cleanupOld, RETENTION_DAYS } from '@/lib/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Deletes uploaded print files older than PRINT_FILE_RETENTION_DAYS.
   Called by the Vercel cron in vercel.json (Authorization: Bearer CRON_SECRET),
   or manually with the same header. */
async function run(req) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!secret && process.env.NODE_ENV === 'production' && process.env.VERCEL) return NextResponse.json({ ok: false, error: 'CRON_SECRET not set' }, { status: 503 });
  const result = await cleanupOld(RETENTION_DAYS);
  return NextResponse.json({ ok: true, ...result });
}
export const GET = run;
export const POST = run;
