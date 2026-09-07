import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, ShieldCheck, Store, Truck } from 'lucide-react';
import Gallery from '@/components/Gallery';
import AddToCart from '@/components/AddToCart';
import ProductCard from '@/components/ProductCard';
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

const realTags = (p) => (p.tags || []).filter((t) => !/^color:/.test(t));

function Row({ title, products, locale, dict }) {
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-14 sm:px-8">
      <h2 className="display-md">{title}</h2>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {withGridImages(products).map(([p, image], i) => (
          <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={image} index={i} />
        ))}
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

  let sameCollection = [];
  if (col) {
    const data = await getCollectionWithProducts(col.handle, locale);
    sameCollection = (data?.products || []).filter((p) => p.handle !== product.handle);
  }
  const alsoLike = (sameCollection.length ? sameCollection
    : others.filter((p) => p.productType === product.productType).length ? others.filter((p) => p.productType === product.productType)
    : others).slice(0, 8);

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
      availability: product.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  const deliveryInfo = [
    { Icon: Truck, text: t.shippingText },
    { Icon: Store, text: t.wrapText },
    { Icon: ShieldCheck, text: t.returnsPoints[0] },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-8">
        <Breadcrumbs dict={dict} locale={locale} items={[
          { href: `/${locale}/shop`, label: dict.nav.shop },
          ...(col ? [{ href: `/${locale}/shop/${col.handle}`, label: col.title }] : []),
          { label: product.title },
        ]} />
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-9">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <Gallery images={gallery} title={product.title} handle={product.handle} noImageLabel={dict.cartUi.noImage} />
            {illustrative && <p className="mt-2 text-xs text-muted-foreground">{t.illustrative}</p>}
          </div>

          <div className="flex flex-col">
            <span className="label-xs text-muted-foreground">
              {product.vendor ? (product.vendor !== 'Tiny Inks' ? <Link href={`/${locale}/shop?brand=${encodeURIComponent(product.vendor)}`} className="hover:text-coral">{product.vendor}</Link> : product.vendor) : ''}
              {product.vendor && (col || product.productType) ? ' · ' : ''}
              {col ? <Link href={`/${locale}/shop/${col.handle}`} className="hover:text-coral">{col.title}</Link> : product.productType}
            </span>
            <h1 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">{product.title}</h1>
            {paragraphs.length > 0 && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{paragraphs[0]}</p>}

            <div className="mt-5 flex items-baseline gap-3">
              <span className="font-display text-3xl tabular-nums">{formatPrice(product.price, product.currency, locale)}</span>
              {product.compareAtPrice ? <span className="text-sm text-muted-foreground line-through">{formatPrice(product.compareAtPrice, product.currency, locale)}</span> : null}
            </div>
            <div className={`mt-2 inline-flex w-fit items-center gap-1.5 text-xs font-bold ${product.available ? 'text-sage' : 'text-destructive'}`}>
              <span className={`h-2 w-2 rounded-full ${product.available ? 'bg-sage' : 'bg-destructive'}`} />
              {product.available ? t.instock : t.soldout}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <AddToCart product={product} dict={dict} />
              <WishlistButton handle={product.handle} dict={dict} />
            </div>

            <ul className="mt-6 grid gap-2 text-xs text-muted-foreground">
              {deliveryInfo.map(({ Icon, text }, i) => (
                <li key={i} className="flex items-center gap-2"><Icon className="h-4 w-4 shrink-0 text-coral" strokeWidth={1.7} /> {text}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 divide-y divide-border rounded-3xl border border-border">
          <details className="group px-6 py-5" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base">
              {t.descTitle}<Plus className="h-4 w-4 shrink-0 transition-transform group-open:rotate-45" />
            </summary>
            <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {product.descriptionHtml ? (
                <div className="prose" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
              ) : paragraphs.length ? (
                paragraphs.map((p, i) => <p key={i} className="mb-2">{p}</p>)
              ) : (
                <p>{t.noDesc}</p>
              )}
            </div>
          </details>
          <details className="group px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base">
              {t.deliveryTitle}<Plus className="h-4 w-4 shrink-0 transition-transform group-open:rotate-45" />
            </summary>
            <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <p>{t.shippingText}</p>
              <ul className="mt-2 list-disc ps-5">{t.deliveryPoints.map((s, i) => <li key={i}>{s}</li>)}</ul>
              <Link href={`/${locale}/policies/shipping`} className="mt-2 inline-block font-bold text-coral">{dict.policies.shipping} →</Link>
            </div>
          </details>
          <details className="group px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base">
              {t.returnsTitle}<Plus className="h-4 w-4 shrink-0 transition-transform group-open:rotate-45" />
            </summary>
            <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <ul className="list-disc ps-5">{t.returnsPoints.map((s, i) => <li key={i}>{s}</li>)}</ul>
              <Link href={`/${locale}/policies/returns`} className="mt-2 inline-block font-bold text-coral">{dict.policies.returns} →</Link>
            </div>
          </details>
        </div>
      </section>

      <Row title={t.alsoLike} products={alsoLike} locale={locale} dict={dict} />
      <Row title={t.related} products={boughtTogether} locale={locale} dict={dict} />

      <section className="mx-auto max-w-[1240px] px-4 pb-14 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: t.offerWrap, d: t.offerWrapText },
            { t: t.offerDelivery, d: t.offerDeliveryText.replace('{amount}', formatPrice(FREE_DELIVERY_THRESHOLD, 'AED', locale)) },
            { t: t.offerBulk, d: t.offerBulkText, href: `${b.whatsappHref}?text=${encodeURIComponent(dict.footerUi.bulkMsg + product.title)}` },
          ].map((o, i) => {
            const Tag = o.href ? 'a' : 'div';
            return (
              <Tag key={i} {...(o.href ? { href: o.href, target: '_blank', rel: 'noreferrer' } : {})} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-coral">
                <strong className="block font-display text-sm">{o.t}</strong>
                <small className="mt-1 block text-xs text-muted-foreground">{o.d}</small>
              </Tag>
            );
          })}
        </div>
      </section>

      <RecentlyViewedTracker handle={product.handle} />
      <RecentlyViewedRow products={all} dict={dict} locale={locale} excludeHandle={product.handle} />
    </>
  );
}
