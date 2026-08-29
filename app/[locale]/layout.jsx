import '../globals.css';
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
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        {/* self-hosted fonts (public/fonts) — preload the ones this locale paints first */}
        {(locale === 'ar'
          ? ['/fonts/el-messiri-arabic.woff2', '/fonts/plex-arabic-arabic-400.woff2']
          : ['/fonts/fraunces-latin.woff2', '/fonts/karla-latin.woff2']
        ).map((href) => (
          <link key={href} rel="preload" as="font" type="font/woff2" href={href} crossOrigin="anonymous" />
        ))}
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
            <CartDrawer dict={dict} locale={locale} collections={collections} />
            <BottomNav dict={dict} locale={locale} />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
