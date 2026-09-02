import { Suspense } from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';
import CheckoutClient from '@/components/checkout/CheckoutClient';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.checkout.title, robots: { index: false } };
}

export default function CheckoutPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  return (
    <section className="section print-section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)' }}>
      <div className="wrap">
        <Breadcrumbs dict={dict} locale={locale} items={[{ href: `/${locale}/cart`, label: dict.cart }, { label: dict.checkout.title }]} />
        <header className="print-head" style={{ marginBottom: 14 }}>
          <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)' }}>{dict.checkout.title}</h1>
          <p className="lede">{dict.checkout.lede}</p>
        </header>
        <Suspense fallback={null}>
          <CheckoutClient dict={dict} locale={locale} business={getBusiness()} />
        </Suspense>
      </div>
    </section>
  );
}
