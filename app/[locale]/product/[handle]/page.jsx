import Link from 'next/link';
import { notFound } from 'next/navigation';
import Reveal from '@/components/Reveal';
import Gallery from '@/components/Gallery';
import AddToCart from '@/components/AddToCart';
import BuyBar from '@/components/BuyBar';
import ProductCard from '@/components/ProductCard';
import Shelf from '@/components/Shelf';
import WishlistButton from '@/components/WishlistButton';
import { RecentlyViewedTracker, RecentlyViewedRow } from '@/components/RecentlyViewed';
import { getDict } from '@/lib/dictionaries';
import { getProduct, getProducts, formatPrice } from '@/lib/products';

export async function generateMetadata({ params }) {
  const product = await getProduct(params.handle, params.locale);
  if (!product) return { title: 'Product' };
  return {
    title: product.title,
    description: product.description?.slice(0, 160),
    openGraph: product.images?.[0]?.url ? { images: [product.images[0].url] } : undefined,
  };
}

export default async function ProductPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const product = await getProduct(params.handle, locale);
  if (!product) notFound();

  const all = await getProducts(locale);
  const related = all
    .filter((p) => p.handle !== product.handle && p.productType === product.productType)
    .slice(0, 4);
  const relatedList = related.length ? related : all.filter((p) => p.handle !== product.handle).slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: (product.images || []).map((i) => i.url),
    brand: { '@type': 'Brand', name: 'Tiny Inks' },
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency || 'AED',
      price: String(product.price),
      availability: product.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="section pdp-section" style={{ paddingTop: 'clamp(30px, 5vw, 60px)' }}>
        <div className="wrap pdp">
          <Gallery images={product.images} title={product.title} />
          <div className="pdp-buy">
            <div className="card-type">{product.productType}</div>
            <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)' }}>{product.title}</h1>
            <div className="pdp-price-row">
              <div className="pdp-price">{formatPrice(product.price, product.currency, locale)}</div>
              <div className={`card-stock ${product.available ? 'in' : 'out'}`}>
                <span className="stock-dot" aria-hidden="true" />
                {product.available ? dict.product.instock : dict.product.soldout}
              </div>
            </div>
            <div className="buy-with-wish">
              <AddToCart product={product} dict={dict} />
              <WishlistButton handle={product.handle} dict={dict} />
            </div>
            <div className="pdp-meta">
              <div><strong>{dict.product.shipping}:</strong> {dict.product.shippingText}</div>
              <div><strong>{dict.product.wrap}:</strong> {dict.product.wrapText}</div>
              <div>
                <Link href={`/${locale}/policies/returns`} className="pdp-link">
                  {dict.product.returnsLink}
                </Link>
              </div>
            </div>
            <div className="pdp-bulk">
              <strong>{dict.product.bulk}</strong>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '971500000000'}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
                {dict.product.bulkCta}
              </a>
            </div>
            <p className="lede" style={{ fontSize: '1.02rem' }}>{product.description}</p>
          </div>
        </div>
      </section>

      {relatedList.length > 0 && (
        <section className="section row-section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head">
              <Reveal><h2 style={{ marginBottom: 0 }}>{dict.product.related}</h2></Reveal>
            </div>
            <Reveal>
              <Shelf ariaLabel={dict.product.related}>
                {relatedList.map((p) => (
                  <ProductCard key={p.id} product={p} locale={locale} dict={dict} />
                ))}
              </Shelf>
            </Reveal>
          </div>
        </section>
      )}

      <RecentlyViewedTracker handle={product.handle} />
      <RecentlyViewedRow products={all} dict={dict} locale={locale} excludeHandle={product.handle} />

      <BuyBar product={product} dict={dict} locale={locale} />
    </>
  );
}
