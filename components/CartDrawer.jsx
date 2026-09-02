'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from './CartContext';
import Placeholder from './Placeholder';
import FreeDeliveryBar from './FreeDeliveryBar';
import EmptyState from './EmptyState';
import { formatPrice } from '@/lib/products';

export default function CartDrawer({ dict, locale, collections = [] }) {
  const cart = useCart();
  const t = dict.cartUi;
  /* Only mount the drawer contents while it is open (plus the slide-out
     animation) so a closed drawer never leaves hidden links, headings or an
     empty state in the document for screen readers and tests to trip on. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (cart.open) { setMounted(true); return; }
    const id = setTimeout(() => setMounted(false), 360);
    return () => clearTimeout(id);
  }, [cart.open]);

  useEffect(() => {
    if (!cart.open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') cart.setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [cart.open]);

  return (
    <>
      <div className={`drawer-veil ${cart.open ? 'open' : ''}`} onClick={() => cart.setOpen(false)} />
      <aside className={`drawer ${cart.open ? 'open' : ''}`} aria-label={t.title} aria-hidden={!cart.open}>
        <div className="drawer-head">
          <h3>{t.title} ({cart.count})</h3>
          <button className="drawer-close" onClick={() => cart.setOpen(false)} aria-label="Close">✕</button>
        </div>

        <div className="drawer-body">
          {!mounted ? null : cart.items.length === 0 ? (
            <div onClick={(e) => { if (e.target.closest('a')) cart.setOpen(false); }}>
              <EmptyState dict={dict} locale={locale} collections={collections} title={t.empty} cta={t.emptyCta} ctaHref={`/${locale}/shop`} />
            </div>
          ) : (
            cart.items.map((item) => (
              <div className="line-item" key={item.lineId}>
                {item.image ? <img src={item.image} alt="" /> : <div className="line-ph"><Placeholder handle={item.handle} title={item.title} size="thumb" /></div>}
                <div>
                  <h4>{item.title}</h4>
                  {item.attributes?.length > 0 && (
                    <ul className="line-attrs">
                      {item.attributes.filter((a) => ['Files', 'Pages', 'Paper size', 'Colour', 'Sides', 'Copies', 'Finishing', 'Fulfilment'].includes(a.key)).map((a) => (
                        <li key={a.key}><span>{a.key}:</span> {a.value}</li>
                      ))}
                    </ul>
                  )}
                  <div className="qty">
                    <button onClick={() => cart.setQty(item, item.qty - 1)} aria-label="-">−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => cart.setQty(item, item.qty + 1)} aria-label="+">+</button>
                  </div>
                  <button className="line-remove" onClick={() => cart.remove(item)}>{t.remove}</button>
                </div>
                <strong>{formatPrice(item.price * item.qty, 'AED', locale)}</strong>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="drawer-foot">
            <FreeDeliveryBar subtotal={cart.subtotal} dict={dict} locale={locale} />
            <div className="subtotal">
              <span>{t.subtotal}</span>
              <span>{formatPrice(cart.subtotal, 'AED', locale)}</span>
            </div>
            <Link
              href={`/${locale}/cart`}
              className="btn btn-ghost btn-sm"
              onClick={() => cart.setOpen(false)}
            >
              {t.viewCart}
            </Link>
            {/* payment happens on-site now (Stripe / COD) — demo mode included */}
            <Link href={`/${locale}/checkout`} className="btn btn-primary" onClick={() => cart.setOpen(false)} data-testid="go-checkout">
              {t.checkout}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
