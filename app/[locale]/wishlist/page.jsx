import WishlistClient from '@/components/WishlistClient';
import { getDict } from '@/lib/dictionaries';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getProducts, getCollections } from '@/lib/products';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.nav.wishlist };
}

export default async function WishlistPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const [products, collections] = await Promise.all([getProducts(locale), getCollections(locale)]);

  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
      <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.wishlist }]} />
      <h1 className="display-lg mt-4">{dict.nav.wishlist}</h1>
      <div className="mt-10">
        <WishlistClient products={products} dict={dict} locale={locale} collections={collections} />
      </div>
    </section>
  );
}
