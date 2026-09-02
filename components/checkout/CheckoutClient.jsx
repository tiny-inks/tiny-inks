'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
            colorPrimary: '#C97C5D', colorText: '#26272B', colorBackground: '#ffffff',
            borderRadius: '12px', fontFamily: 'inherit',
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
      <div className="empty" style={{ maxWidth: 560 }}>
        <div className="empty-glyph" aria-hidden="true">✦</div>
        <h3>{t.empty}</h3>
        <Link href={`/${locale}/shop`} className="btn btn-primary">{dict.cartUi.emptyCta}</Link>
      </div>
    );
  }

  const canContinue = step === 1 ? contactOk : step === 2 ? addressOk : step === 3 ? !!quote : false;
  const STEPS = [t.steps.contact, t.steps.address, t.steps.method, t.steps.payment];

  return (
    <div className="print-layout" ref={topRef}>
      <div className="print-main">
        <ol className="stepper four" aria-label={t.steps.label}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n === step ? 'active' : n < step ? 'done' : '';
            return (
              <li key={n} className={`stepper-item ${state}`} aria-current={n === step ? 'step' : undefined}>
                <button type="button" className="stepper-dot" onClick={() => { if (n < step) goto(n); }} aria-label={`${t.steps.step} ${n}: ${label}`} data-testid={`co-step-${n}`}>
                  {n < step ? '✓' : n}
                </button>
                <span className="stepper-label">{label}</span>
              </li>
            );
          })}
        </ol>

        {quoteErr?.error === 'items' && (
          <div className="form-err" role="alert" data-testid="stock-issues">
            <p>{issueText(quoteErr.issues, t)}</p>
            <Link href={`/${locale}/cart`} className="btn btn-ghost btn-sm">{t.backToCart}</Link>
          </div>
        )}

        {/* ---- 1: contact ---- */}
        {step === 1 && (
          <section className="print-step" aria-labelledby="co-contact">
            <h2 id="co-contact" className="print-h2">{t.contactTitle}</h2>
            <div className="delivery-grid">
              <div className="field">
                <label htmlFor="co-name">{dict.delivery.name} *</label>
                <input id="co-name" className="input" autoComplete="name" value={d.name} onChange={setD('name')} onBlur={blur('name')} aria-invalid={!!contactErrs.name} />
                {contactErrs.name && <span className="field-err">{contactErrs.name}</span>}
              </div>
              <div className="field">
                <label htmlFor="co-phone">{dict.delivery.phone} *</label>
                <input id="co-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="+971 5x xxx xxxx" value={d.phone} onChange={setD('phone')} onBlur={blur('phone')} aria-invalid={!!contactErrs.phone} />
                {contactErrs.phone && <span className="field-err">{contactErrs.phone}</span>}
              </div>
              <div className="field field-wide">
                <label htmlFor="co-email">{dict.delivery.email} *</label>
                <input
                  id="co-email" className="input" type="email" inputMode="email" autoComplete="email" dir="ltr"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); cart.setDelivery({ ...d, email: e.target.value }); }}
                  onBlur={blur('email')} aria-invalid={!!contactErrs.email}
                />
                {contactErrs.email && <span className="field-err">{contactErrs.email}</span>}
                <span className="field-note">{t.emailNote}</span>
              </div>
            </div>
          </section>
        )}

        {/* ---- 2: address (Locate me kept) ---- */}
        {step === 2 && (
          <section className="print-step" aria-labelledby="co-addr">
            <h2 id="co-addr" className="print-h2">{t.addressTitle}</h2>
            <div className="field">
              <div className="field-head">
                <label htmlFor="co-address">{dict.delivery.address} {method === 'delivery' ? '*' : ''}</label>
                <button type="button" className="btn btn-ghost btn-sm locate-btn" onClick={locate} disabled={geo === 'locating'}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>
                  {geo === 'locating' ? dict.delivery.locating : dict.delivery.locate}
                </button>
              </div>
              <textarea id="co-address" className="input" rows={3} autoComplete="street-address" placeholder={dict.delivery.addressHint} value={d.address} onChange={setD('address')} />
              <span className={`field-note ${geo}`} role="status">
                {geo === 'idle' && dict.delivery.geoNote}
                {geo === 'locating' && dict.delivery.locating}
                {geo === 'done' && dict.delivery.geoDone}
                {geo === 'denied' && dict.delivery.geoDenied}
                {geo === 'error' && dict.delivery.geoError}
                {geo === 'unsupported' && dict.delivery.geoUnsupported}
              </span>
            </div>
            <div className="field">
              <label htmlFor="co-note">{t.noteLabel}</label>
              <textarea id="co-note" className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.noteHint} />
            </div>
          </section>
        )}

        {/* ---- 3: delivery method ---- */}
        {step === 3 && (
          <section className="print-step" aria-labelledby="co-method">
            <h2 id="co-method" className="print-h2">{t.methodTitle}</h2>
            <div className="choice-grid two ful" role="radiogroup" aria-label={t.methodTitle}>
              <button type="button" role="radio" aria-checked={method === 'delivery'} className={`choice ${method === 'delivery' ? 'on' : ''}`} onClick={() => setMethod('delivery')} data-testid="method-delivery">
                <span className="choice-emoji" aria-hidden="true">🛵</span>
                <strong>{t.methodDelivery}</strong>
                <small>{quote && quote.method === 'delivery' && quote.deliveryFils === 0 ? t.deliveryFree : t.deliveryFee.replace('{fee}', fmt(quote?.deliveryFils ?? 1500, locale)).replace('{free}', fmt(quote?.freeOverFils ?? 15000, locale))}</small>
              </button>
              <button type="button" role="radio" aria-checked={method === 'collect'} className={`choice ${method === 'collect' ? 'on' : ''}`} onClick={() => !hasPrintDelivery && setMethod('collect')} disabled={hasPrintDelivery} data-testid="method-collect">
                <span className="choice-emoji" aria-hidden="true">🏪</span>
                <strong>{t.methodCollect}</strong>
                <small>{hasPrintDelivery ? t.printDeliveryLocked : t.collectNote}</small>
              </button>
            </div>
          </section>
        )}

        {/* ---- 4: payment ---- */}
        {step === 4 && (
          <section className="print-step" aria-labelledby="co-pay">
            <h2 id="co-pay" className="print-h2">{t.payTitle}</h2>
            {status && !status.stripe && (
              <div className="print-warn" role="status">{t.stripeNotConfigured}</div>
            )}
            <div className="pay-methods" role="radiogroup" aria-label={t.payTitle}>
              {status?.stripe && (
                <button type="button" role="radio" aria-checked={payMethod === 'card'} className={`pay-method ${payMethod === 'card' ? 'on' : ''}`} onClick={() => setPayMethod('card')} data-testid="pay-card">
                  <strong>{t.payCard}</strong>
                  <small>{t.payCardNote}</small>
                </button>
              )}
              {status?.cod !== false && (
                <button type="button" role="radio" aria-checked={payMethod === 'cod'} className={`pay-method ${payMethod === 'cod' ? 'on' : ''}`} onClick={() => setPayMethod('cod')} data-testid="pay-cod">
                  <strong>{t.payCod}</strong>
                  <small>{t.payCodNote}</small>
                </button>
              )}
            </div>

            {payMethod === 'card' && status?.stripe && (
              <div className="pay-box">
                <div id="payment-element" />
                {!stripeReady && !payError && <p className="field-note" aria-busy="true">{t.loadingPayment}</p>}
              </div>
            )}
            {payMethod === 'cod' && <p className="field-note">{t.codExplain}</p>}
            {payError && <p className="form-err" role="alert" data-testid="pay-error">{payError}</p>}
            <p className="field-note">🔒 {t.secureNote}</p>
          </section>
        )}

        {step > 1 && (
          <button type="button" className="btn btn-ghost btn-sm step-back" onClick={() => goto(step - 1)} data-testid="co-back">← {t.steps.back}</button>
        )}
      </div>

      {/* ---- order summary: sticky card / bottom bar ---- */}
      <aside className={`print-quote ${quoteOpen ? 'open' : ''}`} aria-labelledby="co-sum">
        <button type="button" className="quote-veil" aria-hidden="true" tabIndex={-1} onClick={() => setQuoteOpen(false)} />
        <div className="quote-panel" id="co-summary">
          <h2 id="co-sum" className="print-h2 quote-title">{t.summary}</h2>
          {quote ? (
            <div className="quote-lines" data-testid="co-quote">
              {quote.lines.map((l, i) => (
                <div key={i} className="quote-line">
                  <span>{l.title} × {l.qty}</span><strong>{fmt(l.totalFils, locale)}</strong>
                </div>
              ))}
              <div className="quote-line"><span>{t.deliveryLine}</span><strong data-testid="co-delivery">{quote.deliveryFils === 0 ? t.free : fmt(quote.deliveryFils, locale)}</strong></div>
              <div className="quote-line total"><span>{t.total}</span><strong data-testid="co-total">{fmt(quote.totalFils, locale)}</strong></div>
              <p className="field-note">{t.vatNote}</p>
            </div>
          ) : quoteErr ? (
            <p className="field-err">{quoteErr.error === 'items' ? issueText(quoteErr.issues, t) : t.errors.network}</p>
          ) : (
            <p className="field-note" aria-busy="true">…</p>
          )}
        </div>
        <div className="print-bar">
          <button type="button" className="bar-total" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen} aria-controls="co-summary">
            <small>{t.total} <span className="bar-caret" aria-hidden="true">{quoteOpen ? '▾' : '▴'}</span></small>
            <strong data-testid="co-sticky-total">{quote ? fmt(quote.totalFils, locale) : '…'}</strong>
          </button>
          {step < 4 ? (
            <button type="button" className="btn btn-primary bar-cta" disabled={!canContinue} onClick={() => goto(step + 1)} data-testid="co-next">
              {t.steps.next} →
            </button>
          ) : payMethod === 'cod' ? (
            <button type="button" className="btn btn-primary bar-cta" disabled={paying || !quote} onClick={placeCod} data-testid="co-place-cod">
              {paying ? t.placing : t.placeCod}
            </button>
          ) : (
            <button type="button" className="btn btn-primary bar-cta" disabled={paying || !stripeReady} onClick={payCard} data-testid="co-pay-now">
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
