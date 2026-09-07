import { Suspense } from 'react';
import OrderConfirmed from '@/components/checkout/OrderConfirmed';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.checkout.confirmedTitle, robots: { index: false } };
}

export default function OrderConfirmedPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  return (
    <Suspense fallback={null}>
      <OrderConfirmed dict={dict} locale={locale} business={getBusiness()} />
    </Suspense>
  );
}
