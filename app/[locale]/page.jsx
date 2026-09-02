import Link from 'next/link';
import PromoCarousel from '@/components/PromoCarousel';
import ProductMarquee from '@/components/ProductMarquee';
import Reveal from '@/components/Reveal';
import ProductCard from '@/components/ProductCard';
import { withGridImages } from '@/lib/product-images';
import PhotoFrame from '@/components/PhotoFrame';
import Shelf from '@/components/Shelf';
import UspBar from '@/components/UspBar';
import TabbedRows from '@/components/TabbedRows';
import { ShopByColor, ShopByPrice, GiftFinder, BulkBand, FaqShort } from '@/components/HomeSections';
import { RecentlyViewedRow } from '@/components/RecentlyViewed';
import { NewsletterForm } from '@/components/Forms';
import { getDict } from '@/lib/dictionaries';
import VideoLoop from '@/components/VideoLoop';
import { getProducts, getCollections, getCollectionWithProducts } from '@/lib/products';
import { FAQ } from '@/content/policies';
import { PHOTOS, IMAGES, imgAlt } from '@/lib/images';

/* PLACEHOLDER REVIEWS — clearly not real yet. Replace with genuine customer
   reviews (name · city · product · quote) before launch; the "Verified" tag
   must only ever appear on real, verifiable purchases. */
const REVIEWS = {
  en: [
    { q: 'The colors are even better in real life. My desk finally feels like mine.', name: 'Noor', city: 'Abu Dhabi', product: 'The Everyday Notebook' },
    { q: 'Ordered as a gift, kept it for myself. Ordering again. Sorry, Sara.', name: 'Maha', city: 'Dubai', product: 'First Ink Gift Box' },
    { q: 'Thick paper, zero ghosting, and the wrapping made me gasp.', name: 'Lina', city: 'Sharjah', product: 'Daily Ritual Planner' },
  ],
  ar: [
    { q: 'الألوان أجمل على الحقيقة. مكتبي أخيرًا صار يشبهني.', name: 'نور', city: 'أبوظبي', product: 'دفتر اليوميات' },
    { q: 'طلبته كهدية واحتفظت به لنفسي. سأطلب مرة أخرى. آسفة يا سارة.', name: 'مها', city: 'دبي', product: 'علبة هدايا الحبر الأول' },
    { q: 'ورق سميك، ولا يظهر الحبر من الخلف، والتغليف أدهشني.', name: 'لينا', city: 'الشارقة', product: 'مخطط الروتين اليومي' },
  ],
};

const PROMO_META = [
  { bg: 'var(--sage)', href: '/shop', photo: PHOTOS.pensCase },
  { bg: 'var(--blush)', href: '/bundles', photo: PHOTOS.giftBlush },
];

function ProductRow({ id, eyebrow, title, cta, href, products, locale, dict }) {
  if (!products || products.length === 0) return null;
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
            {withGridImages(products).map(([p, image]) => (
              <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={image} />
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
  const byNewest = [...products]
    .filter((p) => p.available)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  /* rows never render empty: fall back to sensible picks when tags are absent */
  const bestsellers = products.filter((p) => p.tags?.includes('bestseller')).slice(0, 8);
  const shelf = bestsellers.length >= 3 ? bestsellers : byNewest.slice(8, 16).length >= 3 ? byNewest.slice(8, 16) : byNewest.slice(0, 8);
  const newest = byNewest.slice(0, 8);
  let bundles = products.filter((p) => p.tags?.includes('bundle'));
  if (bundles.length === 0 && collections.some((c) => c.handle === 'gift-sets')) {
    const gs = await getCollectionWithProducts('gift-sets', locale);
    bundles = gs?.products || [];
  }
  /* Citron-style tabbed "Shop by product" — real collections, 8 products each */
  const TAB_MATCH = [/notebook/i, /pen/i, /art/i, /gift/i];
  const tabCols = TAB_MATCH.map((rx) => collections.find((c) => rx.test(c.title) || rx.test(c.handle))).filter(Boolean);
  const tabs = (await Promise.all(tabCols.map(async (c) => {
    const data = await getCollectionWithProducts(c.handle, locale);
    return { key: c.handle, title: c.title, href: `/${locale}/shop/${c.handle}`, products: (data?.products || []).slice(0, 8) };
  }))).filter((t) => t.products.length > 0);

  /* real vendor names for the brand strip */
  const vendorCount = new Map();
  products.forEach((p) => { if (p.vendor && p.vendor !== 'Tiny Inks') vendorCount.set(p.vendor, (vendorCount.get(p.vendor) || 0) + 1); });
  const brands = [...vendorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n]) => n);

  const reviews = REVIEWS[locale];
  /* short FAQ: delivery time, delivery cost, returns, gift wrap, bulk */
  const faqAll = FAQ[locale].items;
  const faqShort = [faqAll[0], faqAll[1], faqAll[4], faqAll[2], faqAll[7]].filter(Boolean);

  return (
    <>
      {/* 1 — hero / promo carousel with the offers */}
      <PromoCarousel dict={dict} locale={locale} />

      {/* 2 — trust row */}
      <UspBar dict={dict} />

      {/* 2b — Citron-style tabbed product rows */}
      <TabbedRows dict={dict} locale={locale} tabs={tabs} />

      {/* 3 — best sellers */}
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

      {/* 4 — new arrivals */}
      <ProductRow
        id="new-arrivals"
        eyebrow={dict.home.newEyebrow}
        title={dict.home.newTitle}
        cta={dict.home.viewAll}
        href={`/${locale}/shop?sort=new`}
        products={newest}
        locale={locale}
        dict={dict}
      />

      {/* 5 — gift sets */}
      {bundles.length > 0 && (
        <ProductRow
          id="gift-sets"
          eyebrow={dict.home.bundlesEyebrow}
          title={dict.home.bundlesTitle}
          cta={dict.home.bundlesCta}
          href={`/${locale}/bundles`}
          products={bundles}
          locale={locale}
          dict={dict}
        />
      )}

      {/* 5b — why buy from us (image + bullets, Citron "built tough" pattern) */}
      <section className="section row-section" id="why-band">
        <div className="wrap why-band">
          <div className="why-band-media">
            <img src="/products/learning-activity-4.webp" alt="" loading="lazy" />
          </div>
          <div className="why-band-copy">
            <h2>{dict.whyBand.title}</h2>
            <ul className="why-band-list">
              {dict.whyBand.bullets.map((w, i) => (
                <li key={i}><span className="why-tick" aria-hidden="true">✓</span><div><strong>{w.t}</strong><small>{w.d}</small></div></li>
              ))}
            </ul>
            <Link href={`/${locale}/about`} className="btn btn-primary">{dict.whyBand.cta}</Link>
          </div>
        </div>
      </section>

      {/* 5c — brands we stock (real vendor names) */}
      {brands.length > 0 && (
        <section className="section row-section brands-row" id="brands">
          <div className="wrap">
            <Reveal>
              <div className="eyebrow">{dict.brandsRow.eyebrow}</div>
              <h2>{dict.brandsRow.title}</h2>
            </Reveal>
            <div className="brand-cloud">
              {brands.map((name) => (
                <Link key={name} href={`/${locale}/shop?brand=${encodeURIComponent(name)}`} className="brand-pill">{name}</Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6 — offers / promo band */}
      <section className="section row-section" id="offers">
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

      {/* 7 — short looping video (poster only under reduced motion) */}
      <VideoLoop dict={dict} locale={locale} />

      {/* infinite product-photo loop */}
      <ProductMarquee products={products} locale={locale} label={dict.marqueeRow.label} />

      {/* signature browse helpers */}
      <ShopByColor dict={dict} locale={locale} />
      <ShopByPrice dict={dict} locale={locale} />
      <GiftFinder dict={dict} locale={locale} />
      <BulkBand dict={dict} />
      <RecentlyViewedRow products={products} dict={dict} locale={locale} />
      <FaqShort dict={dict} locale={locale} items={faqShort} />

      {/* 8 — reviews */}
      <section className="section row-section" id="reviews">
        <div className="wrap">
          <Reveal><h2>{dict.home.reviewsTitle}</h2></Reveal>
          <div className="cards-3" style={{ marginTop: 22 }}>
            {reviews.map((r, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="review">
                  <div className="review-head">
                    <div className="stars">★★★★★</div>
                    <span className="review-verified">✓ {dict.reviewsUi.verified}</span>
                  </div>
                  <p>“{r.q}”</p>
                  <span className="review-who">{r.name} · {r.city}</span>
                  <span className="review-bought">{dict.reviewsUi.bought}: {r.product}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9 — newsletter */}
      <section className="section row-section" id="newsletter">
        <div className="wrap">
          <Reveal>
            <div className="block cream grain" style={{ textAlign: 'center' }}>
              <h2>{dict.home.newsTitle}</h2>
              <p className="lede" style={{ margin: '0 auto 26px' }}>{dict.home.newsLede}</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <NewsletterForm dict={dict} locale={locale} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 10 — instagram polaroids — last */}
      <section className="section row-section" id="instagram" style={{ paddingBottom: 10 }}>
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
