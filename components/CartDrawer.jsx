'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useCart } from './CartContext';
import Placeholder from './Placeholder';
import FreeDeliveryBar from './FreeDeliveryBar';
import EmptyState from './EmptyState';
import { formatMoney } from '@/lib/products';
import { cartLineImage } from '@/lib/product-images';

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
      <div
        onClick={() => cart.setOpen(false)}
        className={`fixed inset-0 z-[70] bg-ink/25 backdrop-blur-[2px] transition-opacity duration-400 ${cart.open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden
      />
      <aside
        className={`fixed end-0 top-0 z-[80] flex h-dvh w-full max-w-[420px] flex-col bg-card shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${cart.open ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}`}
        aria-label={t.title}
        aria-hidden={!cart.open}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-coral" strokeWidth={1.6} />
            <span className="eyebrow-new">{t.title} ({cart.count})</span>
          </div>
          <button type="button" onClick={() => cart.setOpen(false)} aria-label={t.close || 'Close'} className="ui-icon-btn bg-secondary hover:bg-coral hover:text-white">
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {!mounted ? null : cart.items.length === 0 ? (
            <div onClick={(e) => { if (e.target.closest('a')) cart.setOpen(false); }}>
              <EmptyState dict={dict} locale={locale} collections={collections} title={t.empty} cta={t.emptyCta} ctaHref={`/${locale}/shop`} />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cart.items.map((item) => (
                <li key={item.lineId} className="flex gap-4 py-5">
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                    {cartLineImage(item) ? (
                      <img src={cartLineImage(item)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Placeholder handle={item.handle} title={item.title} size="thumb" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <button type="button" onClick={() => cart.remove(item)} className="shrink-0 text-xs text-muted-foreground underline underline-offset-4">{t.remove}</button>
                    </div>
                    {item.attributes?.length > 0 && (
                      <ul className="mt-1 text-[0.68rem] text-muted-foreground">
                        {item.attributes.filter((a) => ['Files', 'Pages', 'Paper size', 'Colour', 'Sides', 'Copies', 'Finishing', 'Fulfilment'].includes(a.key)).map((a) => (
                          <li key={a.key}>{a.key}: {a.value}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="ui-qty ui-qty-sm">
                        <button type="button" aria-label={t.decrease || '-'} onClick={() => cart.setQty(item, item.qty - 1)}>
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </button>
                        <span>{item.qty}</span>
                        <button type="button" aria-label={t.increase || '+'} onClick={() => cart.setQty(item, item.qty + 1)}>
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </button>
                      </div>
                      <span className="money text-sm font-semibold">{formatMoney(item.price * item.qty, 'AED', locale)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t border-border bg-secondary/40 px-5 py-5">
            <FreeDeliveryBar subtotal={cart.subtotal} dict={dict} locale={locale} />
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="label-xs">{t.subtotal}</span>
              <span className="money font-display text-lg font-semibold">{formatMoney(cart.subtotal, 'AED', locale)}</span>
            </div>
            <Link
              href={`/${locale}/checkout`}
              onClick={() => cart.setOpen(false)}
              data-testid="go-checkout"
              className="ui-btn ui-btn-primary ui-btn-lg ui-btn-block mt-4"
            >
              {t.checkout}
            </Link>
            <Link
              href={`/${locale}/cart`}
              onClick={() => cart.setOpen(false)}
              className="mt-3 block w-full text-center text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground underline underline-offset-4"
            >
              {t.viewCart}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
