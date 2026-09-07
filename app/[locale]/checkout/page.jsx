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
    <section className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:pb-40">
      <Breadcrumbs dict={dict} locale={locale} items={[{ href: `/${locale}/cart`, label: dict.cart }, { label: dict.checkout.title }]} />
      <h1 className="display-lg mt-4">{dict.checkout.title}</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{dict.checkout.lede}</p>
      <div className="mt-10">
        <Suspense fallback={null}>
          <CheckoutClient dict={dict} locale={locale} business={getBusiness()} />
        </Suspense>
      </div>
    </section>
  );
}
