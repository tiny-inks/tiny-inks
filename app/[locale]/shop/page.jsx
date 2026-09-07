import { Suspense } from 'react';
import ShopClient from '@/components/ShopClient';
import SkeletonGrid from '@/components/SkeletonGrid';
import { getDict } from '@/lib/dictionaries';
import { getProducts, getCollections } from '@/lib/products';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.shop.title, description: dict.shop.lede };
}

export default async function ShopPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const [products, collections] = await Promise.all([getProducts(locale), getCollections(locale)]);
  /* SAFETY NET: this page always lists getProducts() — every product,
     whether or not it belongs to any collection. Counts are informational. */
  const withCounts = collections.map((c) => ({
    ...c,
    count: products.filter((p) => p.collections?.includes(c.handle)).length,
  }));

  return (
    <>
      <section className="overflow-hidden bg-sky py-12 sm:py-16">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="eyebrow-new text-ink/70">{dict.shop.title}</span>
              <h1 className="display-lg mt-3 text-ink">{dict.shop.title}</h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/75 sm:text-base">{dict.shop.lede}</p>
            </div>
            <div className="hidden h-16 w-16 shrink-0 rounded-full bg-sun lg:block" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:py-16">
        <Suspense fallback={<SkeletonGrid />}>
          <ShopClient products={products} dict={dict} locale={locale} collections={withCounts} />
        </Suspense>
      </section>
    </>
  );
}
