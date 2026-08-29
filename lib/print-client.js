/* Browser-side helpers for the print page: PDF page count (pdf-lib, bundled),
   first-page thumbnails (pdf.js from a CDN, best effort) and uploads. */
import PRINT from '@/config/print-pricing';

export function fileKind(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (ext === 'docx' || file.type === PRINT.limits.accept[1]) return 'docx';
  if (ext === 'jpg' || ext === 'jpeg' || file.type === 'image/jpeg') return 'jpg';
  if (ext === 'png' || file.type === 'image/png') return 'png';
  return null;
}

/* → { pages } or throws Error with .code = 'encrypted' | 'corrupt' */
export async function countPdfPages(bytes) {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.byteLength, 2 * 1024 * 1024)));
  const tail = new TextDecoder('latin1').decode(bytes.slice(Math.max(0, bytes.byteLength - 1024 * 1024)));
  if (/\/Encrypt\b/.test(tail) || /\/Encrypt\b/.test(head)) { const e = new Error('encrypted'); e.code = 'encrypted'; throw e; }
  const { PDFDocument } = await import('pdf-lib');
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
    const pages = doc.getPageCount();
    if (!pages) { const e = new Error('corrupt'); e.code = 'corrupt'; throw e; }
    return { pages };
  } catch (err) {
    if (err.code) throw err;
    const e = new Error(/encrypt/i.test(String(err?.message || err?.name)) ? 'encrypted' : 'corrupt');
    e.code = e.message;
    throw e;
  }
}

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* webpackIgnore: true */ PDFJS).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return lib;
    });
  }
  return pdfjsPromise;
}
/* first page as a small data URL, or null if pdf.js can't be loaded (offline, blocked CDN) */
export async function pdfThumbnail(bytes, width = 180) {
  try {
    const lib = await Promise.race([loadPdfjs(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))]);
    const doc = await lib.getDocument({ data: bytes.slice(0) }).promise;
    const page = await doc.getPage(1);
    const vp0 = page.getViewport({ scale: 1 });
    const scale = width / vp0.width;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const url = canvas.toDataURL('image/jpeg', 0.8);
    doc.destroy?.();
    return url;
  } catch {
    return null;
  }
}

export async function storageStatus() {
  try { const r = await fetch('/api/print/upload'); return await r.json(); } catch { return { mode: 'unknown', warning: 'Could not reach the upload service.' }; }
}

/* Upload one file. Local mode → multipart to our route (progress via XHR).
   Blob mode → straight to Vercel Blob with a token from our route, then finalize. */
export function uploadFile(file, mode, onProgress) {
  if (mode === 'blob') {
    return (async () => {
      const { upload } = await import('@vercel/blob/client');
      const blob = await upload(`print/${new Date().toISOString().slice(0, 10)}/${file.name}`, file, {
        access: 'public', handleUploadUrl: '/api/print/upload', onUploadProgress: (p) => onProgress?.(p.percentage),
      });
      const r = await fetch('/api/print/upload?finalize=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: blob.url, name: file.name }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw Object.assign(new Error(j.error || 'upload_failed'), { code: j.error || 'upload_failed' });
      return j;
    })();
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/print/upload');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let j = {};
      try { j = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && j.ok) resolve(j);
      else reject(Object.assign(new Error(j.error || `http_${xhr.status}`), { code: j.error || (xhr.status === 413 ? 'too_large' : xhr.status === 429 ? 'rate_limited' : 'upload_failed') }));
    };
    xhr.onerror = () => reject(Object.assign(new Error('network'), { code: 'network' }));
    const fd = new FormData();
    fd.append('file', file, file.name);
    xhr.send(fd);
  });
}
