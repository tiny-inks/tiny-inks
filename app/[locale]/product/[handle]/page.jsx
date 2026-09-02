import Link from 'next/link';
import { notFound } from 'next/navigation';
import Reveal from '@/components/Reveal';
import Gallery from '@/components/Gallery';
import AddToCart from '@/components/AddToCart';
import BuyBar from '@/components/BuyBar';
import ProductCard from '@/components/ProductCard';
import Shelf from '@/components/Shelf';
import WishlistButton from '@/components/WishlistButton';
import Breadcrumbs from '@/components/Breadcrumbs';
import { productImages, withGridImages } from '@/lib/product-images';
import { RecentlyViewedTracker, RecentlyViewedRow } from '@/components/RecentlyViewed';
import { getDict } from '@/lib/dictionaries';
import { getProduct, getProducts, getCollections, getCollectionWithProducts, formatPrice } from '@/lib/products';
import { FREE_DELIVERY_THRESHOLD, getBusiness } from '@/lib/site';

export async function generateMetadata({ params }) {
  const product = await getProduct(params.handle, params.locale);
  if (!product) return { title: 'Product' };
  return {
    title: product.title,
    description: product.description?.slice(0, 160),
    openGraph: product.images?.[0]?.url ? { images: [product.images[0].url] } : undefined,
  };
}

/* tags that describe the product (not the colour marker) */
const realTags = (p) => (p.tags || []).filter((t) => !/^color:/.test(t));

function Row({ id, title, products, locale, dict }) {
  if (!products.length) return null;
  return (
    <section className="section row-section" id={id} style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="section-head">
          <Reveal><h2 style={{ marginBottom: 0 }}>{title}</h2></Reveal>
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

export default async function ProductPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.product;
  const product = await getProduct(params.handle, locale);
  if (!product) notFound();

  const [all, collections] = await Promise.all([getProducts(locale), getCollections(locale)]);
  const col = collections.find((c) => product.collections?.includes(c.handle));
  const others = all.filter((p) => p.handle !== product.handle);

  /* "You may also like" — the same Shopify collection (falls back to same type, then newest) */
  let sameCollection = [];
  if (col) {
    const data = await getCollectionWithProducts(col.handle, locale);
    sameCollection = (data?.products || []).filter((p) => p.handle !== product.handle);
  }
  const alsoLike = (sameCollection.length ? sameCollection
    : others.filter((p) => p.productType === product.productType).length ? others.filter((p) => p.productType === product.productType)
    : others).slice(0, 8);

  /* "Frequently bought together" — shares a tag or a brand but is a different
     kind of product (a pen for a notebook, not another notebook) */
  const tags = new Set(realTags(product));
  const alsoSet = new Set(alsoLike.map((p) => p.handle));
  const complementary = others.filter((p) => p.productType !== product.productType && !alsoSet.has(p.handle));
  const scored = complementary
    .map((p) => ({ p, s: (realTags(p).some((x) => tags.has(x)) ? 2 : 0) + (p.vendor && p.vendor === product.vendor ? 1 : 0) + (p.tags?.includes('bestseller') ? 1 : 0) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
  const boughtTogether = (scored.length ? scored : others).slice(0, 4);

  const gallery = productImages(product);
  const illustrative = gallery.length > 0 && gallery[0].fallback;
  const b = getBusiness();
  const paragraphs = (product.description || '').split(/\n{2,}|\r?\n/).map((s) => s.trim()).filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: (product.images || []).map((i) => i.url),
    brand: { '@type': 'Brand', name: product.vendor || 'Tiny Inks' },
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency || 'AED',
      price: String(product.price),
      availability: product.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  const offers = [
    { icon: '❀', t: t.offerWrap, d: t.offerWrapText },
    { icon: '⚡', t: t.offerDelivery, d: t.offerDeliveryText.replace('{amount}', formatPrice(FREE_DELIVERY_THRESHOLD, 'AED', locale)) },
    { icon: '▣', t: t.offerBulk, d: t.offerBulkText, href: `${b.whatsappHref}?text=${encodeURIComponent(dict.footerUi.bulkMsg + product.title)}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="section pdp-section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)' }}>
        <div className="wrap" style={{ marginBottom: 14 }}>
          <Breadcrumbs
            dict={dict}
            locale={locale}
            items={[
              { href: `/${locale}/shop`, label: dict.nav.shop },
              ...(col ? [{ href: `/${locale}/shop/${col.handle}`, label: col.title }] : []),
              { label: product.title },
            ]}
          />
        </div>
        <div className="wrap pdp">
          <div>
            <Gallery images={gallery} title={product.title} handle={product.handle} noImageLabel={dict.cartUi.noImage} />
            {illustrative && <p className="img-note">{t.illustrative}</p>}
          </div>
          <div className="pdp-buy">
            <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)' }}>{product.title}</h1>
            {/* brand · category — always visible, always tappable */}
            <div className="pdp-facts">
              {product.vendor && (
                <span className="fact">
                  <small>{t.brandLabel}</small>
                  {product.vendor !== 'Tiny Inks'
                    ? <Link href={`/${locale}/shop?brand=${encodeURIComponent(product.vendor)}`}>{product.vendor}</Link>
                    : <b>{product.vendor}</b>}
                </span>
              )}
              <span className="fact">
                <small>{t.categoryLabel}</small>
                {col ? <Link href={`/${locale}/shop/${col.handle}`}>{col.title}</Link> : <b>{product.productType}</b>}
              </span>
            </div>
            <div className="pdp-price-row">
              <div className="pdp-price">{formatPrice(product.price, product.currency, locale)}</div>
              {product.compareAtPrice ? <div className="mcard-compare">{formatPrice(product.compareAtPrice, product.currency, locale)}</div> : null}
              <div className={`card-stock ${product.available ? 'in' : 'out'}`}>
                <span className="stock-dot" aria-hidden="true" />
                {product.available ? t.instock : t.soldout}
              </div>
            </div>
            <div className="buy-with-wish">
              <AddToCart product={product} dict={dict} />
              <WishlistButton handle={product.handle} dict={dict} />
            </div>
            <div className="pdp-meta">
              <div><strong>{t.shipping}:</strong> {t.shippingText}</div>
              <div><strong>{t.wrap}:</strong> {t.wrapText}</div>
            </div>
          </div>
        </div>

        {/* after the buy box, in this order: description · delivery/returns · also like · bought together · offers */}
        <div className="wrap pdp-below">
          <div className="pdp-desc" id="description">
            <h2>{t.descTitle}</h2>
            {product.descriptionHtml ? (
              <div className="prose" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
            ) : paragraphs.length ? (
              <div className="prose">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
            ) : (
              <p className="prose">{t.noDesc}</p>
            )}
          </div>

          <div className="accordion" id="delivery-returns">
            <details className="acc-item" open>
              <summary>{t.deliveryTitle}</summary>
              <div className="acc-body">
                <p>{t.shippingText}</p>
                <ul>
                  {t.deliveryPoints.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
                <Link href={`/${locale}/policies/shipping`} className="pdp-link">{dict.policies.shipping} →</Link>
              </div>
            </details>
            <details className="acc-item">
              <summary>{t.returnsTitle}</summary>
              <div className="acc-body">
                <ul>
                  {t.returnsPoints.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
                <Link href={`/${locale}/policies/returns`} className="pdp-link">{dict.policies.returns} →</Link>
              </div>
            </details>
          </div>
        </div>
      </section>

      <Row id="also-like" title={t.alsoLike} products={alsoLike} locale={locale} dict={dict} />
      <Row id="bought-together" title={t.related} products={boughtTogether} locale={locale} dict={dict} />

      {/* offers strip */}
      <section className="section row-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="offers-strip">
            {offers.map((o, i) => {
              const inner = (
                <>
                  <span className="offer-glyph" aria-hidden="true">{o.icon}</span>
                  <span><strong>{o.t}</strong><small>{o.d}</small></span>
                </>
              );
              return o.href
                ? <a key={i} className="offer" href={o.href} target="_blank" rel="noreferrer">{inner}</a>
                : <div key={i} className="offer">{inner}</div>;
            })}
          </div>
        </div>
      </section>

      <RecentlyViewedTracker handle={product.handle} />
      <RecentlyViewedRow products={all} dict={dict} locale={locale} excludeHandle={product.handle} />

      <BuyBar product={product} dict={dict} locale={locale} />
    </>
  );
}
