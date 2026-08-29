'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../CartContext';
import { saveJob, lineLabel } from './PrintConfirmation';
import { PRINT, SIZES, COLORS, SIDES, FINISHING, FULFILMENT, computeQuote, buildCartLines, jobAttributes, fmtMoney, pageProductHandle } from '@/lib/print';
import { fileKind, countPdfPages, pdfThumbnail, storageStatus, uploadFile } from '@/lib/print-client';

let uid = 0;
const fmtBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export default function PrintOrder({ dict, locale, live, business }) {
  const t = dict.print;
  const router = useRouter();
  const cart = useCart();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [storage, setStorage] = useState(null);
  const [opt, setOpt] = useState({ size: 'A4', color: 'bw', sided: 'single', copies: 1, finishing: 'none', fulfilment: 'collect', note: '' });
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [products, setProducts] = useState(null);

  useEffect(() => { storageStatus().then(setStorage); }, []);
  useEffect(() => {
    fetch('/api/print/products').then((r) => r.json()).then((j) => setProducts(j)).catch(() => setProducts({ ok: false }));
  }, []);

  const patchFile = useCallback((id, patch) => setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...(typeof patch === 'function' ? patch(f) : patch) } : f))), []);

  const addFiles = useCallback(async (incoming) => {
    const room = PRINT.limits.maxFiles - files.length;
    const picked = Array.from(incoming).slice(0, Math.max(0, room));
    for (const file of picked) {
      const id = `f${++uid}`;
      const kind = fileKind(file);
      const entry = { id, file, name: file.name, size: file.size, kind, status: 'checking', progress: 0, pages: null, manualPages: kind !== 'pdf', thumb: null, ref: null, url: null, error: '' };
      if (!kind) { setFiles((l) => [...l, { ...entry, status: 'error', error: 'unsupported' }]); continue; }
      if (file.size > PRINT.limits.maxFileBytes) { setFiles((l) => [...l, { ...entry, status: 'error', error: 'too_large' }]); continue; }
      setFiles((l) => [...l, entry]);

      /* 1 — inspect: page count + preview */
      let pages = null;
      if (kind === 'pdf') {
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          ({ pages } = await countPdfPages(bytes));
          patchFile(id, { pages, manualPages: false });
          pdfThumbnail(bytes).then((thumb) => { if (thumb) patchFile(id, { thumb }); });
        } catch (e) {
          patchFile(id, { status: 'error', error: e.code === 'encrypted' ? 'encrypted' : 'corrupt' });
          continue;
        }
      } else if (kind === 'jpg' || kind === 'png') {
        pages = 1;
        patchFile(id, { pages: 1, thumb: URL.createObjectURL(file) });
      }

      /* 2 — upload with progress */
      patchFile(id, { status: 'uploading' });
      const mode = (storage?.mode) || (await storageStatus()).mode;
      try {
        const res = await uploadFile(file, mode, (p) => patchFile(id, { progress: p }));
        patchFile(id, (f) => ({ status: 'ready', progress: 100, ref: res.ref, url: res.url, pages: res.pages ?? f.pages }));
      } catch (e) {
        patchFile(id, { status: 'error', error: e.code || 'upload_failed' });
      }
    }
  }, [files.length, storage, patchFile]);

  const remove = (id) => setFiles((l) => l.filter((f) => f.id !== id));

  const readyFiles = files.filter((f) => f.status === 'ready' && Number(f.pages) > 0);
  const quote = useMemo(() => computeQuote({ ...opt, files: readyFiles }), [opt, readyFiles.map((f) => f.pages).join(',')]);
  const busyFiles = files.some((f) => f.status === 'checking' || f.status === 'uploading');
  const needsPages = files.some((f) => f.status === 'ready' && !(Number(f.pages) > 0));
  const canSubmit = readyFiles.length > 0 && !busyFiles && !needsPages && !submitting && (live || (customer.name.trim() && customer.phone.trim().length > 6));

  const set = (k) => (v) => setOpt((o) => ({ ...o, [k]: v }));

  const submit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const attrs = jobAttributes(opt, quote, readyFiles);
      const resolve = (handle) => {
        const cfgPrice = handlePrice(handle, quote);
        const p = products?.products?.[handle];
        if (live) {
          if (!p?.variantId) return null;
          return { variantId: p.variantId, handle, title: p.title, price: p.price ?? cfgPrice, images: [] };
        }
        return { variantId: `demo-${handle}`, handle, title: handleTitle(handle, t), price: cfgPrice, images: [] };
      };
      const lines = buildCartLines(quote, opt, resolve, attrs);
      if (live && (!lines.length || lines.length < 1 + (quote.finishing !== 'none' ? 1 : 0) + (quote.delivery ? 1 : 0) + (quote.topup ? 1 : 0))) {
        setSubmitError(t.errors.products);
        setSubmitting(false);
        return;
      }
      const job = {
        demo: !live, quote, options: opt, note: opt.note,
        files: readyFiles.map((f) => ({ name: f.name, pages: f.pages, ref: f.ref, url: f.url })),
        customer, createdAt: new Date().toISOString(),
      };
      if (live) {
        await cart.addLines(lines, { open: false });
        saveJob(job);
        router.push(`/${locale}/print/confirmation`);
        return;
      }
      /* demo: simulate the paid order so the staff queue shows it */
      const r = await fetch('/api/print/demo-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total: quote.total, customer, fulfilment: quote.fulfilment, note: opt.note, pagesPrinted: quote.totalPages,
          items: lines.map((l) => ({ title: l.title, quantity: l.qty, amount: Math.round(l.price * l.qty * 100) / 100, attributes: l.attributes })),
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'demo_order');
      await cart.addLines(lines, { open: false });
      saveJob({ ...job, orderName: j.order.name, paid: true });
      router.push(`/${locale}/print/confirmation`);
    } catch (e) {
      console.error(e);
      setSubmitError(t.errors.submit);
      setSubmitting(false);
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); };

  return (
    <div className="print-layout">
      <div className="print-main">
        {/* ---- 1. files ---- */}
        <section className="print-card" aria-labelledby="ph-files">
          <h2 id="ph-files" className="print-h2"><span className="step">1</span>{t.filesTitle}</h2>
          {storage && storage.mode !== 'blob' && (
            <div className="form-err print-warn" role="status">
              <strong>{t.storageWarnTitle}</strong> {t.storageWarn}
            </div>
          )}
          <div
            className={`dropzone ${drag ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
            role="button"
            tabIndex={0}
            aria-label={t.dropLabel}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
              data-testid="print-file-input"
            />
            <span className="drop-icon" aria-hidden="true">⇪</span>
            <strong>{t.dropTitle}</strong>
            <span className="field-note">{t.dropHint}</span>
          </div>

          {files.length > 0 && (
            <ul className="file-list">
              {files.map((f) => (
                <li key={f.id} className={`file-row ${f.status}`}>
                  <div className="file-thumb" aria-hidden="true">
                    {f.thumb ? <img src={f.thumb} alt="" /> : <span className={`file-ext ${f.kind || ''}`}>{(f.kind || '?').toUpperCase()}</span>}
                  </div>
                  <div className="file-info">
                    <strong className="file-name">{f.name}</strong>
                    <span className="field-note">{fmtBytes(f.size)}</span>
                    {f.status === 'checking' && <span className="file-status">{t.status.checking}</span>}
                    {f.status === 'uploading' && (
                      <span className="file-status">
                        <span className="file-bar"><span style={{ width: `${f.progress}%` }} /></span> {t.status.uploading} {f.progress}%
                      </span>
                    )}
                    {f.status === 'error' && <span className="file-status err" role="alert">{t.errors[f.error] || t.errors.upload_failed}</span>}
                    {f.status === 'ready' && (
                      f.manualPages ? (
                        <label className="file-pages">
                          <span>{t.pagesManual}</span>
                          <input type="number" min="1" max="2000" inputMode="numeric" className="input" value={f.pages ?? ''} onChange={(e) => patchFile(f.id, { pages: Number(e.target.value) || 0 })} aria-label={`${t.pagesManual}: ${f.name}`} />
                        </label>
                      ) : (
                        <span className="file-status ok">✓ <b data-testid="page-count">{f.pages}</b> {t.pagesShort} · {t.status.ready}</span>
                      )
                    )}
                    {f.status === 'ready' && f.manualPages && <span className="field-note">{t.pagesManualNote}</span>}
                  </div>
                  <button type="button" className="file-remove" onClick={() => remove(f.id)} aria-label={`${t.remove}: ${f.name}`}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <p className="field-note print-privacy">{t.privacyShort} <Link href={`/${locale}/policies/privacy`} className="pdp-link">{dict.policies.privacy}</Link></p>
        </section>

        {/* ---- 2. options ---- */}
        <section className="print-card" aria-labelledby="ph-opts">
          <h2 id="ph-opts" className="print-h2"><span className="step">2</span>{t.optionsTitle}</h2>
          <div className="opt-grid">
            <Seg label={t.opt.size} value={opt.size} onChange={set('size')} options={SIZES.map((v) => [v, v])} />
            <Seg label={t.opt.color} value={opt.color} onChange={set('color')} options={COLORS.map((v) => [v, t.colors[v]])} />
            <Seg label={t.opt.sided} value={opt.sided} onChange={set('sided')} options={SIDES.map((v) => [v, t.sides[v]])} />
            <div className="opt">
              <span className="opt-label">{t.opt.copies}</span>
              <div className="qty" aria-label={t.opt.copies}>
                <button type="button" onClick={() => set('copies')(Math.max(1, opt.copies - 1))} aria-label="−">−</button>
                <input type="number" min="1" max={PRINT.limits.maxCopies} value={opt.copies} onChange={(e) => set('copies')(Math.max(1, Math.min(PRINT.limits.maxCopies, Number(e.target.value) || 1)))} aria-label={t.opt.copies} data-testid="copies" />
                <button type="button" onClick={() => set('copies')(Math.min(PRINT.limits.maxCopies, opt.copies + 1))} aria-label="+">+</button>
              </div>
            </div>
            <Seg label={t.opt.finishing} value={opt.finishing} onChange={set('finishing')} options={FINISHING.map((v) => [v, t.finishing[v]])} wide />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="print-note">{t.noteLabel}</label>
            <textarea id="print-note" className="input" rows={3} maxLength={500} placeholder={t.noteHint} value={opt.note} onChange={(e) => set('note')(e.target.value)} />
          </div>
        </section>

        {/* ---- 3. fulfilment ---- */}
        <section className="print-card" aria-labelledby="ph-ful">
          <h2 id="ph-ful" className="print-h2"><span className="step">3</span>{t.fulfilTitle}</h2>
          <div className="ful-grid" role="radiogroup" aria-label={t.fulfilTitle}>
            {FULFILMENT.map((v) => (
              <button
                key={v} type="button" role="radio" aria-checked={opt.fulfilment === v}
                className={`ful-opt ${opt.fulfilment === v ? 'on' : ''}`} onClick={() => set('fulfilment')(v)}
                data-testid={`fulfil-${v}`}
              >
                <strong>{t.fulfil[v]}</strong>
                <span>{v === 'collect' ? t.fulfilCollectNote.replace('{hours}', String(PRINT.pickup.readyInHours)) : `${fmtMoney(PRINT.delivery.fee, locale)} · ${t.fulfilDeliveryNote}`}</span>
              </button>
            ))}
          </div>
          {!live && (
            <div className="delivery-grid" style={{ marginTop: 16 }}>
              <div className="field">
                <label htmlFor="pc-name">{dict.delivery.name} *</label>
                <input id="pc-name" className="input" autoComplete="name" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="pc-phone">{dict.delivery.phone} *</label>
                <input id="pc-phone" className="input" type="tel" inputMode="tel" dir="ltr" placeholder="+971 5x xxx xxxx" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ---- live quote ---- */}
      <aside className="print-quote" aria-live="polite" aria-labelledby="ph-quote">
        <h2 id="ph-quote" className="print-h2">{t.quote.title}</h2>
        {quote.empty ? (
          <p className="field-note">{t.quote.empty}</p>
        ) : (
          <div className="quote-lines" data-testid="quote">
            {quote.lines.map((l, i) => (
              <div key={i} className={`quote-line ${l.amount < 0 ? 'neg' : ''}`} data-line={l.key}>
                <span>{lineLabel(l, t)}</span><strong data-testid={`line-${l.key}`}>{fmtMoney(l.amount, locale)}</strong>
              </div>
            ))}
            <div className="quote-line total"><span>{t.quote.total}</span><strong data-testid="quote-total">{fmtMoney(quote.total, locale)}</strong></div>
            <p className="field-note">{t.quote.note.replace('{min}', fmtMoney(PRINT.minimumOrder, locale))}</p>
          </div>
        )}
        {needsPages && <p className="field-err">{t.errors.needPages}</p>}
        {submitError && <p className="form-err" role="alert">{submitError}</p>}
        <button type="button" className="btn btn-primary print-submit" disabled={!canSubmit} onClick={submit} data-testid="print-submit">
          {submitting ? t.submitting : live ? t.submitLive : t.submitDemo}
        </button>
        {!live && <p className="field-note">{t.demoNote}</p>}
        <p className="field-note">{t.quote.rates}</p>
      </aside>

      {/* phone sticky total */}
      <div className="print-sticky">
        <div><small>{t.quote.total}</small><strong>{fmtMoney(quote.total, locale)}</strong></div>
        <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={submit}>{submitting ? t.submitting : live ? t.submitLive : t.submitDemo}</button>
      </div>
    </div>
  );
}

function Seg({ label, value, onChange, options, wide }) {
  return (
    <div className={`opt ${wide ? 'opt-wide' : ''}`}>
      <span className="opt-label" id={`seg-${label}`}>{label}</span>
      <div className="seg" role="radiogroup" aria-labelledby={`seg-${label}`}>
        {options.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={`seg-btn ${value === v ? 'on' : ''}`} onClick={() => onChange(v)} data-testid={`opt-${v}`}>{l}</button>
        ))}
      </div>
    </div>
  );
}

/* config price for a hidden product handle (demo resolve + sanity check) */
function handlePrice(handle, quote) {
  if (handle.startsWith('print-page-')) return quote.rate;
  if (handle === 'print-finishing-staple') return PRINT.finishing.staple.perSet;
  if (handle === 'print-finishing-spiral') return PRINT.finishing.spiral.perSet;
  if (handle === 'print-finishing-lamination') return PRINT.finishing.lamination.perPage;
  if (handle === 'print-delivery') return PRINT.delivery.fee;
  if (handle === 'print-minimum-topup') return 1;
  return 0;
}
function handleTitle(handle, t) {
  if (handle.startsWith('print-page-')) {
    const m = handle.match(/print-page-(a4|a3)-(bw|colour)-(single|double)/);
    return `${t.title}: ${m[1].toUpperCase()} · ${t.colors[m[2]]} · ${t.sides[m[3]]}`;
  }
  if (handle.startsWith('print-finishing-')) return `${t.title}: ${t.finishing[handle.replace('print-finishing-', '')]}`;
  if (handle === 'print-delivery') return `${t.title}: ${t.quote.delivery}`;
  if (handle === 'print-minimum-topup') return `${t.title}: ${t.quote.minimum}`;
  return handle;
}
export { pageProductHandle };
