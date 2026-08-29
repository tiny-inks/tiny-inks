import { Suspense } from 'react';
import ShopClient from '@/components/ShopClient';
import SkeletonGrid from '@/components/SkeletonGrid';
import CollectionChips from '@/components/CollectionChips';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getDict } from '@/lib/dictionaries';
import { getProducts, getCollections } from '@/lib/products';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.shop.title, description: dict.shop.lede };
}

export default async function ShopPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const [products, collections] = await Promise.all([
    getProducts(locale),
    getCollections(locale),
  ]);
  /* SAFETY NET: this page always lists getProducts() — every product,
     whether or not it belongs to any collection. Counts are informational. */
  const withCounts = collections.map((c) => ({
    ...c,
    count: products.filter((p) => p.collections?.includes(c.handle)).length,
  }));

  return (
    <section className="section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)' }}>
      <div className="wrap">
        <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.shop }]} />
        <h1 className="shop-h1">{dict.shop.title}</h1>
        <CollectionChips collections={withCounts} locale={locale} dict={dict} />
        <Suspense fallback={<SkeletonGrid />}>
          <ShopClient
            products={products}
            dict={dict}
            locale={locale}
            collections={withCounts}
          />
        </Suspense>
      </div>
    </section>
  );
}
