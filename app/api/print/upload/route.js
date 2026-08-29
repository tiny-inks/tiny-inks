import { NextResponse } from 'next/server';
import PRINT from '@/config/print-pricing';
import {
  STORAGE_MODE, BLOB_TOKEN, storageStatus, sniffType, inspectPdf, newStorageKey, saveLocal,
  signedFileLink, rateLimit, clientIp, LINK_TTL_HOURS,
} from '@/lib/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* GET → how uploads work on this deployment (the page shows the warning) */
export async function GET() {
  return NextResponse.json({ ...storageStatus(), limits: PRINT.limits });
}

/* POST
   - local mode: multipart form with `file` → validated, saved under /tmp, returns { ref, url, pages? }
   - blob mode : JSON body from @vercel/blob/client (handleUpload protocol) → short-lived client
                 token; the browser uploads straight to Vercel Blob (no 4.5 MB body limit)
   - blob mode, `?finalize=1` with JSON { url, name } → returns the signed link for a finished upload */
export async function POST(req) {
  const ip = clientIp(req);
  const rl = rateLimit(ip, { max: 30, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '600' } });

  const ctype = req.headers.get('content-type') || '';

  if (STORAGE_MODE === 'blob' && ctype.includes('application/json')) {
    const url = new URL(req.url);
    if (url.searchParams.get('finalize')) {
      const { url: blobUrl, name } = await req.json();
      if (!blobUrl || !/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(blobUrl)) return NextResponse.json({ ok: false, error: 'bad_url' }, { status: 400 });
      const ref = `blob:${blobUrl}`;
      return NextResponse.json({ ok: true, ref, url: signedFileLink(ref), ttlHours: LINK_TTL_HOURS, name });
    }
    const { handleUpload } = await import('@vercel/blob/client');
    const body = await req.json();
    try {
      const json = await handleUpload({
        body, request: req, token: BLOB_TOKEN,
        onBeforeGenerateToken: async (pathname) => {
          if (!pathname.startsWith('print/')) throw new Error('bad path');
          return {
            allowedContentTypes: PRINT.limits.accept,
            maximumSizeInBytes: PRINT.limits.maxFileBytes,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ ip }),
          };
        },
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(json);
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
  }

  if (!ctype.includes('multipart/form-data')) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ ok: false, error: 'no_file' }, { status: 400 });
  if (file.size > PRINT.limits.maxFileBytes) return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffType(buf, file.name);
  if (!kind) return NextResponse.json({ ok: false, error: 'unsupported' }, { status: 415 });
  let pages = null;
  if (kind === 'pdf') {
    const info = await inspectPdf(buf);
    if (!info.ok) return NextResponse.json({ ok: false, error: info.error }, { status: 422 });
    pages = info.pages;
  }
  const key = newStorageKey(file.name);
  const ref = await saveLocal(key, buf);
  return NextResponse.json({ ok: true, ref, url: signedFileLink(ref), pages, kind, ttlHours: LINK_TTL_HOURS, storage: storageStatus() });
}
