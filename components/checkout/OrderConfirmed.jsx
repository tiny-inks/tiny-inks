'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Hourglass, Send, X } from 'lucide-react';
import { useCart } from '../CartContext';

/* Confirmation page. The order is created by the Stripe webhook (never by this
   browser) — we poll /api/checkout/order until it appears. COD arrives with the
   order number already in the URL. */
export default function OrderConfirmed({ dict, locale, business }) {
  const t = dict.checkout;
  const params = useSearchParams();
  const cart = useCart();
  const pi = (params.get('payment_intent') || params.get('pi') || '').replace(/[^\w]/g, '');
  const codName = params.get('cod') || '';
  const redirectStatus = params.get('redirect_status') || '';
  const [state, setState] = useState('checking'); // checking | found | paidPending | failed | unknown
  const [orderName, setOrderName] = useState(codName || '');
  const cleared = useRef(false);
  const clearOnce = () => { if (!cleared.current) { cleared.current = true; cart.clearCart(); } };

  useEffect(() => {
    if (codName) { setState('found'); clearOnce(); return; }
    if (redirectStatus === 'failed') { setState('failed'); return; }
    if (!pi) { setState('unknown'); return; }
    clearOnce(); /* redirected back from Stripe with a processing/succeeded intent */
    let stop = false;
    let tries = 0;
    const poll = async () => {
      if (stop) return;
      tries += 1;
      try {
        const r = await fetch(`/api/checkout/order?pi=${pi}`);
        const j = await r.json();
        if (j.found) { setOrderName(j.orderName); setState('found'); return; }
        if (j.paid === false && tries > 2) { setState('failed'); return; }
      } catch {}
      if (tries >= 14) { setState('paidPending'); return; }
      setTimeout(poll, 2500);
    };
    poll();
    return () => { stop = true; };
  }, [pi, codName, redirectStatus]); // eslint-disable-line

  const Hero = ({ icon, tone, title, lede }) => (
    <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-start">
      <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${tone}`}>{icon}</div>
      <div>{title}{lede}</div>
    </div>
  );

  if (state === 'checking') {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-5 py-20 text-center sm:px-8" aria-busy="true">
        <Hero
          icon={<Hourglass className="h-7 w-7 animate-pulse text-ink" strokeWidth={1.6} />}
          tone="bg-sun"
          title={<h1 className="display-lg">{t.confirming}</h1>}
          lede={<p className="mt-3 text-sm text-muted-foreground">{t.confirmingLede}</p>}
        />
      </section>
    );
  }

  if (state === 'failed') {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/15 text-destructive"><X className="h-7 w-7" strokeWidth={1.8} /></div>
        <h1 className="display-lg mt-6">{t.failedTitle}</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">{t.failedLede}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/${locale}/checkout`} className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral">{t.tryAgain}</Link>
          <a href={`${business.whatsappHref}?text=${encodeURIComponent(t.waHelp)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] transition-colors hover:bg-sun">{t.whatsapp}</a>
        </div>
      </section>
    );
  }

  if (state === 'unknown') {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <h3 className="display-md">{t.noOrder}</h3>
        <Link href={`/${locale}/shop`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral">{dict.cartUi.emptyCta}</Link>
      </section>
    );
  }

  const pending = state === 'paidPending';
  const waText = encodeURIComponent(`${t.waOrder} ${orderName || pi}`);
  return (
    <section data-testid="order-confirmed" className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-sage text-ink"><Check className="h-7 w-7" strokeWidth={1.8} /></div>
        <div>
          <span className="eyebrow-new">{t.confirmedEyebrow}</span>
          <h1 className="display-lg mt-2">{t.confirmedTitle}</h1>
          {orderName
            ? <p className="mt-3 text-sm text-muted-foreground">{t.orderNo}: <strong data-testid="order-name" className="text-foreground">{orderName}</strong></p>
            : <p className="mt-3 text-sm text-muted-foreground">{t.pendingNumber}</p>}
        </div>
      </div>

      {pending && <div role="status" className="mt-8 rounded-2xl bg-sun/60 p-4 text-center text-sm text-ink">{t.pendingNote}</div>}

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 text-center sm:p-8">
        <h3 className="eyebrow-new">{t.nextTitle}</h3>
        <ol className="mx-auto mt-4 max-w-md list-decimal space-y-2 text-start text-sm text-muted-foreground [&>li]:ms-5">
          <li>{codName ? t.codStep1 : t.paidStep1}</li>
          <li>{t.step2}</li>
          <li>{t.step3}</li>
        </ol>
        <a href={`${business.whatsappHref}?text=${waText}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral">
          <Send className="h-4 w-4" /> {t.whatsapp}
        </a>
        <Link href={`/${locale}/shop`} className="mt-4 block text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted-foreground underline underline-offset-4">{t.keepShopping}</Link>
      </div>
    </section>
  );
}
