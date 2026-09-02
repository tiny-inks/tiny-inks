'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../CartContext';
import { lineLabel } from './PrintConfirmation';
import { PRINT, SIZES, COLORS, SIDES, FINISHING, FULFILMENT, computeQuote, buildCartLines, jobAttributes, fmtMoney } from '@/lib/print';
import { fileKind, countPdfPages, pdfThumbnail, storageStatus, uploadFile } from '@/lib/print-client';

let uid = 0;
const fmtBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

/* ---------- little illustrations (inline SVG, brand colours only) ---------- */
const PaperIcon = ({ size }) => (
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" className="paper-svg">
    {size === 'A3' ? (
      <rect x="10" y="6" width="44" height="52" rx="3" fill="#fff" stroke="currentColor" strokeWidth="2" />
    ) : (
      <rect x="18" y="14" width="28" height="36" rx="2.5" fill="#fff" stroke="currentColor" strokeWidth="2" />
    )}
    <text x="32" y={size === 'A3' ? 37 : 36} textAnchor="middle" fontSize={size === 'A3' ? 14 : 11} fontWeight="800" fill="currentColor" fontFamily="inherit">{size}</text>
  </svg>
);
const SwatchIcon = ({ colour }) => (
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
    {colour ? (
      <>
        <rect x="6" y="6" width="24" height="24" rx="6" fill="var(--terracotta)" />
        <rect x="34" y="6" width="24" height="24" rx="6" fill="var(--mustard)" />
        <rect x="6" y="34" width="24" height="24" rx="6" fill="var(--blue)" />
        <rect x="34" y="34" width="24" height="24" rx="6" fill="var(--sage)" />
      </>
    ) : (
      <>
        <rect x="6" y="6" width="24" height="24" rx="6" fill="#26272b" />
        <rect x="34" y="6" width="24" height="24" rx="6" fill="#8a8a8a" />
        <rect x="6" y="34" width="24" height="24" rx="6" fill="#c9c9c9" />
        <rect x="34" y="34" width="24" height="24" rx="6" fill="#f0f0f0" stroke="#c9c9c9" />
      </>
    )}
  </svg>
);
const SidedIcon = ({ double }) => (
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" className="paper-svg">
    <rect x={double ? 8 : 18} y="10" width="28" height="38" rx="2.5" fill="#fff" stroke="currentColor" strokeWidth="2" />
    <path d={double ? 'M14 20h16M14 26h16M14 32h10' : 'M24 20h16M24 26h16M24 32h10'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {double && (
      <>
        <rect x="28" y="18" width="28" height="38" rx="2.5" fill="var(--cream)" stroke="currentColor" strokeWidth="2" />
        <path d="M34 28h16M34 34h16M34 40h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 56c8 4 16 4 22 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    )}
  </svg>
);
const FIN_ICON = {
  none: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /><path d="M7 17 17 7" /></svg>,
  staple: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4v9a6 6 0 0 0 12 0V6" /><path d="M9 4v9M15 4v9" /></svg>,
  spiral: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="7" y="4" width="13" height="16" rx="2" /><path d="M5 7h4M5 11h4M5 15h4" /></svg>,
  lamination: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 5l8 14" opacity=".5" /></svg>,
};

export default function PrintOrder({ dict, locale, live, business }) {
  const t = dict.print;
  const router = useRouter();
  const cart = useCart();
  const inputRef = useRef(null);
  const topRef = useRef(null);
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [storage, setStorage] = useState(null);
  const [opt, setOpt] = useState({ size: 'A4', color: 'bw', sided: 'single', copies: 1, finishing: 'none', fulfilment: 'collect', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [products, setProducts] = useState(null);
  const [quoteOpen, setQuoteOpen] = useState(false);

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
  const filesOk = readyFiles.length > 0 && !busyFiles && !needsPages;
  const canContinue = step === 1 ? filesOk : step === 2 ? filesOk : filesOk && !submitting;

  const set = (k) => (v) => setOpt((o) => ({ ...o, [k]: v }));
  const goto = (n) => { setStep(n); setQuoteOpen(false); setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };

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
      /* the job rides the normal cart into the on-site checkout (Stripe / COD) —
         orders land in Shopify (or the demo order book) via the checkout, tagged print-service */
      await cart.addLines(lines, { open: false });
      router.push(`/${locale}/checkout`);
    } catch (e) {
      console.error(e);
      setSubmitError(t.errors.submit);
      setSubmitting(false);
    }
  };

  const onPrimary = () => { if (step < 3) goto(step + 1); else submit(); };
  const primaryLabel = step < 3 ? t.steps.next : submitting ? t.submitting : live ? t.submitLive : t.submitDemo;
  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); };

  const STEPS = [t.steps.upload, t.steps.options, t.steps.fulfil];

  return (
    <div className="print-layout" ref={topRef}>
      <div className="print-main">
        {/* ---- stepper ---- */}
        <ol className="stepper" aria-label={t.steps.label}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n === step ? 'active' : n < step ? 'done' : '';
            return (
              <li key={n} className={`stepper-item ${state}`} aria-current={n === step ? 'step' : undefined}>
                <button type="button" className="stepper-dot" onClick={() => { if (n < step || (n > step && filesOk)) goto(n); }} aria-label={`${t.steps.step} ${n}: ${label}`} data-testid={`step-${n}`}>
                  {n < step ? '✓' : n}
                </button>
                <span className="stepper-label">{label}</span>
              </li>
            );
          })}
        </ol>

        {/* ---- step 1: upload ---- */}
        {step === 1 && (
          <section className="print-step" aria-labelledby="ph-files">
            <h2 id="ph-files" className="print-h2">{t.filesTitle}</h2>
            {storage && storage.mode !== 'blob' && (
              <div className="print-warn" role="status"><strong>{t.storageWarnTitle}</strong> {t.storageWarn}</div>
            )}
            <div
              className={`dropzone hero ${drag ? 'over' : ''} ${files.length ? 'has-files' : ''}`}
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
                tabIndex={-1}
                onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
                data-testid="print-file-input"
              />
              <span className="drop-spark" aria-hidden="true">✦</span>
              <strong className="drop-title">{t.dropTitle}</strong>
              <span className="drop-hint">{t.dropHint}</span>
            </div>
            <p className="print-privacy">
              <span aria-hidden="true">🔒</span> {t.privacyShort} <Link href={`/${locale}/policies/privacy`} className="pdp-link">{dict.policies.privacy}</Link>
            </p>

            {files.length > 0 && (
              <ul className="file-list">
                {files.map((f) => (
                  <li key={f.id} className={`file-row ${f.status}`}>
                    <div className="file-thumb" aria-hidden="true">
                      {f.thumb ? <img src={f.thumb} alt="" /> : <span className={`file-ext ${f.kind || ''}`}>{(f.kind || '?').toUpperCase()}</span>}
                    </div>
                    <div className="file-info">
                      <strong className="file-name">{f.name}</strong>
                      <span className="file-size">{fmtBytes(f.size)}</span>
                      {f.status === 'checking' && <span className="file-status">{t.status.checking}</span>}
                      {f.status === 'uploading' && (
                        <span className="file-status"><span className="file-bar"><span style={{ width: `${f.progress}%` }} /></span> {f.progress}%</span>
                      )}
                      {f.status === 'error' && <span className="file-status err" role="alert">{t.errors[f.error] || t.errors.upload_failed}</span>}
                      {f.status === 'ready' && (
                        f.manualPages ? (
                          <label className="file-pages">
                            <span>{t.pagesManual}</span>
                            <input type="number" min="1" max="2000" inputMode="numeric" className="input" value={f.pages ?? ''} onChange={(e) => patchFile(f.id, { pages: Number(e.target.value) || 0 })} aria-label={`${t.pagesManual}: ${f.name}`} />
                            <small>{t.pagesManualNote}</small>
                          </label>
                        ) : (
                          <span className="page-pill"><b data-testid="page-count">{f.pages}</b> {t.pagesShort}</span>
                        )
                      )}
                    </div>
                    <button type="button" className="file-remove" onClick={() => remove(f.id)} aria-label={`${t.remove}: ${f.name}`}>×</button>
                  </li>
                ))}
              </ul>
            )}
            {needsPages && <p className="field-err">{t.errors.needPages}</p>}
          </section>
        )}

        {/* ---- step 2: options ---- */}
        {step === 2 && (
          <section className="print-step" aria-labelledby="ph-opts">
            <h2 id="ph-opts" className="print-h2">{t.optionsTitle}</h2>

            <div className="opt-block">
              <span className="opt-label" id="lbl-size">{t.opt.size}</span>
              <div className="choice-grid two" role="radiogroup" aria-labelledby="lbl-size">
                {SIZES.map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={opt.size === v} className={`choice ${opt.size === v ? 'on' : ''}`} onClick={() => set('size')(v)} data-testid={`opt-${v}`}>
                    <PaperIcon size={v} />
                    <strong>{v}</strong>
                    <small>{t.sizeHint[v]}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="opt-block">
              <span className="opt-label" id="lbl-color">{t.opt.color}</span>
              <div className="choice-grid two" role="radiogroup" aria-labelledby="lbl-color">
                {COLORS.map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={opt.color === v} className={`choice ${opt.color === v ? 'on' : ''}`} onClick={() => set('color')(v)} data-testid={`opt-${v}`}>
                    <SwatchIcon colour={v === 'colour'} />
                    <strong>{t.colors[v]}</strong>
                    <small>{fmtMoney(PRINT.perPage[opt.size][v], locale)} / {t.pageOne}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="opt-block">
              <span className="opt-label" id="lbl-sided">{t.opt.sided}</span>
              <div className="choice-grid two" role="radiogroup" aria-labelledby="lbl-sided">
                {SIDES.map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={opt.sided === v} className={`choice ${opt.sided === v ? 'on' : ''}`} onClick={() => set('sided')(v)} data-testid={`opt-${v}`}>
                    <SidedIcon double={v === 'double'} />
                    <strong>{t.sides[v]}</strong>
                    <small>{v === 'double' ? t.sidedHint.double.replace('{pct}', String(Math.round((1 - PRINT.doubleSidedFactor) * 100))) : t.sidedHint.single}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="opt-block">
              <span className="opt-label" id="lbl-fin">{t.opt.finishing}</span>
              <div className="fin-chips" role="radiogroup" aria-labelledby="lbl-fin">
                {FINISHING.map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={opt.finishing === v} className={`fin-chip ${opt.finishing === v ? 'on' : ''}`} onClick={() => set('finishing')(v)} data-testid={`opt-${v}`}>
                    {FIN_ICON[v]} <span>{t.finishing[v]}</span>
                    {v !== 'none' && <small>+{fmtMoney(PRINT.finishing[v].perPage || PRINT.finishing[v].perSet, locale)}{PRINT.finishing[v].perPage ? `/${t.pageOne}` : ''}</small>}
                  </button>
                ))}
              </div>
            </div>

            <div className="opt-block opt-row">
              <span className="opt-label" id="lbl-copies">{t.opt.copies}</span>
              <div className="qty qty-lg" aria-labelledby="lbl-copies">
                <button type="button" onClick={() => set('copies')(Math.max(1, opt.copies - 1))} aria-label="−">−</button>
                <input type="number" min="1" max={PRINT.limits.maxCopies} value={opt.copies} onChange={(e) => set('copies')(Math.max(1, Math.min(PRINT.limits.maxCopies, Number(e.target.value) || 1)))} aria-label={t.opt.copies} data-testid="copies" />
                <button type="button" onClick={() => set('copies')(Math.min(PRINT.limits.maxCopies, opt.copies + 1))} aria-label="+">+</button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="print-note">{t.noteLabel}</label>
              <textarea id="print-note" className="input" rows={3} maxLength={500} placeholder={t.noteHint} value={opt.note} onChange={(e) => set('note')(e.target.value)} />
            </div>
          </section>
        )}

        {/* ---- step 3: collect or delivery ---- */}
        {step === 3 && (
          <section className="print-step" aria-labelledby="ph-ful">
            <h2 id="ph-ful" className="print-h2">{t.fulfilTitle}</h2>
            <div className="choice-grid two ful" role="radiogroup" aria-label={t.fulfilTitle}>
              {FULFILMENT.map((v) => (
                <button key={v} type="button" role="radio" aria-checked={opt.fulfilment === v} className={`choice ${opt.fulfilment === v ? 'on' : ''}`} onClick={() => set('fulfilment')(v)} data-testid={`fulfil-${v}`}>
                  <span className="choice-emoji" aria-hidden="true">{v === 'collect' ? '🏪' : '🛵'}</span>
                  <strong>{t.fulfil[v]}</strong>
                  <small>{v === 'collect' ? t.fulfilCollectNote.replace('{hours}', String(PRINT.pickup.readyInHours)) : `${fmtMoney(PRINT.delivery.fee, locale)} · ${t.fulfilDeliveryNote}`}</small>
                </button>
              ))}
            </div>
            <div className="review">
              <h3>{t.reviewTitle}</h3>
              <ul className="review-list">
                <li><span>{t.filesTitle}</span><strong>{readyFiles.map((f) => f.name).join(', ')}</strong></li>
                <li><span>{t.opt.size} · {t.opt.color} · {t.opt.sided}</span><strong>{quote.size} · {t.colors[quote.color]} · {t.sides[quote.sided]}</strong></li>
                <li><span>{t.opt.copies} · {t.opt.finishing}</span><strong>{quote.copies} · {t.finishing[quote.finishing]}</strong></li>
                {opt.note && <li><span>{t.noteLabel}</span><strong>{opt.note}</strong></li>}
              </ul>
              <button type="button" className="pdp-link" onClick={() => goto(2)}>{t.steps.edit}</button>
            </div>
            {submitError && <p className="form-err" role="alert">{submitError}</p>}
            {!live && <p className="field-note">{t.demoNote}</p>}
          </section>
        )}

        {step > 1 && (
          <button type="button" className="btn btn-ghost btn-sm step-back" onClick={() => goto(step - 1)} data-testid="step-back">← {t.steps.back}</button>
        )}
      </div>

      {/* ---- price: sticky card (desktop) / sticky bottom bar + expandable breakdown (phone) ---- */}
      <aside className={`print-quote ${quoteOpen ? 'open' : ''}`} aria-labelledby="ph-quote">
        <button type="button" className="quote-veil" aria-hidden="true" tabIndex={-1} onClick={() => setQuoteOpen(false)} />
        <div className="quote-panel" id="quote-panel">
          <h2 id="ph-quote" className="print-h2 quote-title">{t.quote.title}</h2>
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
            </div>
          )}
          <p className="field-note">{t.quote.note.replace('{min}', fmtMoney(PRINT.minimumOrder, locale))} {t.quote.rates}</p>
        </div>
        <div className="print-bar">
          <button type="button" className="bar-total" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen} aria-controls="quote-panel">
            <small>{t.quote.total} <span className="bar-caret" aria-hidden="true">{quoteOpen ? '▾' : '▴'}</span></small>
            <strong data-testid="sticky-total">{fmtMoney(quote.total, locale)}</strong>
          </button>
          <button type="button" className="btn btn-primary bar-cta" disabled={!canContinue} onClick={onPrimary} data-testid={step < 3 ? 'step-next' : 'print-submit'}>
            {primaryLabel}{step < 3 ? ' →' : ''}
          </button>
        </div>
      </aside>
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
