'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

  if (state === 'checking') {
    return (
      <div className="confirm-hero" aria-busy="true">
        <span className="confirm-check wait" aria-hidden="true">⏳</span>
        <div>
          <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)' }}>{t.confirming}</h1>
          <p className="lede">{t.confirmingLede}</p>
        </div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="print-confirm">
        <div className="confirm-hero">
          <span className="confirm-check fail" aria-hidden="true">✕</span>
          <div>
            <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)' }}>{t.failedTitle}</h1>
            <p className="lede">{t.failedLede}</p>
          </div>
        </div>
        <div className="about-ctas">
          <Link href={`/${locale}/checkout`} className="btn btn-primary">{t.tryAgain}</Link>
          <a href={`${business.whatsappHref}?text=${encodeURIComponent(t.waHelp)}`} target="_blank" rel="noreferrer" className="btn">{t.whatsapp}</a>
        </div>
      </div>
    );
  }

  if (state === 'unknown') {
    return (
      <div className="empty">
        <div className="empty-glyph" aria-hidden="true">✦</div>
        <h3>{t.noOrder}</h3>
        <Link href={`/${locale}/shop`} className="btn btn-primary">{dict.cartUi.emptyCta}</Link>
      </div>
    );
  }

  const pending = state === 'paidPending';
  const waText = encodeURIComponent(`${t.waOrder} ${orderName || pi}`);
  return (
    <div className="print-confirm" data-testid="order-confirmed">
      <div className="confirm-hero">
        <span className="confirm-check" aria-hidden="true">✓</span>
        <div>
          <div className="eyebrow">{t.confirmedEyebrow}</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>{t.confirmedTitle}</h1>
          {orderName
            ? <p className="confirm-order">{t.orderNo}: <strong data-testid="order-name">{orderName}</strong></p>
            : <p className="confirm-order">{t.pendingNumber}</p>}
        </div>
      </div>
      {pending && <div className="print-warn" role="status">{t.pendingNote}</div>}
      <div className="confirm-card">
        <h3>{t.nextTitle}</h3>
        <ol className="confirm-steps">
          <li>{codName ? t.codStep1 : t.paidStep1}</li>
          <li>{t.step2}</li>
          <li>{t.step3}</li>
        </ol>
        <a className="btn btn-primary" href={`${business.whatsappHref}?text=${waText}`} target="_blank" rel="noreferrer">{t.whatsapp}</a>
        <Link href={`/${locale}/shop`} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>{t.keepShopping}</Link>
      </div>
    </div>
  );
}
