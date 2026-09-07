'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LocateFixed, ShoppingBag } from 'lucide-react';
import { useCart } from '../CartContext';

/* On-site checkout: one page — contact, delivery, payment — matching the
   Lovable reference design (no step wizard). Prices always come from
   /api/checkout/quote (server recomputes from Shopify); the browser only
   ever sends variant ids + quantities. Payment Element renders cards + Apple
   Pay + Google Pay once contact + address are valid; 3-D Secure is handled
   by confirmPayment. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;
const fmt = (fils, locale, currency = 'AED') =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency, minimumFractionDigits: 2 }).format((fils || 0) / 100);

/* shared by the card element and the express (wallet) element so both match
   the site's brand rather than Stripe's defaults */
const STRIPE_APPEARANCE = {
  variables: {
    colorPrimary: '#fe626c', colorText: '#133155', colorBackground: '#ffffff',
    borderRadius: '16px', fontFamily: 'inherit',
  },
};

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

/* the shared field/label styles now live in globals.css (@layer components)
   so checkout, print, contact and the newsletter all render identically */
const field = 'ui-field';

function Card({ eyebrow, children }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <span className="eyebrow-new">{eyebrow}</span>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default function CheckoutClient({ dict, locale, business }) {
  const t = dict.checkout;
  const router = useRouter();
  const cart = useCart();
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
  const [stripeMounted, setStripeMounted] = useState(false);
  const [expressAvailable, setExpressAvailable] = useState(false);
  const stripeRef = useRef({});
  const expressRef = useRef({});
  /* The express-checkout handlers are registered once at mount, so they would
     otherwise close over the first render's state. Everything they read comes
     from here instead, refreshed on every render. */
  const liveRef = useRef({});

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
  const readyToPay = contactOk && addressOk && !!quote;

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

  const payloadBody = () => ({
    items, method,
    contact: { name: d.name.trim(), email: email.trim(), phone: d.phone.trim() },
    address: { line: d.address.trim(), lat: d.lat, lon: d.lon },
    note, locale,
  });

  useEffect(() => { liveRef.current = { quote, method, d, email, note, items, locale, t }; });

  /* ---------------------------------------------------------------- express
     Apple Pay / Google Pay, as Stripe's own branded buttons.

     This gets its OWN Elements group in *deferred* mode (mode/amount/currency
     instead of a clientSecret). The wallet sheet takes its total from the
     Elements amount — a clientSecret group is frozen at whatever the amount
     was when it mounted, so it would quote a stale total after any cart or
     delivery-method change. Deferred mode lets us call elements.update().
     The card Payment Element keeps its own clientSecret group: submit()
     validates every element in ITS group, so sharing one would run card-form
     validation in the middle of a wallet payment. */
  const onExpressClick = (event) => {
    /* HARD RULE: resolve() within ~1s of the tap, synchronously. Any await
       before this and the wallet sheet just spins forever with no error. */
    const L = liveRef.current;
    const q = L.quote;
    if (!q) { event.reject(); return; }
    const delivering = L.method === 'delivery';
    event.resolve({
      emailRequired: true,
      phoneNumberRequired: true,
      shippingAddressRequired: delivering,
      ...(delivering ? {
        shippingRates: [{
          id: 'standard',
          displayName: L.t.deliveryLine,
          amount: q.deliveryFils,
        }],
      } : {}),
      lineItems: (q.lines || []).map((l) => ({
        name: `${l.title}${l.qty > 1 ? ` × ${l.qty}` : ''}`,
        amount: l.totalFils,
      })),
    });
  };

  const onExpressConfirm = async (event) => {
    const { stripe, elements } = expressRef.current;
    const L = liveRef.current;
    if (!stripe || !elements) { event.paymentFailed({ reason: 'fail' }); return; }
    setPayError('');
    setPaying(true);
    try {
      /* deferred mode: submit() first, then create the intent, then confirm */
      const { error: submitError } = await elements.submit();
      if (submitError) {
        event.paymentFailed({ reason: 'fail' });
        setPayError(submitError.message || L.t.errors.payment_failed);
        setPaying(false);
        return;
      }

      /* the wallet supplies name/email/phone/address — fall back to anything
         already typed into the form for whatever it doesn't give us */
      const billing = event.billingDetails || {};
      const ship = event.shippingAddress || {};
      const a = ship.address || {};
      const shipLine = [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(', ');
      const body = {
        items: L.items,
        method: L.method,
        contact: {
          name: (billing.name || ship.name || L.d.name || '').trim(),
          email: (billing.email || L.email || '').trim(),
          phone: (billing.phone || L.d.phone || '').trim(),
        },
        address: { line: (shipLine || L.d.address || '').trim(), lat: L.d.lat, lon: L.d.lon },
        note: L.note,
        locale: L.locale,
      };

      const r = await fetch('/api/checkout/intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        event.paymentFailed({ reason: 'fail' });
        setPayError(j.error === 'items' ? issueText(j.issues, L.t) : L.t.errors[j.error] || L.t.errors.intent_failed);
        setPaying(false);
        return;
      }

      /* no payment_method_data.billing_details here — the wallet provides it,
         and passing our own makes Stripe reject the confirm. confirmPayment
         REJECTS on integration errors instead of resolving with {error}. */
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret: j.clientSecret,
        confirmParams: { return_url: `${window.location.origin}/${L.locale}/order/confirmed` },
      });
      if (error) {
        event.paymentFailed({ reason: 'fail' });
        if (error.type !== 'validation_error') {
          setPayError(error.type === 'card_error' ? error.message : L.t.errors.payment_failed);
        }
        setPaying(false);
        refreshQuote();
      }
    } catch (e) {
      console.error(e);
      event.paymentFailed({ reason: 'fail' });
      setPayError(L.t.errors.network);
      setPaying(false);
    }
  };

  const mountExpress = useCallback(async () => {
    try {
      const Stripe = await loadStripeJs();
      const stripe = Stripe(status.publishableKey);
      const elements = stripe.elements({
        mode: 'payment',
        amount: quote.totalFils,
        currency: (quote.currency || 'AED').toLowerCase(),
        locale: locale === 'ar' ? 'ar' : 'en',
        appearance: STRIPE_APPEARANCE,
      });
      const ece = elements.create('expressCheckout', {
        buttonHeight: 48,
        layout: { maxColumns: 2, maxRows: 2 },
      });
      ece.on('ready', ({ availablePaymentMethods }) => setExpressAvailable(Boolean(availablePaymentMethods)));
      ece.on('click', onExpressClick);
      ece.on('confirm', onExpressConfirm);
      ece.mount('#express-checkout-element');
      expressRef.current = { stripe, elements, ece };
    } catch (e) {
      console.error('express checkout unavailable:', e);
    }
  }, [status, quote, locale]); // eslint-disable-line

  useEffect(() => {
    if (status?.stripe && status.publishableKey && quote && !expressRef.current.ece) mountExpress();
  }, [status, quote, mountExpress]);

  /* keep the wallet sheet's total honest when the basket or method changes */
  useEffect(() => {
    if (expressRef.current.elements && quote?.totalFils) {
      expressRef.current.elements.update({ amount: quote.totalFils });
    }
  }, [quote?.totalFils]);

  /* mount the Payment Element once contact + address are valid — everything
     lives on one page here, so "step 4" becomes "the moment the form is
     complete enough to charge a card" instead of an explicit step. */
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
        appearance: STRIPE_APPEARANCE,
      });
      /* wallets off here — the branded Apple/Google Pay buttons live in the
         express element above, and having both showed them twice */
      const paymentElement = elements.create('payment', {
        layout: 'tabs',
        wallets: { applePay: 'never', googlePay: 'never' },
      });
      paymentElement.mount('#payment-element');
      paymentElement.on('ready', () => setStripeReady(true));
      stripeRef.current = { stripe, elements, pi: j.paymentIntentId, amountFils: j.amountFils };
    } catch (e) {
      console.error(e);
      setPayError(t.errors.network);
    }
  }, [items, method, email, note, d, status]); // eslint-disable-line

  useEffect(() => {
    if (payMethod === 'card' && status?.stripe && readyToPay && !stripeMounted) {
      setStripeMounted(true);
      mountPayment();
    }
  }, [payMethod, status?.stripe, readyToPay, stripeMounted]); // eslint-disable-line

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
      /* A half-filled card form comes back as validation_error, and Stripe has
         ALREADY printed "Your card number is incomplete" under the field it
         belongs to. Adding a red "the payment did not go through" banner on
         top of that read as a failed charge when nothing was even attempted. */
      if (error.type !== 'validation_error') {
        setPayError(error.type === 'card_error' ? error.message : t.errors.payment_failed);
      }
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

  const placeOrder = () => {
    setTouched({ name: true, email: true, phone: true });
    if (!readyToPay) return;
    if (payMethod === 'cod') placeCod();
    else payCard();
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

  return (
    <div className="grid gap-10 pb-28 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:pb-0">
      <div className="space-y-6">
        {quoteErr?.error === 'items' && (
          <div role="alert" data-testid="stock-issues" className="rounded-2xl bg-blush/60 p-4 text-sm text-ink">
            <p>{issueText(quoteErr.issues, t)}</p>
            <Link href={`/${locale}/cart`} className="mt-2 inline-block font-bold underline underline-offset-4">{t.backToCart}</Link>
          </div>
        )}

        {/* ---- contact ---- */}
        <Card eyebrow={t.contactTitle}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="ui-label">{dict.delivery.name} *</span>
              <input id="co-name" autoComplete="name" value={d.name} onChange={setD('name')} onBlur={blur('name')} aria-invalid={!!contactErrs.name} className={field} />
              {contactErrs.name && <span className="mt-1 block text-xs text-destructive">{contactErrs.name}</span>}
            </label>
            <label className="block">
              <span className="ui-label">{dict.delivery.phone} *</span>
              <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="+971 5x xxx xxxx" value={d.phone} onChange={setD('phone')} onBlur={blur('phone')} aria-invalid={!!contactErrs.phone} className={field} />
              {contactErrs.phone && <span className="mt-1 block text-xs text-destructive">{contactErrs.phone}</span>}
            </label>
            <label className="block sm:col-span-2">
              <span className="ui-label">{dict.delivery.email} *</span>
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
        </Card>

        {/* ---- delivery method + address ---- */}
        <Card eyebrow={t.methodTitle}>
          <div role="radiogroup" aria-label={t.methodTitle} className="grid gap-3 sm:grid-cols-2">
            <button type="button" role="radio" aria-checked={method === 'delivery'} onClick={() => setMethod('delivery')} data-testid="method-delivery"
              className={`rounded-2xl border-2 px-5 py-4 text-start transition-all duration-300 ${method === 'delivery' ? 'border-ink bg-ink text-white' : 'border-border bg-card hover:-translate-y-0.5 hover:border-coral'}`}>
              <strong className="block text-sm font-semibold">{t.methodDelivery}</strong>
              <small className={`mt-1 block text-[0.68rem] ${method === 'delivery' ? 'text-white/70' : 'text-muted-foreground'}`}>
                {quote && quote.method === 'delivery' && quote.deliveryFils === 0 ? t.deliveryFree : t.deliveryFee.replace('{fee}', fmt(quote?.deliveryFils ?? 1500, locale)).replace('{free}', fmt(quote?.freeOverFils ?? 15000, locale))}
              </small>
            </button>
            <button type="button" role="radio" aria-checked={method === 'collect'} onClick={() => !hasPrintDelivery && setMethod('collect')} disabled={hasPrintDelivery} data-testid="method-collect"
              className={`rounded-2xl border-2 px-5 py-4 text-start transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${method === 'collect' ? 'border-ink bg-ink text-white' : 'border-border bg-card hover:-translate-y-0.5 hover:border-coral'}`}>
              <strong className="block text-sm font-semibold">{t.methodCollect}</strong>
              <small className={`mt-1 block text-[0.68rem] ${method === 'collect' ? 'text-white/70' : 'text-muted-foreground'}`}>{hasPrintDelivery ? t.printDeliveryLocked : t.collectNote}</small>
            </button>
          </div>

          {method === 'delivery' && (
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="co-address" className="label-xs">{dict.delivery.address} *</label>
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
          )}

          <label className="mt-5 block">
            <span className="ui-label">{t.noteLabel}</span>
            <textarea id="co-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.noteHint} className={`${field} resize-none`} />
          </label>
        </Card>

        {/* ---- payment ---- */}
        <Card eyebrow={t.payTitle}>
          {status && !status.stripe && (
            <div role="status" className="mb-5 rounded-2xl bg-sun/60 p-4 text-sm text-ink">{t.stripeNotConfigured}</div>
          )}

          {/* Apple Pay / Google Pay — Stripe's own branded buttons. Hidden
              entirely (not just empty) on devices with no wallet available. */}
          <div className={status?.stripe && expressAvailable ? 'mb-6' : 'sr-only'} aria-hidden={!expressAvailable}>
            <div id="express-checkout-element" />
            <div className="mt-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">{t.orPayAnotherWay}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>

          <div role="radiogroup" aria-label={t.payTitle} className="grid gap-3 sm:grid-cols-2">
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
              {!readyToPay ? (
                <p className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">{t.errors.contact}</p>
              ) : (
                <>
                  <div id="payment-element" />
                  {!stripeReady && !payError && <p aria-busy="true" className="text-xs text-muted-foreground">{t.loadingPayment}</p>}
                </>
              )}
            </div>
          )}
          {payMethod === 'cod' && <p className="mt-5 text-sm text-muted-foreground">{t.codExplain}</p>}
          {payError && <p role="alert" data-testid="pay-error" className="mt-4 rounded-2xl bg-blush/60 p-3 text-sm text-ink">{payError}</p>}
          <p className="mt-5 text-xs text-muted-foreground">🔒 {t.secureNote}</p>
        </Card>
      </div>

      {/* ---- order summary: sticky card (desktop) / fixed bottom bar (mobile) ---- */}
      <aside aria-labelledby="co-sum" className="lg:sticky lg:top-28 lg:h-fit">
        <div className={`fixed inset-x-0 bottom-0 z-40 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card px-5 pb-5 pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 lg:static lg:max-h-none lg:translate-y-0 lg:rounded-3xl lg:border lg:p-8 lg:shadow-sm ${quoteOpen ? 'translate-y-0' : 'translate-y-[calc(100%-84px)] lg:translate-y-0'}`}>
          <button type="button" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen} aria-controls="co-summary" className="flex w-full items-center justify-between gap-3 lg:hidden">
            <small className="label-xs">{t.total} <span aria-hidden="true">{quoteOpen ? '▾' : '▴'}</span></small>
            <strong data-testid="co-sticky-total" className="font-display text-lg tabular-nums">{quote ? fmt(quote.totalFils, locale) : '…'}</strong>
          </button>
          <div id="co-summary">
            <span id="co-sum" className="eyebrow-new hidden lg:block">{t.summary}</span>
            {quote ? (
              <>
                <ul className="mt-4 divide-y divide-border">
                  {quote.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2.5 text-sm"><span className="text-muted-foreground">{l.title} × {l.qty}</span><strong className="tabular-nums">{fmt(l.totalFils, locale)}</strong></li>
                  ))}
                </ul>
                <dl data-testid="co-quote" className="mt-2 space-y-2 border-t border-border pt-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t.deliveryLine}</dt><dd data-testid="co-delivery" className="font-medium tabular-nums">{quote.deliveryFils === 0 ? t.free : fmt(quote.deliveryFils, locale)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 text-base">
                    <dt className="font-semibold">{t.total}</dt><dd data-testid="co-total" className="font-display font-semibold tabular-nums">{fmt(quote.totalFils, locale)}</dd>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.vatNote}</p>
                </dl>
              </>
            ) : quoteErr ? (
              <p className="mt-4 text-sm text-destructive">{quoteErr.error === 'items' ? issueText(quoteErr.issues, t) : t.errors.network}</p>
            ) : (
              <p aria-busy="true" className="mt-4 text-sm text-muted-foreground">…</p>
            )}
          </div>
          <button
            type="button"
            disabled={paying || !quote || (payMethod === 'card' && !stripeReady && readyToPay)}
            onClick={placeOrder}
            data-testid={payMethod === 'cod' ? 'co-place-cod' : 'co-pay-now'}
            className="ui-btn ui-btn-primary ui-btn-lg ui-btn-block mt-5"
          >
            {paying ? t.placing : payMethod === 'cod' ? t.placeCod : `${t.payNow}${quote ? ` · ${fmt(quote.totalFils, locale)}` : ''}`}
          </button>
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
