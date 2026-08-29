'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';
import Placeholder from './Placeholder';
import { formatPrice } from '@/lib/products';
import { productImage } from '@/lib/product-images';

/* Photo-led card: square image is the hero (~70% of the card), then a 2-line
   name, then a bold price with the round quick-add beside it. Nothing else —
   the only badge is Sold out; the heart lives on the photo. */
export default function ProductCard({ product, locale, dict, image }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const [added, setAdded] = useState(false);
  /* real Shopify image → category photo → coloured placeholder */
  const img = image || productImage(product);
  const href = `/${locale}/product/${product.handle}`;
  const saved = wishlist?.has(product.handle);
  const canAdd = product.available && product.variantId;

  return (
    <div className={`mcard ${!product.available ? 'is-soldout' : ''}`}>
      <div className="mcard-media">
        <Link href={href} className="card-media-link" aria-label={product.title} tabIndex={-1}>
          {img?.url ? (
            <img className={`main ${img.fallback ? 'is-fallback' : ''}`} src={img.url} alt={product.title} loading="lazy" />
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
        {!product.available && <span className="badge soldout">{dict.product.soldout}</span>}
      </div>
      <div className="mcard-info">
        <Link href={href} className="mcard-title">{product.title}</Link>
        <div className="mcard-foot">
          <span className="mcard-price">{formatPrice(product.price, product.currency, locale)}</span>
          {canAdd ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
