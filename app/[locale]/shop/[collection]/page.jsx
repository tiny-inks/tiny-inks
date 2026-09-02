import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ShopClient from '@/components/ShopClient';
import SkeletonGrid from '@/components/SkeletonGrid';
import CollectionChips from '@/components/CollectionChips';
import Breadcrumbs from '@/components/Breadcrumbs';
import { collectionTileImage, collectionPhrase } from '@/components/CollectionGrid';
import { getDict } from '@/lib/dictionaries';
import { getProducts, getCollections, getCollectionWithProducts } from '@/lib/products';

export async function generateMetadata({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const data = await getCollectionWithProducts(params.collection, locale);
  if (!data) return { title: dict.shop.title };
  return {
    title: `${data.collection.title} · ${dict.shop.title}`,
    description: dict.shop.lede,
  };
}

export default async function CollectionPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const [data, collections, allProducts] = await Promise.all([
    getCollectionWithProducts(params.collection, locale),
    getCollections(locale),
    getProducts(locale),
  ]);
  if (!data) notFound();

  const withCounts = collections.map((c) => ({
    ...c,
    count: allProducts.filter((p) => p.collections?.includes(c.handle)).length,
  }));

  const banner = collectionTileImage(data.collection);
  const lede = data.collection.description || dict.shop.collectionLede.replace('{name}', data.collection.title);
  return (
    <section className="section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)' }}>
      <div className="wrap">
        <Breadcrumbs dict={dict} locale={locale} items={[{ href: `/${locale}/shop`, label: dict.nav.shop }, { label: data.collection.title }]} />
        {/* Citron-style collection banner: photo, scrim, phrase + name + description */}
        <div className="cat-hero">
          {banner && <img src={banner.url} alt="" />}
          <span className="cat-hero-scrim" aria-hidden="true" />
          <div className="cat-hero-copy">
            <small>{collectionPhrase(data.collection, dict)}</small>
            <h1 className="shop-h1">{data.collection.title}</h1>
            <p>{lede}</p>
          </div>
        </div>
        <CollectionChips collections={withCounts} current={data.collection.handle} locale={locale} dict={dict} />
        <Suspense fallback={<SkeletonGrid />}>
          <ShopClient
            products={data.products}
            dict={dict}
            locale={locale}
            collections={withCounts}
            currentCollection={data.collection.handle}
            collectionTitle={data.collection.title}
          />
        </Suspense>
      </div>
    </section>
  );
}
