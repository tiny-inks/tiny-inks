'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, LocateFixed, ShoppingBag } from 'lucide-react';
import { useCart } from '../CartContext';

/* On-site checkout: contact → address → delivery method → payment.
   Prices always come from /api/checkout/quote (server recomputes from Shopify);
   the browser only ever sends variant ids + quantities. Payment Element renders
   cards + Apple Pay + Google Pay; 3-D Secure is handled by confirmPayment. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;
const fmt = (fils, locale, currency = 'AED') =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency, minimumFractionDigits: 2 }).format((fils || 0) / 100);

let stripeJsPromise = null;
function loadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (!stripeJsPromise) {
    stripeJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload = () => resolve(window.Stripe);
      s.onerror = () => { stripeJsPromise = null; reject(new Error('stripe_js')); };
      document.head.appendChild(s);
    });
  }
  return stripeJsPromise;
}
const codKey = () => {
  try {
    let k = sessionStorage.getItem('ti_cod_key');
    if (!k) { k = `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`; sessionStorage.setItem('ti_cod_key', k); }
    return k;
  } catch { return `k${Date.now().toString(36)}fallback`; }
};

const field = 'mt-2 w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-coral';

export default function CheckoutClient({ dict, locale, business }) {
  const t = dict.checkout;
  const router = useRouter();
  const cart = useCart();
  const topRef = useRef(null);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState(null); // GET /api/checkout/quote
  const [quote, setQuote] = useState(null);
  const [quoteErr, setQuoteErr] = useState(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [method, setMethod] = useState('delivery');
  const [payMethod, setPayMethod] = useState('card');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState({});
  const [geo, setGeo] = useState('idle');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [stripeReady, setStripeReady] = useState(false);
  const stripeRef = useRef({});

  const d = cart.delivery;
  useEffect(() => { if (d.email && !email) setEmail(d.email); }, [d.email]); // eslint-disable-line

  const items = useMemo(
    () => cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty, attributes: i.attributes || [] })),
    [cart.items]
  );
  const hasPrintDelivery = cart.items.some((i) => /print-delivery/.test(i.variantId || ''));
  useEffect(() => { if (hasPrintDelivery) setMethod('delivery'); }, [hasPrintDelivery]);

  /* payment options offered by this deployment */
  useEffect(() => {
    fetch('/api/checkout/quote').then((r) => r.json()).then((j) => {
      setStatus(j);
      if (!j.stripe) setPayMethod('cod');
    }).catch(() => setStatus({ stripe: false, cod: true }));
  }, []);

  /* server-priced quote — refreshed whenever the basket or method changes */
  const refreshQuote = useCallback(async () => {
    if (!items.length) { setQuote(null); return; }
    try {
      const r = await fetch('/api/checkout/quote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, method }),
      });
      const j = await r.json();
      if (r.ok && j.ok) { setQuote(j); setQuoteErr(null); }
      else setQuoteErr(j);
    } catch { setQuoteErr({ error: 'network' }); }
  }, [items, method]);
  useEffect(() => { refreshQuote(); }, [refreshQuote]);

  const contactErrs = {
    name: touched.name && !d.name.trim() ? t.required : '',
    email: touched.email && !EMAIL_RE.test(email.trim()) ? t.emailInvalid : '',
    phone: touched.phone && !PHONE_RE.test(d.phone.trim()) ? t.phoneInvalid : '',
  };
  const contactOk = d.name.trim() && EMAIL_RE.test(email.trim()) && PHONE_RE.test(d.phone.trim());
  const addressOk = method === 'collect' || d.address.trim().length > 5;

  const setD = (k) => (e) => cart.setDelivery({ ...d, [k]: e.target.value });
  const blur = (k) => () => setTouched((s) => ({ ...s, [k]: true }));

  const locate = () => {
    if (!('geolocation' in navigator)) { setGeo('unsupported'); return; }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude.toFixed(6), lon = coords.longitude.toFixed(6);
        let line = '';
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=${locale}`, { headers: { Accept: 'application/json' } });
          const j = await r.json();
          const a = j.address || {};
          line = [a.building || a.house_number, a.road, a.neighbourhood || a.suburb, a.city || a.town || a.state, a.country].filter(Boolean).join(', ') || j.display_name || '';
        } catch {}
        const mapLink = `https://maps.google.com/?q=${lat},${lon}`;
        cart.setDelivery({ ...d, address: line ? `${line}\n${mapLink}` : mapLink, lat, lon });
        setGeo('done');
      },
      (err) => setGeo(err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const goto = (n) => { setStep(n); setQuoteOpen(false); setPayError(''); setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };

  const payloadBody = () => ({
    items, method,
    contact: { name: d.name.trim(), email: email.trim(), phone: d.phone.trim() },
    address: { line: d.address.trim(), lat: d.lat, lon: d.lon },
    note, locale,
  });

  /* ---- step 4: mount the Payment Element ---- */
  const mountPayment = useCallback(async () => {
    setPayError('');
    setStripeReady(false);
    try {
      const r = await fetch('/api/checkout/intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody()),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setPayError(j.error === 'items' ? issueText(j.issues, t) : t.errors[j.error] || t.errors.intent_failed);
        return;
      }
      const Stripe = await loadStripeJs();
      const stripe = Stripe(status.publishableKey);
      const elements = stripe.elements({
        clientSecret: j.clientSecret,
        locale: locale === 'ar' ? 'ar' : 'en',
        appearance: {
          variables: {
            colorPrimary: '#fe626c', colorText: '#133155', colorBackground: '#ffffff',
            borderRadius: '16px', fontFamily: 'inherit',
          },
        },
      });
      const paymentElement = elements.create('payment', { layout: 'tabs' });
      paymentElement.mount('#payment-element');
      paymentElement.on('ready', () => setStripeReady(true));
      stripeRef.current = { stripe, elements, pi: j.paymentIntentId, amountFils: j.amountFils };
    } catch (e) {
      console.error(e);
      setPayError(t.errors.network);
    }
  }, [items, method, email, note, d, status, locale]); // eslint-disable-line

  useEffect(() => {
    if (step === 4 && payMethod === 'card' && status?.stripe) mountPayment();
  }, [step, payMethod, status?.stripe]); // eslint-disable-line

  const payCard = async () => {
    const { stripe, elements } = stripeRef.current;
    if (!stripe || !elements) return;
    setPaying(true); setPayError('');
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/${locale}/order/confirmed` },
    });
    /* only reached on immediate failure (declines, validation) — success redirects */
    if (error) {
      setPayError(error.type === 'card_error' ? error.message : t.errors.payment_failed);
      setPaying(false);
      refreshQuote();
    }
  };

  const placeCod = async () => {
    setPaying(true); setPayError('');
    try {
      const r = await fetch('/api/checkout/cod', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: codKey(), ...payloadBody() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setPayError(j.error === 'items' ? issueText(j.issues, t) : t.errors[j.error] || t.errors.order_failed);
        setPaying(false);
        return;
      }
      cart.clearCart();
      try { sessionStorage.removeItem('ti_cod_key'); } catch {}
      router.push(`/${locale}/order/confirmed?cod=${encodeURIComponent(j.orderName)}`);
    } catch {
      setPayError(t.errors.network);
      setPaying(false);
    }
  };

  /* ---- empty basket ---- */
  if (cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center py-20 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-sun text-ink"><ShoppingBag className="h-7 w-7" strokeWidth={1.6} /></div>
        <h3 className="display-md mt-6">{t.empty}</h3>
        <Link href={`/${locale}/shop`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral">{dict.cartUi.emptyCta}</Link>
      </div>
    );
  }

  const canContinue = step === 1 ? contactOk : step === 2 ? addressOk : step === 3 ? !!quote : false;
  const STEPS = [t.steps.contact, t.steps.address, t.steps.method, t.steps.payment];

  return (
    <div ref={topRef} className="grid gap-10 pb-28 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:pb-0">
      <div>
        <ol className="flex items-center gap-2 sm:gap-3" aria-label={t.steps.label}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n === step ? 'active' : n < step ? 'done' : '';
            return (
              <li key={n} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => { if (n < step) goto(n); }}
                  aria-label={`${t.steps.step} ${n}: ${label}`}
                  aria-current={n === step ? 'step' : undefined}
                  data-testid={`co-step-${n}`}
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

        {quoteErr?.error === 'items' && (
          <div role="alert" data-testid="stock-issues" className="mt-6 rounded-2xl bg-blush/60 p-4 text-sm text-ink">
            <p>{issueText(quoteErr.issues, t)}</p>
            <Link href={`/${locale}/cart`} className="mt-2 inline-block font-bold underline underline-offset-4">{t.backToCart}</Link>
          </div>
        )}

        {/* ---- 1: contact ---- */}
        {step === 1 && (
          <section aria-labelledby="co-contact" className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 id="co-contact" className="eyebrow-new">{t.contactTitle}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="label-xs">{dict.delivery.name} *</span>
                <input id="co-name" autoComplete="name" value={d.name} onChange={setD('name')} onBlur={blur('name')} aria-invalid={!!contactErrs.name} className={field} />
                {contactErrs.name && <span className="mt-1 block text-xs text-destructive">{contactErrs.name}</span>}
              </label>
              <label className="block">
                <span className="label-xs">{dict.delivery.phone} *</span>
                <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="+971 5x xxx xxxx" value={d.phone} onChange={setD('phone')} onBlur={blur('phone')} aria-invalid={!!contactErrs.phone} className={field} />
                {contactErrs.phone && <span className="mt-1 block text-xs text-destructive">{contactErrs.phone}</span>}
              </label>
              <label className="block sm:col-span-2">
                <span className="label-xs">{dict.delivery.email} *</span>
                <input
                  id="co-email" type="email" inputMode="email" autoComplete="email" dir="ltr"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); cart.setDelivery({ ...d, email: e.target.value }); }}
                  onBlur={blur('email')} aria-invalid={!!contactErrs.email} className={field}
                />
                {contactErrs.email && <span className="mt-1 block text-xs text-destructive">{contactErrs.email}</span>}
                <span className="mt-1.5 block text-xs text-muted-foreground">{t.emailNote}</span>
              </label>
            </div>
          </section>
        )}

        {/* ---- 2: address (Locate me kept) ---- */}
        {step === 2 && (
          <section aria-labelledby="co-addr" className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 id="co-addr" className="eyebrow-new">{t.addressTitle}</h2>
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="co-address" className="label-xs">{dict.delivery.address} {method === 'delivery' ? '*' : ''}</label>
                <button type="button" onClick={locate} disabled={geo === 'locating'} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] transition-colors hover:border-coral disabled:opacity-60">
                  <LocateFixed className="h-3.5 w-3.5" strokeWidth={2} />
                  {geo === 'locating' ? dict.delivery.locating : dict.delivery.locate}
                </button>
              </div>
              <textarea id="co-address" rows={3} autoComplete="street-address" placeholder={dict.delivery.addressHint} value={d.address} onChange={setD('address')} className={`${field} resize-none`} />
              <span role="status" className="mt-1.5 block text-xs text-muted-foreground">
                {geo === 'idle' && dict.delivery.geoNote}
                {geo === 'locating' && dict.delivery.locating}
                {geo === 'done' && dict.delivery.geoDone}
                {geo === 'denied' && dict.delivery.geoDenied}
                {geo === 'error' && dict.delivery.geoError}
                {geo === 'unsupported' && dict.delivery.geoUnsupported}
              </span>
            </div>
            <label className="mt-5 block">
              <span className="label-xs">{t.noteLabel}</span>
              <textarea id="co-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.noteHint} className={`${field} resize-none`} />
            </label>
          </section>
        )}

        {/* ---- 3: delivery method ---- */}
        {step === 3 && (
          <section aria-labelledby="co-method" className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 id="co-method" className="eyebrow-new">{t.methodTitle}</h2>
            <div role="radiogroup" aria-label={t.methodTitle} className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" role="radio" aria-checked={method === 'delivery'} onClick={() => setMethod('delivery')} data-testid="method-delivery"
                className={`rounded-2xl border-2 px-5 py-4 text-start transition-all duration-300 ${method === 'delivery' ? 'border-ink bg-ink text-white' : 'border-border bg-card hover:-translate-y-0.5 hover:border-coral'}`}>
                <span className="mb-1 block text-xl" aria-hidden="true">🛵</span>
                <strong className="block text-sm font-semibold">{t.methodDelivery}</strong>
                <small className={`mt-1 block text-[0.68rem] ${method === 'delivery' ? 'text-white/70' : 'text-muted-foreground'}`}>
                  {quote && quote.method === 'delivery' && quote.deliveryFils === 0 ? t.deliveryFree : t.deliveryFee.replace('{fee}', fmt(quote?.deliveryFils ?? 1500, locale)).replace('{free}', fmt(quote?.freeOverFils ?? 15000, locale))}
                </small>
              </button>
              <button type="button" role="radio" aria-checked={method === 'collect'} onClick={() => !hasPrintDelivery && setMethod('collect')} disabled={hasPrintDelivery} data-testid="method-collect"
                className={`rounded-2xl border-2 px-5 py-4 text-start transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${method === 'collect' ? 'border-ink bg-ink text-white' : 'border-border bg-card hover:-translate-y-0.5 hover:border-coral'}`}>
                <span className="mb-1 block text-xl" aria-hidden="true">🏪</span>
                <strong className="block text-sm font-semibold">{t.methodCollect}</strong>
                <small className={`mt-1 block text-[0.68rem] ${method === 'collect' ? 'text-white/70' : 'text-muted-foreground'}`}>{hasPrintDelivery ? t.printDeliveryLocked : t.collectNote}</small>
              </button>
            </div>
          </section>
        )}

        {/* ---- 4: payment ---- */}
        {step === 4 && (
          <section aria-labelledby="co-pay" className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 id="co-pay" className="eyebrow-new">{t.payTitle}</h2>
            {status && !status.stripe && (
              <div role="status" className="mt-4 rounded-2xl bg-sun/60 p-4 text-sm text-ink">{t.stripeNotConfigured}</div>
            )}
            <div role="radiogroup" aria-label={t.payTitle} className="mt-5 grid gap-3 sm:grid-cols-2">
              {status?.stripe && (
                <button type="button" role="radio" aria-checked={payMethod === 'card'} onClick={() => setPayMethod('card')} data-testid="pay-card"
                  className={`rounded-2xl border-2 px-5 py-4 text-start transition-all duration-300 ${payMethod === 'card' ? 'border-ink bg-ink text-white' : 'border-border bg-card hover:-translate-y-0.5 hover:border-coral'}`}>
                  <strong className="block text-sm font-semibold">{t.payCard}</strong>
                  <small className={`mt-1 block text-[0.68rem] ${payMethod === 'card' ? 'text-white/70' : 'text-muted-foreground'}`}>{t.payCardNote}</small>
                </button>
              )}
              {status?.cod !== false && (
                <button type="button" role="radio" aria-checked={payMethod === 'cod'} onClick={() => setPayMethod('cod')} data-testid="pay-cod"
                  className={`rounded-2xl border-2 px-5 py-4 text-start transition-all duration-300 ${payMethod === 'cod' ? 'border-ink bg-ink text-white' : 'border-border bg-card hover:-translate-y-0.5 hover:border-coral'}`}>
                  <strong className="block text-sm font-semibold">{t.payCod}</strong>
                  <small className={`mt-1 block text-[0.68rem] ${payMethod === 'cod' ? 'text-white/70' : 'text-muted-foreground'}`}>{t.payCodNote}</small>
                </button>
              )}
            </div>

            {payMethod === 'card' && status?.stripe && (
              <div className="mt-6">
                <div id="payment-element" />
                {!stripeReady && !payError && <p aria-busy="true" className="text-xs text-muted-foreground">{t.loadingPayment}</p>}
              </div>
            )}
            {payMethod === 'cod' && <p className="mt-5 text-sm text-muted-foreground">{t.codExplain}</p>}
            {payError && <p role="alert" data-testid="pay-error" className="mt-4 rounded-2xl bg-blush/60 p-3 text-sm text-ink">{payError}</p>}
            <p className="mt-5 text-xs text-muted-foreground">🔒 {t.secureNote}</p>
          </section>
        )}

        {step > 1 && (
          <button type="button" onClick={() => goto(step - 1)} data-testid="co-back" className="mt-6 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground underline underline-offset-4">← {t.steps.back}</button>
        )}
      </div>

      {/* ---- order summary: sticky card (desktop) / fixed bottom bar (mobile) ---- */}
      <aside aria-labelledby="co-sum" className="lg:sticky lg:top-28 lg:h-fit">
        <div className={`fixed inset-x-0 bottom-0 z-40 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card px-5 pb-5 pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 lg:static lg:max-h-none lg:translate-y-0 lg:rounded-3xl lg:border lg:p-8 lg:shadow-sm ${quoteOpen ? 'translate-y-0' : 'translate-y-[calc(100%-84px)] lg:translate-y-0'}`}>
          <button type="button" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen} aria-controls="co-summary" className="flex w-full items-center justify-between gap-3 lg:hidden">
            <small className="label-xs">{t.total} <span aria-hidden="true">{quoteOpen ? '▾' : '▴'}</span></small>
            <strong data-testid="co-sticky-total" className="font-display text-lg tabular-nums">{quote ? fmt(quote.totalFils, locale) : '…'}</strong>
          </button>
          <div id="co-summary">
            <h2 id="co-sum" className="eyebrow-new hidden lg:block">{t.summary}</h2>
            {quote ? (
              <dl data-testid="co-quote" className="mt-4 space-y-2 text-sm">
                {quote.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-3 border-b border-border/70 pb-2">
                    <dt className="text-muted-foreground">{l.title} × {l.qty}</dt><dd className="font-medium tabular-nums">{fmt(l.totalFils, locale)}</dd>
                  </div>
                ))}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.deliveryLine}</dt><dd data-testid="co-delivery" className="font-medium tabular-nums">{quote.deliveryFils === 0 ? t.free : fmt(quote.deliveryFils, locale)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base">
                  <dt className="font-semibold">{t.total}</dt><dd data-testid="co-total" className="font-display font-semibold tabular-nums">{fmt(quote.totalFils, locale)}</dd>
                </div>
                <p className="text-xs text-muted-foreground">{t.vatNote}</p>
              </dl>
            ) : quoteErr ? (
              <p className="mt-4 text-sm text-destructive">{quoteErr.error === 'items' ? issueText(quoteErr.issues, t) : t.errors.network}</p>
            ) : (
              <p aria-busy="true" className="mt-4 text-sm text-muted-foreground">…</p>
            )}
          </div>
          {step < 4 ? (
            <button type="button" disabled={!canContinue} onClick={() => goto(step + 1)} data-testid="co-next" className="mt-5 w-full rounded-full bg-ink py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral disabled:cursor-not-allowed disabled:opacity-40">
              {t.steps.next} →
            </button>
          ) : payMethod === 'cod' ? (
            <button type="button" disabled={paying || !quote} onClick={placeCod} data-testid="co-place-cod" className="mt-5 w-full rounded-full bg-ink py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral disabled:cursor-not-allowed disabled:opacity-40">
              {paying ? t.placing : t.placeCod}
            </button>
          ) : (
            <button type="button" disabled={paying || !stripeReady} onClick={payCard} data-testid="co-pay-now" className="mt-5 w-full rounded-full bg-ink py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral disabled:cursor-not-allowed disabled:opacity-40">
              {paying ? t.placing : `${t.payNow} · ${quote ? fmt(quote.totalFils, locale) : ''}`}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function issueText(issues = [], t) {
  return issues.map((i) => {
    const name = i.title || t.anItem;
    if (i.issue === 'insufficient') return t.errors.insufficient.replace('{title}', name).replace('{qty}', String(i.availableQty ?? 0));
    if (i.issue === 'unavailable') return t.errors.unavailable.replace('{title}', name);
    return t.errors.not_found.replace('{title}', name);
  }).join(' ');
}
