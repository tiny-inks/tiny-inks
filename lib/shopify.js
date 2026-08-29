const DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const VERSION = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2026-01';

export const isLive = () =>
  process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' && Boolean(DOMAIN && TOKEN);

/* opts.revalidate (seconds) turns on Next's fetch cache for catalog reads.
   Cart mutations must stay uncached — omit opts for those. */
export async function shopifyFetch(query, variables = {}, opts = {}) {
  const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    ...(opts.revalidate
      ? { next: { revalidate: opts.revalidate } }
      : { cache: 'no-store' }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error('Shopify error:', JSON.stringify(json.errors));
    throw new Error(json.errors[0]?.message || 'Shopify request failed');
  }
  return json.data;
}

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  descriptionHtml
  productType
  vendor
  tags
  availableForSale
  createdAt
  priceRange { minVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount currencyCode } }
  images(first: 4) { edges { node { url altText } } }
  variants(first: 1) { edges { node { id availableForSale } } }
  collections(first: 10) { edges { node { handle } } }
`;

export const PRODUCTS_QUERY = `
  query Products($language: LanguageCode!, $country: CountryCode!, $first: Int!, $after: String)
  @inContext(language: $language, country: $country) {
    products(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges { node { ${PRODUCT_FIELDS} } }
    }
  }
`;

export const COLLECTIONS_QUERY = `
  query Collections($language: LanguageCode!, $country: CountryCode!, $first: Int!)
  @inContext(language: $language, country: $country) {
    collections(first: $first, sortKey: TITLE) {
      edges { node { handle title image { url altText } } }
    }
  }
`;

export const COLLECTION_PRODUCTS_QUERY = `
  query CollectionProducts($language: LanguageCode!, $country: CountryCode!, $handle: String!, $first: Int!, $after: String)
  @inContext(language: $language, country: $country) {
    collection(handle: $handle) {
      handle
      title
      image { url altText }
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges { node { ${PRODUCT_FIELDS} } }
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($language: LanguageCode!, $country: CountryCode!, $handle: String!)
  @inContext(language: $language, country: $country) {
    product(handle: $handle) { ${PRODUCT_FIELDS} }
  }
`;

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost { subtotalAmount { amount currencyCode } }
  lines(first: 50) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            product { title handle }
            price { amount currencyCode }
            image { url altText }
          }
        }
      }
    }
  }
`;

export const CART_CREATE = `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ${CART_FIELDS} }
      userErrors { message }
    }
  }
`;

export const CART_QUERY = `
  query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }
`;

export const CART_LINES_ADD = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { message }
    }
  }
`;

export const CART_LINES_UPDATE = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { message }
    }
  }
`;

export const CART_LINES_REMOVE = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { message }
    }
  }
`;

/* delivery details collected on /cart travel with the cart into checkout */
export const CART_ATTRIBUTES_UPDATE = `
  mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart { id }
      userErrors { message }
    }
  }
`;

export const CART_NOTE_UPDATE = `
  mutation CartNoteUpdate($cartId: ID!, $note: String!) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart { id }
      userErrors { message }
    }
  }
`;

export const CART_BUYER_IDENTITY_UPDATE = `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { id checkoutUrl }
      userErrors { message }
    }
  }
`;

const COLOR_TAG = /^color:(.+)$/;

export function normalizeProduct(node) {
  if (!node) return null;
  const colorTag = (node.tags || []).find((t) => COLOR_TAG.test(t));
  return {
    id: node.id,
    handle: node.handle,
    variantId: node.variants?.edges?.[0]?.node?.id || null,
    title: node.title,
    productType: node.productType || 'Stationery',
    typeKey: node.productType || 'Stationery',
    vendor: node.vendor || '',
    color: colorTag ? colorTag.match(COLOR_TAG)[1] : null,
    price: Number(node.priceRange?.minVariantPrice?.amount || 0),
    /* only set when Shopify actually has a compare-at price above the price —
       the UI must never invent a discount */
    compareAtPrice:
      Number(node.compareAtPriceRange?.minVariantPrice?.amount || 0) >
      Number(node.priceRange?.minVariantPrice?.amount || 0)
        ? Number(node.compareAtPriceRange.minVariantPrice.amount)
        : null,
    currency: node.priceRange?.minVariantPrice?.currencyCode || 'AED',
    available: node.availableForSale,
    tags: node.tags || [],
    createdAt: node.createdAt,
    description: node.description || '',
    descriptionHtml: node.descriptionHtml || '',
    images: (node.images?.edges || []).map((e) => ({
      url: e.node.url,
      alt: e.node.altText || node.title,
    })),
    collections: (node.collections?.edges || []).map((e) => e.node.handle),
  };
}

export function normalizeCollection(node) {
  if (!node) return null;
  return {
    handle: node.handle,
    title: node.title,
    image: node.image ? { url: node.image.url, alt: node.image.altText || node.title } : null,
  };
}

export function normalizeCart(cart) {
  if (!cart) return { id: null, checkoutUrl: null, items: [], subtotal: 0, currency: 'AED' };
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    subtotal: Number(cart.cost?.subtotalAmount?.amount || 0),
    currency: cart.cost?.subtotalAmount?.currencyCode || 'AED',
    items: (cart.lines?.edges || []).map((e) => ({
      lineId: e.node.id,
      variantId: e.node.merchandise.id,
      title: e.node.merchandise.product.title,
      handle: e.node.merchandise.product.handle,
      price: Number(e.node.merchandise.price.amount),
      image: e.node.merchandise.image?.url || null,
      qty: e.node.quantity,
    })),
  };
}

export const toShopifyLanguage = (locale) => (locale === 'ar' ? 'AR' : 'EN');
