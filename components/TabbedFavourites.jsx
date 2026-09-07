'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { withGridImages } from '@/lib/product-images';

/* Lovable-style tabbed product rows: pill tabs switch an 8-up grid, real
   Shopify products passed in per tab. */
export default function TabbedFavourites({ tabs, locale, dict }) {
  const [active, setActive] = useState(0);
  const tab = tabs[Math.min(active, tabs.length - 1)];

  return (
    <section className="paper-fibre bg-secondary py-14 sm:py-20">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <div className="text-center">
          <h2 className="display-lg">{dict.tabbedRow.title}</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3" role="tablist">
            {tabs.map((t, i) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`rounded-full border-[1.5px] border-ink px-5 py-2.5 text-[0.75rem] font-extrabold uppercase tracking-[0.1em] transition-colors ${i === active ? 'bg-ink text-white' : 'bg-card hover:bg-sun'}`}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-9 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {withGridImages(tab.products.slice(0, 8)).map(([p, image], i) => (
            <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={image} index={i} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href={`/${locale}/shop`} className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-[0.75rem] font-extrabold uppercase tracking-[0.12em] text-white transition-transform hover:scale-[1.03]">
            {dict.home.viewAll} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
