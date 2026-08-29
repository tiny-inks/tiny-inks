import Reveal from '@/components/Reveal';
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
    <section className="section" style={{ paddingTop: 'clamp(40px, 6vw, 70px)' }}>
      <div className="wrap">
        <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.cart }]} />
        <Reveal>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}>{dict.cart}</h1>
          <p className="lede" style={{ marginBottom: 40 }}>{dict.cartPage.lede}</p>
        </Reveal>
        <CartPageClient dict={dict} locale={locale} collections={collections} />
      </div>
    </section>
  );
}
