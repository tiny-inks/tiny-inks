'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Eye, Heart } from 'lucide-react';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';
import Placeholder from './Placeholder';
import { formatPrice } from '@/lib/products';
import { productImage } from '@/lib/product-images';

const NEW_DAYS = 45;

/* Lovable-style card: square photo, brand line, title, one-line blurb, price
   + full-width pill "Add to bag". NEW badge from real recency/tag data only —
   never invented. */
export default function ProductCard({ product, locale, dict, image, index = 0 }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const [added, setAdded] = useState(false);
  const img = image || productImage(product);
  const href = `/${locale}/product/${product.handle}`;
  const saved = wishlist?.has(product.handle);
  const canAdd = product.available && product.variantId;
  const isNew = product.available && (product.tags?.includes('new')
    || (product.createdAt && (Date.now() - new Date(product.createdAt).getTime()) < NEW_DAYS * 86400 * 1000));
  const isBulk = product.tags?.includes('bulk');

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-2.5 transition-all duration-500 hover:-translate-y-1 hover:border-ink hover:shadow-[0_18px_40px_-24px_rgba(30,45,90,0.45)] sm:p-3"
      style={{ transitionDelay: `${(index % 4) * 60}ms` }}
    >
      {/* aspect-square lives on THIS wrapper, not just the <img>, because
          Placeholder's root is position: absolute — it never contributes
          height to its own parent. Without the ratio pinned here, any
          product with no real image collapses this box to 0px tall and the
          title/price block below renders straight on top of the
          placeholder's own title (looked like the card "duplicating"). */}
      <div className="relative block aspect-square overflow-hidden rounded-2xl bg-secondary">
        <Link href={href} aria-label={product.title} className="block h-full w-full">
          {img?.url ? (
            <img
              className={`h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05] ${img.fallback ? 'is-fallback' : ''}`}
              src={img.url}
              alt={product.title}
              loading="lazy"
            />
          ) : (
            <Placeholder handle={product.handle} title={product.title} label={dict.cartUi.noImage} />
          )}
        </Link>
        {!product.available && (
          <span className="absolute start-2.5 top-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-white">{dict.product.soldout}</span>
        )}
        {isNew && product.available && (
          <span className="absolute start-2.5 top-2.5 rounded-full bg-sun px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-ink">{dict.product.newBadge}</span>
        )}
        {isBulk && (
          <span className="absolute end-2.5 top-12 rounded-full bg-sage px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-ink">{dict.priceRow.title}</span>
        )}
        <button
          type="button"
          aria-label={saved ? dict.product.wishlistRemove : dict.product.wishlistAdd}
          aria-pressed={!!saved}
          onClick={() => wishlist?.toggle(product.handle)}
          className={`absolute end-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full shadow-sm transition-all duration-300 active:scale-90 ${saved ? 'bg-coral text-white' : 'bg-card/95 text-foreground/70 hover:text-coral'}`}
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} strokeWidth={1.8} />
        </button>
        <Link
          href={href}
          className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-center justify-center gap-2 rounded-full bg-card/95 py-2 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] opacity-0 shadow transition-all duration-300 group-hover:opacity-100 max-sm:opacity-100"
        >
          <Eye className="h-3.5 w-3.5" /> {dict.product.details}
        </Link>
      </div>
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3 text-center">
        {product.vendor && <span className="label-xs">{product.vendor}</span>}
        <Link href={href} className="mt-1 font-display text-[0.98rem] leading-tight transition-colors hover:text-coral sm:text-lg">
          {product.title}
        </Link>
        <span className="mt-2 font-display text-base font-semibold tabular-nums">{formatPrice(product.price, product.currency, locale)}</span>
        {canAdd ? (
          <button
            type="button"
            onClick={() => { cart.add(product, 1); setAdded(true); setTimeout(() => setAdded(false), 1500); }}
            className={`mt-3 w-full rounded-full border-[1.5px] py-2.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] transition-colors duration-300 ${added ? 'border-sage bg-sage text-ink' : 'border-ink hover:bg-ink hover:text-white'}`}
          >
            {added ? dict.product.added : dict.product.add}
          </button>
        ) : null}
      </div>
    </article>
  );
}
