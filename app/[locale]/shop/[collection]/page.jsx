import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ShopClient from '@/components/ShopClient';
import SkeletonGrid from '@/components/SkeletonGrid';
import Breadcrumbs from '@/components/Breadcrumbs';
import { collectionTileImage, collectionPhrase } from '@/components/CollectionGrid';
import { getDict } from '@/lib/dictionaries';
import { getProducts, getCollections, getCollectionWithProducts } from '@/lib/products';

export async function generateMetadata({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const data = await getCollectionWithProducts(params.collection, locale);
  if (!data) return { title: dict.shop.title };
  return { title: `${data.collection.title} · ${dict.shop.title}`, description: dict.shop.lede };
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
    <>
      <section className="relative overflow-hidden bg-secondary">
        {banner && <img src={banner.url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-ink/5" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20">
          <Breadcrumbs dict={dict} locale={locale} items={[{ href: `/${locale}/shop`, label: dict.nav.shop }, { label: data.collection.title }]} className="text-white/80" />
          <span className="eyebrow-new mt-4 text-sun">{collectionPhrase(data.collection, dict)}</span>
          <h1 className="display-lg mt-2 max-w-xl text-white">{data.collection.title}</h1>
          <p className="mt-3 max-w-lg text-sm text-white/85 sm:text-base">{lede}</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:py-16">
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
      </section>
    </>
  );
}
