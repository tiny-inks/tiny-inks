'use client';
import Link from 'next/link';
import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import { assignGridImages } from '@/lib/product-images';
import { useWishlist } from './WishlistContext';

export default function WishlistClient({ products, dict, locale, collections = [] }) {
  const wishlist = useWishlist();
  const saved = products.filter((p) => wishlist?.has(p.handle));

  if (saved.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <EmptyState dict={dict} locale={locale} collections={collections} title={dict.cartUi.empty} cta={dict.cartUi.emptyCta} ctaHref={`/${locale}/shop`} />
      </div>
    );
  }

  const gridImages = assignGridImages(saved);
  return (
    <div className="grid">
      {saved.map((p) => (
        <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={gridImages[p.handle]} />
      ))}
    </div>
  );
}
