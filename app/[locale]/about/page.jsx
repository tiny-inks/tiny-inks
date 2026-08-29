import Link from 'next/link';
import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getDict } from '@/lib/dictionaries';
import { getProducts, getCollections } from '@/lib/products';
import { getBusiness } from '@/lib/site';
import { collectionTileImage } from '@/components/CollectionGrid';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.nav.about, description: dict.about.intro };
}

/* photo wall: category stock photos (owner swaps for real shop photos) */
const WALL = [
  { src: '/products/desk-tools-4.webp', span: 'tall' },
  { src: '/products/gift-sets-bundles-1.webp' },
  { src: '/products/pens-pencils-4.webp' },
  { src: '/products/notebooks-books-2.webp', span: 'wide' },
  { src: '/products/stickers-sticky-notes-1.webp' },
];

const WHY_ICONS = ['✦', '◆', '⚡', '❀', '▣', '☎'];

export default async function AboutPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.about;
  const b = getBusiness();
  const [products, collections] = await Promise.all([getProducts(locale), getCollections(locale)]);

  /* brands carried — straight from the catalogue's vendor field (real Shopify data) */
  const vendorCount = new Map();
  products.forEach((p) => { if (p.vendor) vendorCount.set(p.vendor, (vendorCount.get(p.vendor) || 0) + 1); });
  const brands = [...vendorCount.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 16);

  return (
    <>
      {/* 1 — who we are */}
      <section className="section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)', paddingBottom: 'clamp(30px, 5vw, 60px)' }}>
        <div className="wrap" style={{ marginBottom: 18 }}>
          <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.about }]} />
        </div>
        <div className="wrap split wide-start">
          <Reveal>
            <div className="eyebrow">{t.eyebrow}</div>
            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}>{t.title}</h1>
            <p className="lede">{t.intro}</p>
            <p className="lede">{t.intro2}</p>
            <div className="about-ctas">
              <Link href={`/${locale}/shop`} className="btn btn-primary">{t.ctaShop}</Link>
              <Link href={`/${locale}/contact`} className="btn">{t.ctaContact}</Link>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="about-shopcard grain">
              <img src="/logo-icon.png" alt="" />
              <h3>{t.shopTitle}</h3>
              <p>{t.shopText}</p>
              <p className="about-address">
                <strong>{dict.contact.visit}:</strong> {b.address || dict.contact.addressFallback}
                <br />
                <strong>{dict.contact.hours}:</strong> {process.env.NEXT_PUBLIC_SHOP_HOURS || dict.contact.hoursText}
              </p>
              <a href={b.mapsHref} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">{dict.contact.map}</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2 — what we sell */}
      <section className="section row-section">
        <div className="wrap">
          <div className="section-head">
            <Reveal>
              <div className="eyebrow">{t.sellEyebrow}</div>
              <h2 style={{ marginBottom: 0 }}>{t.sellTitle}</h2>
            </Reveal>
            <Link href={`/${locale}/shop`} className="btn btn-ghost btn-sm">{dict.home.viewAll} <span className="arrow" aria-hidden="true">→</span></Link>
          </div>
          <p className="lede" style={{ marginBottom: 22 }}>{t.sellText}</p>
          <div className="about-cols">
            {collections.map((c) => {
              const img = collectionTileImage(c);
              return (
                <Link key={c.handle} href={`/${locale}/shop/${c.handle}`} className="about-col">
                  {img ? <img src={img.url} alt="" loading="lazy" /> : <span className="about-col-solid" aria-hidden="true">✦</span>}
                  <span>{c.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 — why buy from us */}
      <section className="section row-section">
        <div className="wrap">
          <Reveal>
            <div className="eyebrow">{t.whyEyebrow}</div>
            <h2>{t.whyTitle}</h2>
          </Reveal>
          <div className="why-cards">
            {t.why.map((w, i) => (
              <Reveal key={i} delay={Math.min(i * 0.06, 0.3)}>
                <div className="why-card">
                  <span className="why-glyph" aria-hidden="true">{WHY_ICONS[i % WHY_ICONS.length]}</span>
                  <h3>{w.t}</h3>
                  <p>{w.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — brands */}
      {brands.length > 0 && (
        <section className="section row-section">
          <div className="wrap">
            <Reveal>
              <div className="eyebrow">{t.brandsEyebrow}</div>
              <h2>{t.brandsTitle}</h2>
              <p className="lede" style={{ marginBottom: 22 }}>{t.brandsText}</p>
            </Reveal>
            <div className="brand-cloud">
              {brands.map((name) => (
                <Link key={name} href={`/${locale}/shop?brand=${encodeURIComponent(name)}`} className="brand-pill">{name}</Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5 — photos */}
      <section className="section row-section">
        <div className="wrap">
          <Reveal>
            <div className="eyebrow">{t.photosEyebrow}</div>
            <h2>{t.photosTitle}</h2>
          </Reveal>
          <div className="photo-wall">
            {WALL.map((p, i) => (
              <figure key={i} className={`photo-cell ${p.span || ''}`}>
                <img src={p.src} alt={t.photoAlts[i] || ''} loading="lazy" />
              </figure>
            ))}
          </div>
          <p className="field-note" style={{ marginTop: 12 }}>{t.photosNote}</p>
        </div>
      </section>

      {/* 6 — CTA band */}
      <section className="section row-section" style={{ paddingBottom: 'clamp(60px, 8vw, 100px)' }}>
        <div className="wrap">
          <Reveal>
            <div className="block cream grain about-cta">
              <h2>{t.ctaTitle}</h2>
              <p className="lede" style={{ margin: '0 auto 22px' }}>{t.ctaLede}</p>
              <div className="about-ctas" style={{ justifyContent: 'center' }}>
                <Link href={`/${locale}/shop`} className="btn btn-primary">{t.ctaShop}</Link>
                <Link href={`/${locale}/contact`} className="btn">{t.ctaContact}</Link>
                <a href={`${b.whatsappHref}?text=${encodeURIComponent(dict.footerUi.bulkMsg)}`} target="_blank" rel="noreferrer" className="btn btn-ghost">{dict.nav.bulk}</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
