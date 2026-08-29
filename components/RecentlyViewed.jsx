'use client';
import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import Shelf from './Shelf';
import { withGridImages } from '@/lib/product-images';

const LS_KEY = 'ti_recent';
const MAX = 8;

/* Drop this on a product page to record the visit (handles only — the row
   maps them back to live product data so language always matches). */
export function RecentlyViewedTracker({ handle }) {
  useEffect(() => {
    if (!handle) return;
    try {
      const prev = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      const next = [handle, ...prev.filter((h) => h !== handle)].slice(0, MAX);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
  }, [handle]);
  return null;
}

/* The row itself — hidden entirely while empty. */
export function RecentlyViewedRow({ products, dict, locale, excludeHandle = null }) {
  const [handles, setHandles] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      if (Array.isArray(saved)) setHandles(saved);
    } catch {}
  }, []);

  const byHandle = new Map(products.map((p) => [p.handle, p]));
  const items = handles
    .filter((h) => h !== excludeHandle)
    .map((h) => byHandle.get(h))
    .filter(Boolean)
    .slice(0, MAX);

  if (items.length === 0) return null;

  return (
    <section className="section row-section">
      <div className="wrap">
        <div className="section-head">
          <h2 style={{ marginBottom: 0 }}>{dict.recently.title}</h2>
        </div>
        <Shelf ariaLabel={dict.recently.title}>
          {withGridImages(items).map(([p, image]) => (
            <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={image} />
          ))}
        </Shelf>
      </div>
    </section>
  );
}
