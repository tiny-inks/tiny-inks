import { MOCK_PRODUCTS, CATEGORIES } from './mock-data';
import { IMAGES } from './images';
import {
  isLive,
  shopifyFetch,
  PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  COLLECTIONS_QUERY,
  COLLECTION_PRODUCTS_QUERY,
  normalizeProduct,
  normalizeCollection,
  toShopifyLanguage,
} from './shopify';

const CATALOG_REVALIDATE = 300; // seconds — catalog reads are cached briefly
const MAX_PRODUCTS = 1000; // safety cap for the client-side catalogue

function localizeMock(p, locale) {
  const l = locale === 'ar' ? 'ar' : 'en';
  return {
    ...p,
    title: p.title[l],
    productType: p.productType[l],
    typeKey: p.productType.en,
    description: p.description[l],
    collections: CATEGORIES.filter((c) => c.match.includes(p.productType.en)).map((c) => c.handle),
    vendor: p.vendor || 'Tiny Inks',
  };
}

function demoCollections(locale) {
  const l = locale === 'ar' ? 'ar' : 'en';
  return CATEGORIES.map((c) => {
    const photo = IMAGES.categories[c.key];
    return {
      handle: c.handle,
      title: l === 'ar' ? c.ar : c.en,
      description: (l === 'ar' ? c.descAr : c.descEn) || '',
      image: photo ? { url: photo.sm || photo.url, alt: l === 'ar' ? c.ar : c.en } : null,
      color: c.color,
    };
  });
}

/* Collections drive the header dropdown, mobile menu, home grid, and shop
   sidebar. Live mode reads them from Shopify (owner edits them in admin, no
   code changes); demo mode derives them from the mock categories. Any fetch
   failure falls back to the demo set — navigation never disappears. */
export async function getCollections(locale = 'en') {
  if (!isLive()) return demoCollections(locale);
  try {
    const data = await shopifyFetch(
      COLLECTIONS_QUERY,
      { language: toShopifyLanguage(locale), country: 'AE', first: 20 },
      { revalidate: CATALOG_REVALIDATE }
    );
    const list = (data.collections?.edges || []).map((e) => normalizeCollection(e.node));
    return list.length ? list : demoCollections(locale);
  } catch (e) {
    console.error('Falling back to demo collections:', e.message);
    return demoCollections(locale);
  }
}

/* One collection + its products, for /shop/[collection]. Returns null when
   the handle does not exist (page 404s). */
export async function getCollectionWithProducts(handle, locale = 'en') {
  if (!isLive()) {
    const col = demoCollections(locale).find((c) => c.handle === handle);
    if (!col) return null;
    const products = MOCK_PRODUCTS.map((p) => localizeMock(p, locale)).filter((p) =>
      p.collections.includes(handle)
    );
    return { collection: col, products };
  }
  try {
    const products = [];
    let collection = null;
    let after = null;
    do {
      const data = await shopifyFetch(
        COLLECTION_PRODUCTS_QUERY,
        { language: toShopifyLanguage(locale), country: 'AE', handle, first: 250, after },
        { revalidate: CATALOG_REVALIDATE }
      );
      if (!data.collection) return null;
      collection = collection || normalizeCollection(data.collection);
      products.push(...(data.collection.products?.edges || []).map((e) => normalizeProduct(e.node)));
      const info = data.collection.products?.pageInfo;
      after = info?.hasNextPage && products.length < MAX_PRODUCTS ? info.endCursor : null;
    } while (after);
    return { collection, products };
  } catch (e) {
    console.error('Collection fetch failed:', e.message);
    return null;
  }
}

export async function getProducts(locale = 'en') {
  if (!isLive()) {
    return MOCK_PRODUCTS.map((p) => localizeMock(p, locale));
  }
  try {
    /* real catalogues run to hundreds of products — walk every page */
    const all = [];
    let after = null;
    do {
      const data = await shopifyFetch(
        PRODUCTS_QUERY,
        { language: toShopifyLanguage(locale), country: 'AE', first: 250, after },
        { revalidate: CATALOG_REVALIDATE }
      );
      all.push(...data.products.edges.map((e) => normalizeProduct(e.node)));
      const info = data.products.pageInfo;
      after = info?.hasNextPage && all.length < MAX_PRODUCTS ? info.endCursor : null;
    } while (after);
    return all;
  } catch (e) {
    console.error('Falling back to demo products:', e.message);
    return MOCK_PRODUCTS.map((p) => localizeMock(p, locale));
  }
}

export async function getProduct(handle, locale = 'en') {
  if (!isLive()) {
    const p = MOCK_PRODUCTS.find((x) => x.handle === handle);
    return p ? localizeMock(p, locale) : null;
  }
  try {
    const data = await shopifyFetch(
      PRODUCT_BY_HANDLE_QUERY,
      { language: toShopifyLanguage(locale), country: 'AE', handle },
      { revalidate: CATALOG_REVALIDATE }
    );
    return normalizeProduct(data.product);
  } catch (e) {
    console.error('Product fetch failed:', e.message);
    return null;
  }
}

export function formatPrice(amount, currency = 'AED', locale = 'en') {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
