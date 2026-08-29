import Link from 'next/link';
import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/Breadcrumbs';
import Shelf from '@/components/Shelf';
import ProductCard from '@/components/ProductCard';
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
      <section className="section" style={{ paddingTop: 'clamp(40px, 6vw, 70px)' }}>
        <div className="wrap">
          <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.drops }]} />
          <Reveal>
            <div className="eyebrow">{t.eyebrow}</div>
            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>{t.title}</h1>
            <p className="lede" style={{ marginBottom: 40 }}>{t.lede}</p>
          </Reveal>
          <div className="grid grid-3">
            {bundles.map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} dict={dict} />
            ))}
          </div>
        </div>
      </section>

      {/* build your own bundle — WhatsApp */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="block sage" style={{ textAlign: 'center' }}>
              <h2>{t.buildTitle}</h2>
              <p className="lede" style={{ margin: '0 auto 26px', color: 'inherit' }}>{t.buildLede}</p>
              <a
                className="btn btn-ink"
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
              >
                {t.buildCta}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* small "new this month" strip */}
      {newest.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head">
              <Reveal><h2 style={{ marginBottom: 0 }}>{t.newTitle}</h2></Reveal>
              <Link href={`/${locale}/shop`} className="btn btn-ghost btn-sm">
                {dict.home.viewAll} <span className="arrow" aria-hidden="true">→</span>
              </Link>
            </div>
            <Reveal>
              <Shelf ariaLabel={t.newTitle}>
                {newest.map((p) => (
                  <ProductCard key={p.id} product={p} locale={locale} dict={dict} />
                ))}
              </Shelf>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
