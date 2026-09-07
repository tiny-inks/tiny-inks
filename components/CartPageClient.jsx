'use client';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';
import Placeholder from './Placeholder';
import FreeDeliveryBar from './FreeDeliveryBar';
import EmptyState from './EmptyState';
import { formatPrice, formatMoney } from '@/lib/products';
import { cartLineImage } from '@/lib/product-images';

export default function CartPageClient({ dict, locale, collections = [] }) {
  const cart = useCart();
  const t = dict.cartUi;
  const tp = dict.cartPage;

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState dict={dict} locale={locale} collections={collections} title={t.empty} cta={t.emptyCta} ctaHref={`/${locale}/shop`} />
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
          {cart.items.map((item) => (
            <li key={item.lineId} className="flex gap-4 p-5">
              <Link href={`/${locale}/product/${item.handle}`} className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                {cartLineImage(item) ? (
                  <img src={cartLineImage(item)} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <Placeholder handle={item.handle} title={item.title} size="thumb" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/${locale}/product/${item.handle}`} className="font-display text-base leading-tight hover:text-coral">{item.title}</Link>
                {item.attributes?.length > 0 && (
                  <ul className="mt-1 text-[0.68rem] text-muted-foreground">
                    {item.attributes.filter((a) => ['Files', 'Pages', 'Paper size', 'Colour', 'Sides', 'Copies', 'Finishing', 'Fulfilment'].includes(a.key)).map((a) => (
                      <li key={a.key}>{a.key}: {a.value}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-1 text-sm text-muted-foreground">{formatPrice(item.price, 'AED', locale)} <span>{tp.each}</span></div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="ui-qty">
                    <button type="button" aria-label={t.decrease || '-'} onClick={() => cart.setQty(item, item.qty - 1)}><Minus className="h-4 w-4" strokeWidth={1.8} /></button>
                    <span>{item.qty}</span>
                    <button type="button" aria-label={t.increase || '+'} onClick={() => cart.setQty(item, item.qty + 1)}><Plus className="h-4 w-4" strokeWidth={1.8} /></button>
                  </div>
                  <button type="button" onClick={() => cart.remove(item)} className="text-xs font-bold text-muted-foreground underline underline-offset-4">{t.remove}</button>
                </div>
              </div>
              <strong className="money shrink-0 font-display text-base">{formatMoney(item.price * item.qty, 'AED', locale)}</strong>
            </li>
          ))}
        </ul>
        <Link href={`/${locale}/shop`} className="mt-6 inline-block text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-coral underline underline-offset-4">{tp.continue}</Link>
      </div>

      <aside className="h-fit rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-28">
        <span className="eyebrow-new">{tp.summary}</span>
        <div className="mt-4"><FreeDeliveryBar subtotal={cart.subtotal} dict={dict} locale={locale} /></div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="label-xs">{t.subtotal}</span>
          <span className="money font-display text-lg font-semibold">{formatMoney(cart.subtotal, 'AED', locale)}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">✦ {tp.shippingNote}</p>
        <Link href={`/${locale}/checkout`} data-testid="go-checkout" className="ui-btn ui-btn-primary ui-btn-lg ui-btn-block mt-5">
          <ShoppingBag className="h-4 w-4" /> {t.checkout}
        </Link>
        <div className="mt-6 border-t border-border pt-5">
          <h4 className="eyebrow-new">{tp.goodToKnow}</h4>
          <div className="mt-2 flex flex-col gap-1.5">
            <Link href={`/${locale}/policies/shipping`} className="text-sm text-muted-foreground hover:text-coral">{dict.policies.shipping}</Link>
            <Link href={`/${locale}/policies/returns`} className="text-sm text-muted-foreground hover:text-coral">{dict.policies.returns}</Link>
            <Link href={`/${locale}/faq`} className="text-sm text-muted-foreground hover:text-coral">{dict.policies.faq}</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
