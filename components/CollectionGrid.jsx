import Link from 'next/link';
import { categoryFor, poolUrl } from '@/lib/product-images';
import { tintFor } from './Placeholder';

/* Citron-style category tiles: photo background, dark scrim, two-line label
   (a short phrase above the category name) and a round arrow chip. Works with
   demo and live Shopify collections alike. */
export function collectionTileImage(c) {
  if (c.image?.url) return { url: c.image.url, alt: c.image.alt || c.title };
  const key = categoryFor({ handle: c.handle, title: c.title, collections: [c.handle] });
  return key ? { url: poolUrl(key, 1), alt: '' } : null;
}

export function collectionPhrase(c, dict) {
  const key = categoryFor({ handle: c.handle, title: c.title, collections: [c.handle] });
  return (key && dict.catchph[key]) || dict.catchph.other;
}

export default function CollectionGrid({ collections, locale, dict, current = null, id = 'categories' }) {
  return (
    <nav className="colgrid cg-panel" aria-label={dict.shopUi.categories} id={id}>
      {collections.map((c, i) => {
        const img = collectionTileImage(c);
        const on = current === c.handle;
        return (
          <Link
            key={c.handle}
            href={`/${locale}/shop/${c.handle}`}
            className={`coltile ${on ? 'on' : ''}`}
            aria-current={on ? 'page' : undefined}
            style={{ '--tint': c.color || tintFor(c.handle) }}
          >
            <span className="coltile-media">
              {img ? <img src={img.url} alt={img.alt} loading={i < 4 ? 'eager' : 'lazy'} /> : <span className="coltile-solid" aria-hidden="true">✦</span>}
              <span className="coltile-scrim" aria-hidden="true" />
            </span>
            <span className="coltile-label">
              <small className="coltile-phrase">{collectionPhrase(c, dict)}</small>
              <strong className="coltile-name">{c.title}</strong>
              {typeof c.count === 'number' && <span className="coltile-count">{c.count} {dict.shop.results}</span>}
            </span>
            <span className="coltile-arrow" aria-hidden="true">→</span>
          </Link>
        );
      })}
    </nav>
  );
}
