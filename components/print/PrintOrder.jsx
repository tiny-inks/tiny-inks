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

/* ---------- little illustrations (inline SVG, brand colours only) ---------- */
const PaperIcon = ({ size }) => (
  <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
    {size === 'A3' ? (
      <rect x="10" y="6" width="44" height="52" rx="3" fill="#fff" stroke="currentColor" strokeWidth="2" />
    ) : (
      <rect x="18" y="14" width="28" height="36" rx="2.5" fill="#fff" stroke="currentColor" strokeWidth="2" />
    )}
    <text x="32" y={size === 'A3' ? 37 : 36} textAnchor="middle" fontSize={size === 'A3' ? 14 : 11} fontWeight="800" fill="currentColor" fontFamily="inherit">{size}</text>
  </svg>
);
const SwatchIcon = ({ colour }) => (
  <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
    {colour ? (
      <>
        <rect x="6" y="6" width="24" height="24" rx="6" fill="#fe626c" />
        <rect x="34" y="6" width="24" height="24" rx="6" fill="#F7CD7B" />
        <rect x="6" y="34" width="24" height="24" rx="6" fill="#ADC4CA" />
        <rect x="34" y="34" width="24" height="24" rx="6" fill="#79A09F" />
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
  <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
    <rect x={double ? 8 : 18} y="10" width="28" height="38" rx="2.5" fill="#fff" stroke="currentColor" strokeWidth="2" />
    <path d={double ? 'M14 20h16M14 26h16M14 32h10' : 'M24 20h16M24 26h16M24 32h10'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {double && (
      <>
        <rect x="28" y="18" width="28" height="38" rx="2.5" fill="#F3DFC4" stroke="currentColor" strokeWidth="2" />
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

function OptionCard({ active, onClick, testId, children }) {
  return (
    <button
      type="button" role="radio" aria-checked={active} onClick={onClick} data-testid={testId}
      className={`group relative flex flex-col items-start gap-1 rounded-2xl border-2 px-4 py-3.5 text-start transition-all duration-300 ${active ? 'border-ink bg-ink text-white shadow-sm' : 'border-border bg-card hover:-translate-y-0.5 hover:border-coral'}`}
    >
      {children}
    </button>
  );
}
function Group({ title, id, children }) {
  return (
    <div className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <span id={id} className="eyebrow-new">{title}</span>
      <div className="mt-4">{children}</div>
    </div>
  );
}

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
    <div ref={topRef} className="grid gap-10 pb-28 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16 lg:pb-0">
      <div>
        {/* ---- stepper ---- */}
        <ol className="flex items-center gap-2 sm:gap-3" aria-label={t.steps.label}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n === step ? 'active' : n < step ? 'done' : '';
            return (
              <li key={n} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => { if (n < step || (n > step && filesOk)) goto(n); }}
                  aria-label={`${t.steps.step} ${n}: ${label}`}
                  aria-current={n === step ? 'step' : undefined}
                  data-testid={`step-${n}`}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold transition-colors ${state === 'active' ? 'bg-ink text-white' : state === 'done' ? 'bg-sage text-ink' : 'border-2 border-border bg-card text-muted-foreground'}`}
                >
                  {n < step ? <Check className="h-4 w-4" /> : n}
                </button>
                <span className={`hidden text-xs font-bold sm:inline ${n === step ? 'text-ink' : 'text-muted-foreground'}`}>{label}</span>
                {n < STEPS.length && <span className="h-0.5 flex-1 rounded bg-border" />}
              </li>
            );
          })}
        </ol>

        {/* ---- step 1: upload ---- */}
        {step === 1 && (
          <section aria-labelledby="ph-files" className="mt-8">
            <h2 id="ph-files" className="eyebrow-new">{t.filesTitle}</h2>
            {storage && storage.mode !== 'blob' && (
              <div role="status" className="mt-4 rounded-2xl bg-sun/60 p-4 text-sm text-ink"><strong>{t.storageWarnTitle}</strong> {t.storageWarn}</div>
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
              className={`mt-4 cursor-pointer rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all duration-300 ${drag ? 'border-coral bg-blush' : 'border-border bg-card hover:border-coral'}`}
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
          </section>
        )}

        {/* ---- step 2: options ---- */}
        {step === 2 && (
          <section aria-labelledby="ph-opts" className="mt-8 space-y-6">
            <h2 id="ph-opts" className="sr-only">{t.optionsTitle}</h2>

            <Group id="lbl-size" title={t.opt.size}>
              <div role="radiogroup" aria-labelledby="lbl-size" className="grid grid-cols-2 gap-3">
                {SIZES.map((v) => (
                  <OptionCard key={v} active={opt.size === v} onClick={() => set('size')(v)} testId={`opt-${v}`}>
                    <PaperIcon size={v} />
                    <strong className="mt-1 text-sm font-semibold">{v}</strong>
                    <small className={`text-[0.68rem] ${opt.size === v ? 'text-white/65' : 'text-muted-foreground'}`}>{t.sizeHint[v]}</small>
                  </OptionCard>
                ))}
              </div>
            </Group>

            <Group id="lbl-color" title={t.opt.color}>
              <div role="radiogroup" aria-labelledby="lbl-color" className="grid grid-cols-2 gap-3">
                {COLORS.map((v) => (
                  <OptionCard key={v} active={opt.color === v} onClick={() => set('color')(v)} testId={`opt-${v}`}>
                    <SwatchIcon colour={v === 'colour'} />
                    <strong className="mt-1 text-sm font-semibold">{t.colors[v]}</strong>
                    <small className={`text-[0.68rem] ${opt.color === v ? 'text-white/65' : 'text-muted-foreground'}`}>{fmtMoney(PRINT.perPage[opt.size][v], locale)} / {t.pageOne}</small>
                  </OptionCard>
                ))}
              </div>
            </Group>

            <Group id="lbl-sided" title={t.opt.sided}>
              <div role="radiogroup" aria-labelledby="lbl-sided" className="grid grid-cols-2 gap-3">
                {SIDES.map((v) => (
                  <OptionCard key={v} active={opt.sided === v} onClick={() => set('sided')(v)} testId={`opt-${v}`}>
                    <SidedIcon double={v === 'double'} />
                    <strong className="mt-1 text-sm font-semibold">{t.sides[v]}</strong>
                    <small className={`text-[0.68rem] ${opt.sided === v ? 'text-white/65' : 'text-muted-foreground'}`}>{v === 'double' ? t.sidedHint.double.replace('{pct}', String(Math.round((1 - PRINT.doubleSidedFactor) * 100))) : t.sidedHint.single}</small>
                  </OptionCard>
                ))}
              </div>
            </Group>

            <Group id="lbl-fin" title={t.opt.finishing}>
              <div role="radiogroup" aria-labelledby="lbl-fin" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FINISHING.map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={opt.finishing === v} onClick={() => set('finishing')(v)} data-testid={`opt-${v}`}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3.5 text-center transition-all duration-300 ${opt.finishing === v ? 'border-ink bg-ink text-white' : 'border-border bg-card hover:-translate-y-0.5 hover:border-coral'}`}>
                    {FIN_ICON[v]}
                    <span className="text-xs font-semibold">{t.finishing[v]}</span>
                    {v !== 'none' && <small className={`text-[0.62rem] ${opt.finishing === v ? 'text-white/65' : 'text-muted-foreground'}`}>+{fmtMoney(PRINT.finishing[v].perPage || PRINT.finishing[v].perSet, locale)}{PRINT.finishing[v].perPage ? `/${t.pageOne}` : ''}</small>}
                  </button>
                ))}
              </div>
            </Group>

            <Group id="lbl-copies" title={t.opt.copies}>
              <div aria-labelledby="lbl-copies" className="flex items-center gap-1 rounded-full border-[1.5px] border-ink px-2 py-1.5" style={{ width: 'fit-content' }}>
                <button type="button" onClick={() => set('copies')(Math.max(1, opt.copies - 1))} aria-label="−" className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary">−</button>
                <input type="number" min="1" max={PRINT.limits.maxCopies} value={opt.copies} onChange={(e) => set('copies')(Math.max(1, Math.min(PRINT.limits.maxCopies, Number(e.target.value) || 1)))} aria-label={t.opt.copies} data-testid="copies" className="w-12 border-none bg-transparent text-center font-display text-base outline-none" />
                <button type="button" onClick={() => set('copies')(Math.min(PRINT.limits.maxCopies, opt.copies + 1))} aria-label="+" className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary">+</button>
              </div>
            </Group>

            <label className="block border-t border-border pt-6">
              <span className="label-xs">{t.noteLabel}</span>
              <textarea id="print-note" rows={3} maxLength={500} placeholder={t.noteHint} value={opt.note} onChange={(e) => set('note')(e.target.value)} className="mt-2 w-full resize-none rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-coral" />
            </label>
          </section>
        )}

        {/* ---- step 3: collect or delivery ---- */}
        {step === 3 && (
          <section aria-labelledby="ph-ful" className="mt-8">
            <h2 id="ph-ful" className="eyebrow-new">{t.fulfilTitle}</h2>
            <div role="radiogroup" aria-label={t.fulfilTitle} className="mt-4 grid gap-3 sm:grid-cols-2">
              {FULFILMENT.map((v) => (
                <OptionCard key={v} active={opt.fulfilment === v} onClick={() => set('fulfilment')(v)} testId={`fulfil-${v}`}>
                  <span className="text-xl" aria-hidden="true">{v === 'collect' ? '🏪' : '🛵'}</span>
                  <strong className="mt-1 text-sm font-semibold">{t.fulfil[v]}</strong>
                  <small className={`text-[0.68rem] ${opt.fulfilment === v ? 'text-white/65' : 'text-muted-foreground'}`}>{v === 'collect' ? t.fulfilCollectNote.replace('{hours}', String(PRINT.pickup.readyInHours)) : `${fmtMoney(PRINT.delivery.fee, locale)} · ${t.fulfilDeliveryNote}`}</small>
                </OptionCard>
              ))}
            </div>
            <div className="mt-6 rounded-3xl border border-border bg-card p-6">
              <h3 className="eyebrow-new">{t.reviewTitle}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between gap-4 border-b border-border/70 pb-2"><span className="text-muted-foreground">{t.filesTitle}</span><strong className="text-end">{readyFiles.map((f) => f.name).join(', ')}</strong></li>
                <li className="flex justify-between gap-4 border-b border-border/70 pb-2"><span className="text-muted-foreground">{t.opt.size} · {t.opt.color} · {t.opt.sided}</span><strong>{quote.size} · {t.colors[quote.color]} · {t.sides[quote.sided]}</strong></li>
                <li className="flex justify-between gap-4"><span className="text-muted-foreground">{t.opt.copies} · {t.opt.finishing}</span><strong>{quote.copies} · {t.finishing[quote.finishing]}</strong></li>
                {opt.note && <li className="flex justify-between gap-4 border-t border-border/70 pt-2"><span className="text-muted-foreground">{t.noteLabel}</span><strong>{opt.note}</strong></li>}
              </ul>
              <button type="button" onClick={() => goto(2)} className="mt-3 text-xs font-extrabold uppercase tracking-[0.1em] text-coral underline underline-offset-4">{t.steps.edit}</button>
            </div>
            {submitError && <p role="alert" className="mt-4 rounded-2xl bg-blush/60 p-3 text-sm text-ink">{submitError}</p>}
            {!live && <p className="mt-3 text-xs text-muted-foreground">{t.demoNote}</p>}
          </section>
        )}

        {step > 1 && (
          <button type="button" onClick={() => goto(step - 1)} data-testid="step-back" className="mt-6 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground underline underline-offset-4">← {t.steps.back}</button>
        )}
      </div>

      {/* ---- price: sticky card (desktop) / sticky bottom bar + expandable breakdown (phone) ---- */}
      <aside aria-labelledby="ph-quote" className="lg:sticky lg:top-28 lg:h-fit">
        <div className={`fixed inset-x-0 bottom-0 z-40 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card px-5 pb-5 pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 lg:static lg:max-h-none lg:translate-y-0 lg:rounded-3xl lg:border lg:p-8 lg:shadow-sm ${quoteOpen ? 'translate-y-0' : 'translate-y-[calc(100%-84px)] lg:translate-y-0'}`}>
          <button type="button" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen} aria-controls="quote-panel" className="flex w-full items-center justify-between gap-3 lg:hidden">
            <small className="label-xs">{t.quote.total} <span aria-hidden="true">{quoteOpen ? '▾' : '▴'}</span></small>
            <strong data-testid="sticky-total" className="font-display text-lg tabular-nums">{fmtMoney(quote.total, locale)}</strong>
          </button>
          <div id="quote-panel">
            <h2 id="ph-quote" className="eyebrow-new hidden lg:block">{t.quote.title}</h2>
            {quote.empty ? (
              <p className="mt-4 text-sm text-muted-foreground">{t.quote.empty}</p>
            ) : (
              <dl data-testid="quote" className="mt-4 space-y-2 text-sm">
                {quote.lines.map((l, i) => (
                  <div key={i} data-line={l.key} className="flex justify-between gap-3 border-b border-border/70 pb-2">
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
          <button type="button" disabled={!canContinue} onClick={onPrimary} data-testid={step < 3 ? 'step-next' : 'print-submit'} className="mt-5 w-full rounded-full bg-ink py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral disabled:cursor-not-allowed disabled:opacity-40">
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
