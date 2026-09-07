import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import ProductCard from '@/components/ProductCard';
import { withGridImages } from '@/lib/product-images';
import { getDict } from '@/lib/dictionaries';
import { getProducts, getCollectionWithProducts } from '@/lib/products';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.drops.title, description: dict.drops.lede };
}

export default async function BundlesPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.drops;
  const products = await getProducts(locale);
  let bundles = products.filter((p) => p.tags?.includes('bundle'));
  if (bundles.length === 0) {
    const gs = await getCollectionWithProducts('gift-sets', locale);
    bundles = gs?.products || [];
  }
  if (bundles.length === 0) {
    bundles = [...products].filter((p) => p.available && p.price >= 50).slice(0, 6);
  }
  const newest = [...products]
    .filter((p) => p.available && !p.tags?.includes('bundle'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '971500000000';

  return (
    <>
      <section className="overflow-hidden bg-blush pb-10 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.drops }]} />
          <span className="eyebrow-new mt-4 text-ink/70">{t.eyebrow}</span>
          <h1 className="display-xl mt-3 max-w-[16ch] text-ink">{t.title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/75 sm:text-base">{t.lede}</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-3">
          {withGridImages(bundles).map(([p, image], i) => (
            <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={image} index={i} />
          ))}
        </div>
      </section>

      {/* build your own bundle — WhatsApp */}
      <section className="mx-auto max-w-[1240px] px-5 pb-12 sm:px-8 sm:pb-16">
        <div className="rounded-3xl bg-sage p-10 text-center text-ink sm:p-14">
          <h2 className="display-md">{t.buildTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/80">{t.buildLede}</p>
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-white transition-transform hover:scale-[1.03]"
          >
            {t.buildCta}
          </a>
        </div>
      </section>

      {/* small "new this month" strip */}
      {newest.length > 0 && (
        <section className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8 sm:pb-24">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display-md">{t.newTitle}</h2>
            <Link href={`/${locale}/shop`} className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-coral underline underline-offset-4">
              {dict.home.viewAll}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-4">
            {withGridImages(newest).map(([p, image], i) => (
              <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={image} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
