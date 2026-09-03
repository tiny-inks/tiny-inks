'use client';
import { useState } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import Shelf from './Shelf';
import { withGridImages } from '@/lib/product-images';

/* Citron-style "Shop by product": centred heading, pill tabs, a 4-up grid of
   8 cards for the active tab, and a centred underlined "Shop all X" link.
   The server builds the tab data; this component only switches between them. */
export default function TabbedRows({ dict, locale, tabs }) {
  const [active, setActive] = useState(0);
  const list = tabs.filter((t) => t.products?.length);
  if (!list.length) return null;
  const tab = list[Math.min(active, list.length - 1)];

  return (
    <section className="section row-section tabbed" id="shop-by-product">
      <div className="wrap">
        <h2 className="tabbed-title">{dict.tabbedRow.title}</h2>
        <div className="tab-pills" role="tablist" aria-label={dict.tabbedRow.title}>
          {list.map((t, i) => (
            <button
              key={t.key}
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={i === active}
              aria-controls={`tabpanel-${t.key}`}
              className={`tab-pill ${i === active ? 'on' : ''}`}
              onClick={() => setActive(i)}
              data-testid={`tab-${t.key}`}
            >
              <span className="tab-wave" aria-hidden="true" />
              {t.title}
            </button>
          ))}
        </div>
        <div className="tab-grid" role="tabpanel" id={`tabpanel-${tab.key}`} aria-labelledby={`tab-${tab.key}`}>
          <Shelf ariaLabel={tab.title}>
            {withGridImages(tab.products.slice(0, 8)).map(([p, image]) => (
              <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={image} />
            ))}
          </Shelf>
        </div>
        <div className="tab-more">
          <Link href={tab.href} className="tab-more-link">
            {dict.tabbedRow.shopAll.replace('{name}', tab.title)}
          </Link>
        </div>
      </div>
    </section>
  );
}
