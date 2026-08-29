'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';
import Placeholder from './Placeholder';
import { formatPrice } from '@/lib/products';

/* Dense marketplace card: white, 1px border, 4:3 photo (or designed
   placeholder), prominent price, always-visible round terracotta quick-add. */
export default function ProductCard({ product, locale, dict }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const [added, setAdded] = useState(false);
  const imgA = product.images?.[0]?.url;
  const imgB = product.images?.[1]?.url || imgA;
  const href = `/${locale}/product/${product.handle}`;
  const saved = wishlist?.has(product.handle);

  /* badge priority: sold out > free shipping (≥150) > bestseller > gift set */
  let badge = null;
  if (!product.available) badge = { cls: 'soldout', label: dict.product.soldout };
  else if (product.price >= 150) badge = { cls: 'drop', label: dict.badge.freeShipping };
  else if (product.tags?.includes('bestseller')) badge = { cls: '', label: dict.product.bestseller };
  else if (product.tags?.includes('bundle')) badge = { cls: 'drop', label: dict.product.dropBadge };

  return (
    <div className="mcard">
      <div className="mcard-media">
        <Link href={href} className="card-media-link" aria-label={product.title} tabIndex={-1}>
          {imgA ? (
            <>
              <img className="main" src={imgA} alt={product.title} loading="lazy" />
              {imgB !== imgA && <img className="alt" src={imgB} alt="" loading="lazy" aria-hidden="true" />}
            </>
          ) : (
            <Placeholder handle={product.handle} title={product.title} label={dict.cartUi.noImage} />
          )}
        </Link>
        <button
          className={`wish-btn ${saved ? 'on' : ''}`}
          onClick={() => wishlist?.toggle(product.handle)}
          aria-label={saved ? dict.product.wishlistRemove : dict.product.wishlistAdd}
          aria-pressed={!!saved}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21C7 16.5 3 13.2 3 9.3 3 6.9 4.9 5 7.3 5c1.7 0 3.3.9 4.7 2.8C13.4 5.9 15 5 16.7 5 19.1 5 21 6.9 21 9.3c0 3.9-4 7.2-9 11.7z" />
          </svg>
        </button>
        {badge && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
        {product.available && product.variantId && (
          <button
            className={`quick-add-btn ${added ? 'ok' : ''}`}
            onClick={() => {
              cart.add(product, 1);
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }}
            aria-label={`${dict.product.add}: ${product.title}`}
          >
            {added ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            )}
          </button>
        )}
      </div>
      <Link href={href} className="mcard-info">
        <div className="card-type">{product.vendor || product.productType}</div>
        <div className="mcard-title">{product.title}</div>
        <div className="mcard-price-row">
          <span className="mcard-price">{formatPrice(product.price, product.currency, locale)}</span>
          {product.compareAtPrice ? (
            <span className="mcard-compare">{formatPrice(product.compareAtPrice, product.currency, locale)}</span>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
