import '../globals.css';
import { getDict, LOCALES } from '@/lib/dictionaries';
import { getCollections, getProducts } from '@/lib/products';
import { SITE_URL } from '@/lib/site';
import { CartProvider } from '@/components/CartContext';
import { WishlistProvider } from '@/components/WishlistContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Toaster } from 'sonner';


export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const locale = LOCALES.includes(params.locale) ? params.locale : 'en';
  const dict = getDict(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `Tiny Inks — ${dict.tagline}`,
      template: '%s · Tiny Inks',
    },
    description: dict.hero.lede,
    icons: { icon: '/logo-icon.png' },
    alternates: {
      languages: { en: '/en', ar: '/ar' },
    },
    openGraph: {
      siteName: 'Tiny Inks',
      locale: locale === 'ar' ? 'ar_AE' : 'en_AE',
      type: 'website',
      images: ['/logo-full.png'],
    },
  };
}

export const viewport = { themeColor: '#FBF0E4' };

export default async function LocaleLayout({ children, params }) {
  const locale = LOCALES.includes(params.locale) ? params.locale : 'en';
  const dict = getDict(locale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const [collections, products] = await Promise.all([getCollections(locale), getProducts(locale)]);
  /* real vendor names, most-stocked first, for the mega menu + brand strips */
  const vendorCount = new Map();
  products.forEach((p) => { if (p.vendor && p.vendor !== 'Tiny Inks') vendorCount.set(p.vendor, (vendorCount.get(p.vendor) || 0) + 1); });
  const brands = [...vendorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9).map(([n]) => n);

  return (
    <html
      lang={locale}
      dir={dir}
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900&family=Cairo:wght@500;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap"
        />
      </head>
      <body className="brand-new">
        <a className="skip-link" href="#content">
          {locale === 'ar' ? 'تخطَّ إلى المحتوى' : 'Skip to content'}
        </a>
        <CartProvider>
          <WishlistProvider>
            <Header dict={dict} locale={locale} collections={collections} brands={brands} />
            <main id="content">{children}</main>
            <Footer dict={dict} locale={locale} collections={collections} />
            <CartDrawer dict={dict} locale={locale} collections={collections} />
            <Toaster position={locale === 'ar' ? 'top-left' : 'top-right'} richColors dir={dir} />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
