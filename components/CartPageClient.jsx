'use client';
import Link from 'next/link';
import { useCart } from './CartContext';
import Placeholder from './Placeholder';
import FreeDeliveryBar from './FreeDeliveryBar';
import EmptyState from './EmptyState';
import { formatPrice } from '@/lib/products';

export default function CartPageClient({ dict, locale, collections = [] }) {
  const cart = useCart();
  const t = dict.cartUi;
  const tp = dict.cartPage;

  if (cart.items.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <EmptyState dict={dict} locale={locale} collections={collections} title={t.empty} cta={t.emptyCta} ctaHref={`/${locale}/shop`} />
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <div className="cart-items">
        {cart.items.map((item) => (
          <div className="cart-row" key={item.lineId}>
            {item.image ? (
              <Link href={`/${locale}/product/${item.handle}`}>
                <img src={item.image} alt={item.title} />
              </Link>
            ) : (
              <Link href={`/${locale}/product/${item.handle}`} className="cart-row-noimg"><Placeholder handle={item.handle} title={item.title} size="thumb" /></Link>
            )}
            <div className="cart-row-info">
              <Link href={`/${locale}/product/${item.handle}`} className="cart-row-title">
                {item.title}
              </Link>
              {item.attributes?.length > 0 && (
              <ul className="line-attrs">
                {item.attributes.filter((a) => ['Files', 'Pages', 'Paper size', 'Colour', 'Sides', 'Copies', 'Finishing', 'Fulfilment'].includes(a.key)).map((a) => (
              <li key={a.key}><span>{a.key}:</span> {a.value}</li>
                ))}
              </ul>
              )}
              <div className="cart-row-price">
                {formatPrice(item.price, 'AED', locale)} <span>{tp.each}</span>
              </div>
              <div className="cart-row-controls">
                <div className="qty">
                  <button onClick={() => cart.setQty(item, item.qty - 1)} aria-label="−">−</button>
                  <span>{item.qty}</span>
                  <button onClick={() => cart.setQty(item, item.qty + 1)} aria-label="+">+</button>
                </div>
                <button className="line-remove" onClick={() => cart.remove(item)}>{t.remove}</button>
              </div>
            </div>
            <strong className="cart-row-total">{formatPrice(item.price * item.qty, 'AED', locale)}</strong>
          </div>
        ))}
        <Link href={`/${locale}/shop`} className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }}>
          {tp.continue}
        </Link>
      </div>

      <aside className="cart-summary">
        <h3>{tp.summary}</h3>
        <FreeDeliveryBar subtotal={cart.subtotal} dict={dict} locale={locale} />
        <div className="subtotal">
          <span>{t.subtotal}</span>
          <span>{formatPrice(cart.subtotal, 'AED', locale)}</span>
        </div>
        <p className="drawer-note" style={{ textAlign: 'start' }}>✦ {tp.shippingNote}</p>
        {/* payment happens on tinyinks.ae (Stripe / cash on delivery) */}
        <Link href={`/${locale}/checkout`} className="btn btn-primary" data-testid="go-checkout">{t.checkout}</Link>
        <div className="cart-help">
          <h4>{tp.goodToKnow}</h4>
          <Link href={`/${locale}/policies/shipping`}>{dict.policies.shipping}</Link>
          <Link href={`/${locale}/policies/returns`}>{dict.policies.returns}</Link>
          <Link href={`/${locale}/faq`}>{dict.policies.faq}</Link>
        </div>
      </aside>
    </div>
  );
}
