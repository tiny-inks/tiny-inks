import '../globals.css';
import { Fraunces, Karla, El_Messiri, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { getDict, LOCALES } from '@/lib/dictionaries';
import { getCollections } from '@/lib/products';
import { SITE_URL } from '@/lib/site';
import { CartProvider } from '@/components/CartContext';
import { WishlistProvider } from '@/components/WishlistContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import BottomNav from '@/components/BottomNav';
import ScrollProgress from '@/components/ScrollProgress';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--f-fraunces',
  display: 'swap',
});
const karla = Karla({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--f-karla',
  display: 'swap',
});
const messiri = El_Messiri({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--f-messiri',
  display: 'swap',
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--f-plexar',
  display: 'swap',
});

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
  const collections = await getCollections(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fraunces.variable} ${karla.variable} ${messiri.variable} ${plexArabic.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body>
        <a className="skip-link" href="#content">
          {locale === 'ar' ? 'تخطَّ إلى المحتوى' : 'Skip to content'}
        </a>
        <CartProvider>
          <WishlistProvider>
            <ScrollProgress />
            <Header dict={dict} locale={locale} collections={collections} />
            <main id="content">{children}</main>
            <Footer dict={dict} locale={locale} collections={collections} />
            <CartDrawer dict={dict} locale={locale} />
            <BottomNav dict={dict} locale={locale} />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
