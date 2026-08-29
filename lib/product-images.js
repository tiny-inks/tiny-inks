/*
 * Product image resolution.
 *
 *   real Shopify image  →  category photo (public/products)  →  coloured Placeholder
 *
 * A real image always wins. When a product has none, a photo is picked from its
 * category pool by a hash of the handle, so the same product shows the same
 * photo everywhere. Grids use assignGridImages() which nudges a product to the
 * next photo in its pool only when it would otherwise repeat its neighbour.
 *
 * The photos are licensed stock (see public/products/CREDITS.md) — they are
 * illustrative, which the product page states plainly next to the gallery.
 */

/* pool sizes: public/products/<key>-<n>.webp, n = 1..size */
export const POOLS = {
  'pens-pencils': 4,
  'notebooks-books': 4,
  'stickers-sticky-notes': 4,
  'art-craft': 4,
  'learning-activity': 4,
  'desk-tools': 4,
  'files-folders': 4,
  'gift-sets-bundles': 4,
  'planners-diaries': 4,
  'other-stationery': 4,
};

/* Ordered: the first rule that matches wins, so the specific ones come first
   ("sticky notes" before "notebooks", "planner" before "book"). Tested against
   collection handles, product type, tags and finally the title. */
const RULES = [
  ['stickers-sticky-notes', /sticker|sticky|memo|post-?it|label/i],
  ['planners-diaries', /planner|diar(y|ies)|agenda|calendar|schedul/i],
  ['files-folders', /file|folder|binder|envelope|document|clipboard|portfolio/i],
  ['gift-sets-bundles', /gift|bundle|hamper/i],
  ['learning-activity', /learn|activit|educat|kids|children|flash ?card|puzzle|game|abc|alphabet/i],
  ['art-craft', /\bart\b|craft|paint|brush|water ?colou?r|crayon|clay|glitter|origami|sketch/i],
  ['pens-pencils', /\bpen\b|pens\b|pencil|marker|highlighter|\bink\b|\binks\b|fountain|ballpoint|gel/i],
  ['notebooks-books', /notebook|journal|\bbook|notepad|sketchbook|pad\b|memo ?book/i],
  ['desk-tools', /desk|tool|stapler|scissor|tape|ruler|eraser|sharpener|organi[sz]er|clip|glue|punch|washi|cutter|accessor/i],
  ['other-stationery', /other|stationery|misc/i],
];

function textFor(product) {
  return [
    ...(product.collections || []),
    product.typeKey,
    product.productType,
    ...(product.tags || []),
    product.handle,
    product.title,
  ]
    .filter(Boolean)
    .join(' | ');
}

/* category pool key for a product, or null when nothing matches */
export function categoryFor(product) {
  if (!product) return null;
  // collection handles + type are the strongest signal; try them alone first
  const strong = [...(product.collections || []), product.typeKey, product.productType].filter(Boolean).join(' | ');
  for (const [key, re] of RULES) if (re.test(strong)) return key;
  const all = textFor(product);
  for (const [key, re] of RULES) if (re.test(all)) return key;
  return null;
}

export function hashHandle(handle = '') {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) >>> 0;
  return h;
}

export function poolUrl(key, n) {
  return `/products/${key}-${n}.webp`;
}

/* deterministic category photo for a product (offset shifts within the pool) */
export function fallbackImage(product, offset = 0) {
  const key = categoryFor(product);
  if (!key || !POOLS[key]) return null;
  const size = POOLS[key];
  const n = ((hashHandle(product.handle) + offset) % size) + 1;
  return { url: poolUrl(key, n), alt: product.title, fallback: true, pool: key, index: n };
}

/* the single image to show for a product: real first, then category photo, else null */
export function productImage(product) {
  const real = product?.images?.[0];
  if (real?.url) return { ...real, fallback: false };
  return fallbackImage(product);
}

/* gallery list: all real images, or one category photo, or [] */
export function productImages(product) {
  if (product?.images?.length) return product.images.map((i) => ({ ...i, fallback: false }));
  const fb = fallbackImage(product);
  return fb ? [fb] : [];
}

/* [product, image] pairs for a shelf/grid — convenience over assignGridImages() */
export function withGridImages(products = []) {
  const imgs = assignGridImages(products);
  return products.map((p) => [p, imgs[p.handle]]);
}

/* Images for a grid, keyed by handle. Same as productImage() except that a
   fallback photo equal to one of the previous two cards' (the card beside it,
   and the card above it on a 2-column phone grid) is nudged to the next photo
   in its pool, so the same stock photo never sits next to itself. */
export function assignGridImages(products = []) {
  const out = {};
  const recent = [];
  for (const p of products) {
    let img = productImage(p);
    if (img?.fallback && recent.includes(img.url)) {
      const size = POOLS[img.pool] || 1;
      for (let off = 1; off < size; off++) {
        const alt = fallbackImage(p, off);
        if (alt && !recent.includes(alt.url)) { img = alt; break; }
      }
    }
    out[p.handle] = img;
    recent.push(img?.url || null);
    if (recent.length > 2) recent.shift();
  }
  return out;
}
