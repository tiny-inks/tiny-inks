import Link from 'next/link';
import PromoCarousel from '@/components/PromoCarousel';
import ProductMarquee from '@/components/ProductMarquee';
import Reveal from '@/components/Reveal';
import ProductCard from '@/components/ProductCard';
import PhotoFrame from '@/components/PhotoFrame';
import Shelf from '@/components/Shelf';
import UspBar from '@/components/UspBar';
import { ShopByColor, ShopByPrice, GiftFinder, BulkBand, FaqShort } from '@/components/HomeSections';
import { RecentlyViewedRow } from '@/components/RecentlyViewed';
import { NewsletterForm } from '@/components/Forms';
import { getDict } from '@/lib/dictionaries';
import { getProducts, getCollections } from '@/lib/products';
import { FAQ } from '@/content/policies';
import { PHOTOS, IMAGES, imgAlt } from '@/lib/images';

/* tint fallback cycle for live collections that carry no demo color */
const TILE_TINTS = ['var(--blue)', 'var(--sage)', 'var(--cream)', 'var(--mustard)', 'var(--blush)', 'var(--terracotta)'];

const REVIEWS = {
  en: [
    { q: 'The colors are even better in real life. My desk finally feels like mine.', a: 'Noor · Abu Dhabi' },
    { q: 'Ordered as a gift, kept it for myself. Ordering again. Sorry, Sara.', a: 'Maha · Dubai' },
    { q: 'Thick paper, zero ghosting, and the wrapping made me gasp.', a: 'Lina · Sharjah' },
  ],
  ar: [
    { q: 'الألوان أجمل على الحقيقة. مكتبي أخيرًا صار يشبهني.', a: 'نور · أبوظبي' },
    { q: 'طلبته كهدية واحتفظت به لنفسي. سأطلب مرة أخرى. آسفة يا سارة.', a: 'مها · دبي' },
    { q: 'ورق سميك، ولا يظهر الحبر من الخلف، والتغليف أدهشني.', a: 'لينا · الشارقة' },
  ],
};

const PROMO_META = [
  { bg: 'var(--sage)', href: '/shop', photo: PHOTOS.pensCase },
  { bg: 'var(--blush)', href: '/bundles', photo: PHOTOS.giftBlush },
];

function ProductRow({ id, eyebrow, title, cta, href, products, locale, dict }) {
  return (
    <section className="section row-section" id={id}>
      <div className="wrap">
        <div className="section-head">
          <Reveal>
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            <h2 style={{ marginBottom: 0 }}>{title}</h2>
          </Reveal>
          <Link href={href} className="btn btn-ghost btn-sm">
            {cta} <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
        <Reveal>
          <Shelf ariaLabel={title}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} dict={dict} />
            ))}
          </Shelf>
        </Reveal>
      </div>
    </section>
  );
}

export default async function Home({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const [products, collections] = await Promise.all([
    getProducts(locale),
    getCollections(locale),
  ]);
  const bestsellers = products.filter((p) => p.tags?.includes('bestseller')).slice(0, 8);
  const shelf = bestsellers.length >= 3 ? bestsellers : products.slice(0, 8);
  const newest = [...products]
    .filter((p) => p.available)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);
  const bundles = products.filter((p) => p.tags?.includes('bundle'));
  const reviews = REVIEWS[locale];
  /* short FAQ: delivery time, delivery cost, returns, gift wrap, bulk */
  const faqAll = FAQ[locale].items;
  const faqShort = [faqAll[0], faqAll[1], faqAll[4], faqAll[2], faqAll[7]].filter(Boolean);

  return (
    <>
      <PromoCarousel dict={dict} locale={locale} />
      <UspBar dict={dict} />

      {/* two wide promo tiles */}
      <section className="section row-section">
        <div className="wrap promo-tiles">
          {dict.promos.map((promo, i) => {
            const meta = PROMO_META[i];
            return (
              <Reveal key={i} delay={i * 0.08}>
                <Link href={`/${locale}${meta.href}`} className="promo-tile" style={{ background: meta.bg }}>
                  <span>
                    <h3>{promo.title}</h3>
                    <p>{promo.line}</p>
                    <span className="btn btn-ink btn-sm">{promo.cta}</span>
                  </span>
                  <img src={meta.photo.sm || meta.photo.url} alt={imgAlt(meta.photo, locale)} loading="lazy" />
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* infinite product-photo loop */}
      <ProductMarquee products={products} locale={locale} label={dict.marqueeRow.label} />

      <ProductRow
        id="best-sellers"
        eyebrow={dict.home.bestEyebrow}
        title={dict.home.bestTitle}
        cta={dict.home.viewAll}
        href={`/${locale}/shop`}
        products={shelf}
        locale={locale}
        dict={dict}
      />

      {/* 1 — shop by color (signature) */}
      <ShopByColor dict={dict} locale={locale} />

      {/* 2 — shop by price */}
      <ShopByPrice dict={dict} locale={locale} />

      {/* 3 — gift finder */}
      <GiftFinder dict={dict} locale={locale} />

      {/* 4 — bulk & school orders */}
      <BulkBand dict={dict} />

      {/* 5 — recently viewed (hidden while empty) */}
      <RecentlyViewedRow products={products} dict={dict} locale={locale} />

      {/* 6 — short FAQ */}
      <FaqShort dict={dict} locale={locale} items={faqShort} />

      {/* category grid */}
      <section className="section row-section">
        <div className="wrap">
          <Reveal>
            <div className="eyebrow">{dict.home.categoriesEyebrow}</div>
            <h2>{dict.home.categoriesTitle}</h2>
          </Reveal>
          <div className="tiles tiles-cats" style={{ marginTop: 22 }}>
            {collections.map((c, i) => {
              const count = products.filter((p) => p.collections?.includes(c.handle)).length;
              return (
                <Reveal key={c.handle} delay={Math.min(i * 0.05, 0.3)}>
                  <Link href={`/${locale}/shop/${c.handle}`} className="tile">
                    <div className="tile-media">
                      {c.image?.url ? (
                        <img src={c.image.url} alt={c.image.alt || c.title} loading="lazy" />
                      ) : (
                        <span className="card-noimg" aria-hidden="true">✦</span>
                      )}
                      <div className="tile-tint" style={{ background: c.color || TILE_TINTS[i % TILE_TINTS.length] }} />
                      <div className="tile-overlay">
                        <h3>{c.title}</h3>
                        <p>{count} {dict.shop.results}</p>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <ProductRow
        eyebrow={dict.home.newEyebrow}
        title={dict.home.newTitle}
        cta={dict.home.viewAll}
        href={`/${locale}/shop`}
        products={newest}
        locale={locale}
        dict={dict}
      />

      <ProductRow
        eyebrow={dict.home.bundlesEyebrow}
        title={dict.home.bundlesTitle}
        cta={dict.home.bundlesCta}
        href={`/${locale}/bundles`}
        products={bundles}
        locale={locale}
        dict={dict}
      />

      {/* reviews */}
      <section className="section row-section">
        <div className="wrap">
          <Reveal><h2>{dict.home.reviewsTitle}</h2></Reveal>
          <div className="cards-3" style={{ marginTop: 22 }}>
            {reviews.map((r, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="review">
                  <div className="stars">★★★★★</div>
                  <p>“{r.q}”</p>
                  <span>{r.a}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* newsletter */}
      <section className="section row-section">
        <div className="wrap">
          <Reveal>
            <div className="block cream grain" style={{ textAlign: 'center' }}>
              <h2>{dict.home.newsTitle}</h2>
              <p className="lede" style={{ margin: '0 auto 26px' }}>{dict.home.newsLede}</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <NewsletterForm dict={dict} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* instagram polaroids — last */}
      <section className="section row-section" style={{ paddingBottom: 10 }}>
        <div className="wrap">
          <div className="section-head">
            <Reveal><h2 style={{ marginBottom: 0 }}>{dict.home.igTitle}</h2></Reveal>
            <a
              href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#'}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              {dict.home.igHandle}
            </a>
          </div>
          <Reveal stagger className="ig-strip">
            {IMAGES.polaroids.map((photo, i) => (
              <PhotoFrame
                key={i}
                photo={photo}
                locale={locale}
                variant="polaroid"
                caption={dict.home.polaroids[i]}
              />
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}
