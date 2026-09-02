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
    <section className="section" style={{ paddingTop: 'clamp(24px, 4vw, 44px)' }}>
      <div className="wrap" style={{ maxWidth: 680 }}>
        <Suspense fallback={null}>
          <OrderConfirmed dict={dict} locale={locale} business={getBusiness()} />
        </Suspense>
      </div>
    </section>
  );
}
