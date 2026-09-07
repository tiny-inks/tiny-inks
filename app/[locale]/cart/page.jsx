import CartPageClient from '@/components/CartPageClient';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getDict } from '@/lib/dictionaries';
import { getCollections } from '@/lib/products';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.cartUi.title, description: dict.cartPage.lede };
}

export default async function CartPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const collections = await getCollections(locale);

  return (
    <section className="mx-auto max-w-[1240px] px-4 py-10 sm:px-8 sm:py-16">
      <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.cart }]} />
      <h1 className="display-lg mt-4">{dict.cart}</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{dict.cartPage.lede}</p>
      <div className="mt-10">
        <CartPageClient dict={dict} locale={locale} collections={collections} />
      </div>
    </section>
  );
}
