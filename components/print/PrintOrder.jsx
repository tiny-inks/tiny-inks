'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, FileText, Upload, X } from 'lucide-react';
import { useCart } from '../CartContext';
import { lineLabel } from './PrintConfirmation';
import { PRINT, SIZES, COLORS, SIDES, FINISHING, FULFILMENT, computeQuote, buildCartLines, jobAttributes, fmtMoney } from '@/lib/print';
import { fileKind, countPdfPages, pdfThumbnail, storageStatus, uploadFile } from '@/lib/print-client';

let uid = 0;
const fmtBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

function Step({ n, title, stepWord, children }) {
  return (
    <div className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <span className="eyebrow-new">{`${stepWord} ${String(n).padStart(2, '0')} — ${title}`}</span>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function OptionRow({ active, onClick, testId, disabled, children }) {
  return (
    <button
      type="button" role="radio" aria-checked={active} onClick={onClick} disabled={disabled} data-testid={testId}
      className={`flex flex-1 flex-col items-start gap-0.5 rounded-2xl border-2 px-4 py-3.5 text-start transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-ink bg-ink text-white shadow-sm' : 'border-border bg-card hover:-translate-y-0.5 hover:border-coral'}`}
    >
      {children}
    </button>
  );
}

export default function PrintOrder({ dict, locale, live, business }) {
  const t = dict.print;
  const router = useRouter();
  const cart = useCart();
  const inputRef = useRef(null);
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

  const set = (k) => (v) => setOpt((o) => ({ ...o, [k]: v }));
  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); };

  const submit = async () => {
    if (!filesOk) {
      if (files.length === 0) inputRef.current?.click();
      return;
    }
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

  return (
    <div className="grid gap-10 pb-28 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16 lg:pb-0">
      <div className="space-y-6">
        {/* ---- 01: upload ---- */}
        <Step n={1} title={t.filesTitle} stepWord={t.steps.step}>
          {storage && storage.mode !== 'blob' && (
            <div role="status" className="mb-4 rounded-2xl bg-sun/60 p-4 text-sm text-ink"><strong>{t.storageWarnTitle}</strong> {t.storageWarn}</div>
          )}
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
            role="button"
            tabIndex={0}
            aria-label={t.dropLabel}
            className={`cursor-pointer rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all duration-300 ${drag ? 'border-coral bg-blush' : 'border-border bg-card hover:border-coral'}`}
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
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sun text-ink"><Upload className="h-6 w-6" strokeWidth={1.4} /></div>
            <p className="mt-5 font-display text-2xl font-bold">{t.dropTitle}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t.dropHint}</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            🔒 {t.privacyShort} <Link href={`/${locale}/policies/privacy`} className="font-bold text-coral">{dict.policies.privacy}</Link>
          </p>

          {files.length > 0 && (
            <ul className="mt-4 space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="grid h-11 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary" aria-hidden="true">
                    {f.thumb ? <img src={f.thumb} alt="" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4 text-sage" strokeWidth={1.4} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{f.name}</strong>
                    <span className="text-xs text-muted-foreground">{fmtBytes(f.size)}</span>
                    {f.status === 'checking' && <span className="ms-2 text-xs text-muted-foreground">{t.status.checking}</span>}
                    {f.status === 'uploading' && (
                      <span className="ms-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary"><span className="block h-full bg-coral" style={{ width: `${f.progress}%` }} /></span> {f.progress}%
                      </span>
                    )}
                    {f.status === 'error' && <span role="alert" className="ms-2 text-xs text-destructive">{t.errors[f.error] || t.errors.upload_failed}</span>}
                    {f.status === 'ready' && (
                      f.manualPages ? (
                        <label className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t.pagesManual}</span>
                          <input type="number" min="1" max="2000" inputMode="numeric" value={f.pages ?? ''} onChange={(e) => patchFile(f.id, { pages: Number(e.target.value) || 0 })} aria-label={`${t.pagesManual}: ${f.name}`} className="w-16 rounded-lg border border-border px-2 py-1 text-xs outline-none focus:border-coral" />
                          <small className="text-[0.65rem] text-muted-foreground">{t.pagesManualNote}</small>
                        </label>
                      ) : (
                        <span className="ms-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold"><b data-testid="page-count">{f.pages}</b> {t.pagesShort}</span>
                      )
                    )}
                  </div>
                  <button type="button" onClick={() => remove(f.id)} aria-label={`${t.remove}: ${f.name}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-secondary">
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {needsPages && <p className="mt-3 text-sm text-destructive">{t.errors.needPages}</p>}
        </Step>

        {/* ---- 02: size ---- */}
        <Step n={2} title={t.opt.size} stepWord={t.steps.step}>
          <div role="radiogroup" aria-label={t.opt.size} className="grid grid-cols-2 gap-3">
            {SIZES.map((v) => (
              <OptionRow key={v} active={opt.size === v} onClick={() => set('size')(v)} testId={`opt-${v}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold">{opt.size === v && <Check className="h-3.5 w-3.5" strokeWidth={2.4} />} {v}</span>
                <small className={`text-[0.68rem] ${opt.size === v ? 'text-white/65' : 'text-muted-foreground'}`}>{t.sizeHint[v]}</small>
              </OptionRow>
            ))}
          </div>
        </Step>

        {/* ---- 03: colour ---- */}
        <Step n={3} title={t.opt.color} stepWord={t.steps.step}>
          <div role="radiogroup" aria-label={t.opt.color} className="grid grid-cols-2 gap-3">
            {COLORS.map((v) => (
              <OptionRow key={v} active={opt.color === v} onClick={() => set('color')(v)} testId={`opt-${v}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold">{opt.color === v && <Check className="h-3.5 w-3.5" strokeWidth={2.4} />} {t.colors[v]}</span>
                <small className={`text-[0.68rem] ${opt.color === v ? 'text-white/65' : 'text-muted-foreground'}`}>{fmtMoney(PRINT.perPage[opt.size][v], locale)} / {t.pageOne}</small>
              </OptionRow>
            ))}
          </div>
        </Step>

        {/* ---- 04: sides ---- */}
        <Step n={4} title={t.opt.sided} stepWord={t.steps.step}>
          <div role="radiogroup" aria-label={t.opt.sided} className="grid grid-cols-2 gap-3">
            {SIDES.map((v) => (
              <OptionRow key={v} active={opt.sided === v} onClick={() => set('sided')(v)} testId={`opt-${v}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold">{opt.sided === v && <Check className="h-3.5 w-3.5" strokeWidth={2.4} />} {t.sides[v]}</span>
                <small className={`text-[0.68rem] ${opt.sided === v ? 'text-white/65' : 'text-muted-foreground'}`}>{v === 'double' ? t.sidedHint.double.replace('{pct}', String(Math.round((1 - PRINT.doubleSidedFactor) * 100))) : t.sidedHint.single}</small>
              </OptionRow>
            ))}
          </div>
        </Step>

        {/* ---- 05: finishing ---- */}
        <Step n={5} title={t.opt.finishing} stepWord={t.steps.step}>
          <div role="radiogroup" aria-label={t.opt.finishing} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FINISHING.map((v) => (
              <OptionRow key={v} active={opt.finishing === v} onClick={() => set('finishing')(v)} testId={`opt-${v}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold">{opt.finishing === v && <Check className="h-3.5 w-3.5" strokeWidth={2.4} />} {t.finishing[v]}</span>
                {v !== 'none' && <small className={`text-[0.62rem] ${opt.finishing === v ? 'text-white/65' : 'text-muted-foreground'}`}>+{fmtMoney(PRINT.finishing[v].perPage || PRINT.finishing[v].perSet, locale)}{PRINT.finishing[v].perPage ? `/${t.pageOne}` : ''}</small>}
              </OptionRow>
            ))}
          </div>
        </Step>

        {/* ---- 06: copies ---- */}
        <Step n={6} title={t.opt.copies} stepWord={t.steps.step}>
          <div className="flex items-center gap-1 rounded-full border-[1.5px] border-ink px-2 py-1.5" style={{ width: 'fit-content' }}>
            <button type="button" onClick={() => set('copies')(Math.max(1, opt.copies - 1))} aria-label="−" className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary">−</button>
            <input type="number" min="1" max={PRINT.limits.maxCopies} value={opt.copies} onChange={(e) => set('copies')(Math.max(1, Math.min(PRINT.limits.maxCopies, Number(e.target.value) || 1)))} aria-label={t.opt.copies} data-testid="copies" className="w-14 border-none bg-transparent text-center font-display text-base outline-none" />
            <button type="button" onClick={() => set('copies')(Math.min(PRINT.limits.maxCopies, opt.copies + 1))} aria-label="+" className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary">+</button>
          </div>
          {readyFiles.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {readyFiles.reduce((s, f) => s + Number(f.pages || 0), 0)} {t.pagesShort} × {opt.copies} = {readyFiles.reduce((s, f) => s + Number(f.pages || 0), 0) * opt.copies} {t.pagesShort.includes('page') ? 'sheets' : t.pagesShort}
            </p>
          )}
        </Step>

        {/* ---- 07: collection ---- */}
        <Step n={7} title={t.fulfilTitle} stepWord={t.steps.step}>
          <div role="radiogroup" aria-label={t.fulfilTitle} className="grid gap-3 sm:grid-cols-2">
            {FULFILMENT.map((v) => (
              <OptionRow key={v} active={opt.fulfilment === v} onClick={() => set('fulfilment')(v)} testId={`fulfil-${v}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold">{opt.fulfilment === v && <Check className="h-3.5 w-3.5" strokeWidth={2.4} />} {t.fulfil[v]}</span>
                <small className={`text-[0.68rem] ${opt.fulfilment === v ? 'text-white/65' : 'text-muted-foreground'}`}>{v === 'collect' ? t.fulfilCollectNote.replace('{hours}', String(PRINT.pickup.readyInHours)) : `${fmtMoney(PRINT.delivery.fee, locale)} · ${t.fulfilDeliveryNote}`}</small>
              </OptionRow>
            ))}
          </div>
        </Step>

        {/* ---- 08: notes ---- */}
        <Step n={8} title={t.noteLabel} stepWord={t.steps.step}>
          <textarea rows={3} maxLength={500} placeholder={t.noteHint} value={opt.note} onChange={(e) => set('note')(e.target.value)} className="w-full resize-none rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-coral" />
        </Step>

        {submitError && <p role="alert" className="rounded-2xl bg-blush/60 p-3 text-sm text-ink">{submitError}</p>}
        {!live && <p className="text-xs text-muted-foreground">{t.demoNote}</p>}
      </div>

      {/* ---- price: sticky card (desktop) / sticky bottom bar + expandable breakdown (phone) ---- */}
      <aside aria-labelledby="ph-quote" className="lg:sticky lg:top-28 lg:h-fit">
        <div className={`fixed inset-x-0 bottom-0 z-40 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card px-5 pb-5 pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 lg:static lg:max-h-none lg:translate-y-0 lg:rounded-3xl lg:border lg:p-8 lg:shadow-sm ${quoteOpen ? 'translate-y-0' : 'translate-y-[calc(100%-84px)] lg:translate-y-0'}`}>
          <button type="button" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen} aria-controls="quote-panel" className="flex w-full items-center justify-between gap-3 lg:hidden">
            <small className="label-xs">{t.quote.total} <span aria-hidden="true">{quoteOpen ? '▾' : '▴'}</span></small>
            <strong data-testid="sticky-total" className="font-display text-lg tabular-nums">{fmtMoney(quote.total, locale)}</strong>
          </button>
          <div id="quote-panel">
            <span id="ph-quote" className="eyebrow-new hidden lg:block">{t.quote.title}</span>
            <p className="hidden font-display text-3xl tabular-nums lg:mt-2 lg:block">{fmtMoney(quote.total, locale)}</p>
            {quote.empty ? (
              <p className="mt-4 text-sm text-muted-foreground">{t.quote.empty}</p>
            ) : (
              <dl data-testid="quote" className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between border-b border-border/70 pb-2"><dt className="text-muted-foreground">{t.opt.size}</dt><dd className="font-medium">{quote.size}</dd></div>
                <div className="flex justify-between border-b border-border/70 pb-2"><dt className="text-muted-foreground">{t.opt.color}</dt><dd className="font-medium">{t.colors[quote.color]}</dd></div>
                <div className="flex justify-between border-b border-border/70 pb-2"><dt className="text-muted-foreground">{t.opt.sided}</dt><dd className="font-medium">{t.sides[quote.sided]}</dd></div>
                <div className="flex justify-between border-b border-border/70 pb-2"><dt className="text-muted-foreground">{t.opt.finishing}</dt><dd className="font-medium">{t.finishing[quote.finishing]}</dd></div>
                <div className="flex justify-between border-b border-border/70 pb-2"><dt className="text-muted-foreground">{t.pagesShort} × {t.opt.copies}</dt><dd className="font-medium">{quote.pages || 0} × {quote.copies}</dd></div>
                <div className="flex justify-between border-b border-border/70 pb-2"><dt className="text-muted-foreground">{t.fulfilTitle}</dt><dd className="font-medium">{t.fulfil[quote.fulfilment]}</dd></div>
                {quote.lines.map((l, i) => (
                  <div key={i} data-line={l.key} className="flex justify-between gap-3 pt-1">
                    <dt className={l.amount < 0 ? 'text-sage' : 'text-muted-foreground'}>{lineLabel(l, t)}</dt><dd data-testid={`line-${l.key}`} className="font-medium tabular-nums">{fmtMoney(l.amount, locale)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-3 text-base">
                  <dt className="font-semibold">{t.quote.total}</dt><dd data-testid="quote-total" className="font-display font-semibold tabular-nums">{fmtMoney(quote.total, locale)}</dd>
                </div>
              </dl>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t.quote.note.replace('{min}', fmtMoney(PRINT.minimumOrder, locale))} {t.quote.rates}</p>
          </div>
          <button type="button" disabled={submitting} onClick={submit} data-testid="print-submit" className="mt-5 w-full rounded-full bg-ink py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral disabled:cursor-not-allowed disabled:opacity-40">
            {submitting ? t.submitting : live ? t.submitLive : t.submitDemo}
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
