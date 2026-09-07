'use client';
import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import { assignGridImages } from '@/lib/product-images';
import { useWishlist } from './WishlistContext';

export default function WishlistClient({ products, dict, locale, collections = [] }) {
  const wishlist = useWishlist();
  const saved = products.filter((p) => wishlist?.has(p.handle));

  if (saved.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState dict={dict} locale={locale} collections={collections} title={dict.cartUi.empty} cta={dict.cartUi.emptyCta} ctaHref={`/${locale}/shop`} />
      </div>
    );
  }

  const gridImages = assignGridImages(saved);
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {saved.map((p, i) => (
        <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={gridImages[p.handle]} index={i} />
      ))}
    </div>
  );
}
