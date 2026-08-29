import Link from 'next/link';
import { categoryFor, poolUrl } from '@/lib/product-images';
import { tintFor } from './Placeholder';

/* The category chooser at the top of /shop: one tile per Shopify collection —
   collection photo (or the category stock photo, or a brand tint), name and
   count. Server component; works with demo and live data alike. */
export function collectionTileImage(c) {
  if (c.image?.url) return { url: c.image.url, alt: c.image.alt || c.title };
  const key = categoryFor({ handle: c.handle, title: c.title, collections: [c.handle] });
  return key ? { url: poolUrl(key, 1), alt: '' } : null;
}

export default function CollectionGrid({ collections, locale, dict, current = null, id = 'categories' }) {
  return (
    <nav className="colgrid" aria-label={dict.shopUi.categories} id={id}>
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
            </span>
            <span className="coltile-name">{c.title}</span>
            {typeof c.count === 'number' && <span className="coltile-count">{c.count} {dict.shop.results}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
