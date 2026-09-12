import { Suspense } from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';
import CheckoutClient from '@/components/checkout/CheckoutClient';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';
import { checkoutStatus } from '@/lib/checkout-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.checkout.title, robots: { index: false } };
}

export default function CheckoutPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  /* Public checkout config, resolved on the server so the client no longer
     needs a mount-time GET /api/checkout/quote. Only browser-safe values:
     the enabled flags and the PUBLISHABLE key (NEXT_PUBLIC_, never a secret). */
  const s = checkoutStatus();
  const checkoutConfig = { stripe: s.stripe, cod: s.cod, publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null };
  /* pb-24 on phones clears the fixed order-summary bar pinned to the bottom;
     on lg the summary becomes a sticky sidebar instead, so that clearance is
     dead space (it was pb-40 = 160px) and the page returns to normal rhythm. */
  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-44 pt-8 sm:px-8 sm:pt-12 lg:pb-20">
      <Breadcrumbs dict={dict} locale={locale} items={[{ href: `/${locale}/cart`, label: dict.cart }, { label: dict.checkout.title }]} />
      <h1 className="display-lg mt-4">{dict.checkout.title}</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{dict.checkout.lede}</p>
      <div className="mt-10">
        <Suspense fallback={null}>
          <CheckoutClient dict={dict} locale={locale} business={getBusiness()} checkoutConfig={checkoutConfig} />
        </Suspense>
      </div>
    </section>
  );
}
