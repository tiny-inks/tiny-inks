'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import { assignGridImages } from '@/lib/product-images';
import { COLOR_SWATCHES, COLOR_NAMES } from '@/lib/mock-data';
import { getBusiness } from '@/lib/site';

const PER_PAGE_OPTIONS = [12, 24, 48];
/* a catalog this size (300+ SKUs) can have 40+ distinct vendors — listing
   every single one as a full-width sidebar row pushed the sidebar far
   taller than the product grid and read as broken. Cap the default list and
   let people opt into the rest. */
const BRAND_VISIBLE_CAP = 8;

export default function ShopClient({
  products,
  dict,
  locale,
  collections = [],
  currentCollection = null,
  collectionTitle = null,
}) {
  const t = dict.shop;
  const tu = dict.shopUi;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* state seeded from the URL so filtered results are shareable */
  const [type, setType] = useState(() => searchParams.get('type') || 'all');
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [color, setColor] = useState(() => searchParams.get('color') || 'all');
  const [brand, setBrand] = useState(() => searchParams.get('brand') || 'all');
  const [minP, setMinP] = useState(() => searchParams.get('min') || '');
  const [maxP, setMaxP] = useState(() => searchParams.get('max') || '');
  const [minDraft, setMinDraft] = useState(() => searchParams.get('min') || '');
  const [maxDraft, setMaxDraft] = useState(() => searchParams.get('max') || '');
  const [inStockOnly, setInStockOnly] = useState(() => searchParams.get('avail') === '1');
  const [sort, setSort] = useState(() => searchParams.get('sort') || 'featured');
  const [quick, setQuick] = useState(() => searchParams.get('quick') || 'all');
  const [perPage, setPerPage] = useState(12);
  const [visible, setVisible] = useState(12);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const b = getBusiness();

  /* write state back to the URL (replace, no scroll, no history spam) */
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const p = new URLSearchParams();
    if (query.trim()) p.set('q', query.trim());
    if (type !== 'all') p.set('type', type);
    if (color !== 'all') p.set('color', color);
    if (brand !== 'all') p.set('brand', brand);
    if (minP) p.set('min', minP);
    if (maxP) p.set('max', maxP);
    if (inStockOnly) p.set('avail', '1');
    if (sort !== 'featured') p.set('sort', sort);
    if (quick !== 'all') p.set('quick', quick);
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [query, type, color, brand, minP, maxP, inStockOnly, sort, quick, pathname, router]);

  useEffect(() => { setVisible(perPage); }, [perPage, query, type, color, brand, minP, maxP, inStockOnly, sort, quick]);

  /* bottom sheet behavior on mobile */
  useEffect(() => {
    if (!panelOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setPanelOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  const typeOf = (p) => p.typeKey || p.productType;

  const types = useMemo(() => {
    const seen = new Map();
    products.forEach((p) => {
      const key = typeOf(p);
      if (key && !seen.has(key)) seen.set(key, { label: p.productType || key, count: 0 });
      if (key) seen.get(key).count += 1;
    });
    return [...seen.entries()].map(([key, v]) => ({ key, label: v.label, count: v.count }));
  }, [products]);

  const colors = useMemo(() => [...new Set(products.map((p) => p.color).filter(Boolean))], [products]);
  const colorLabel = (c) => (COLOR_NAMES[locale] && COLOR_NAMES[locale][c]) || c;
  const brands = useMemo(() => {
    const m = new Map();
    products.forEach((p) => { if (p.vendor) m.set(p.vendor, (m.get(p.vendor) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [products]);
  const typeLabel = (key) => types.find((x) => x.key === key)?.label || key;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minP !== '' ? Number(minP) : null;
    const max = maxP !== '' ? Number(maxP) : null;
    let list = products.filter((p) => {
      if (q && !`${p.title} ${p.productType}`.toLowerCase().includes(q)) return false;
      if (type !== 'all' && typeOf(p) !== type) return false;
      if (color !== 'all' && p.color !== color) return false;
      if (brand !== 'all' && p.vendor !== brand) return false;
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      if (inStockOnly && !p.available) return false;
      if (quick === 'new' && !p.tags?.includes('new')) return false;
      if (quick === 'best' && !p.tags?.includes('bestseller')) return false;
      if (quick === 'gifts' && !p.tags?.includes('bundle') && !p.collections?.includes('gift-sets')) return false;
      return true;
    });
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'new') list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'featured') {
      list = [...list].sort((a, b) => (b.tags?.includes('bestseller') ? 1 : 0) - (a.tags?.includes('bestseller') ? 1 : 0));
    }
    return list;
  }, [products, type, color, brand, minP, maxP, inStockOnly, sort, query, quick]);

  const shown = filtered.slice(0, visible);

  const chips = [];
  if (query.trim()) chips.push({ label: `“${query.trim()}”`, clear: () => setQuery('') });
  if (type !== 'all') chips.push({ label: typeLabel(type), clear: () => setType('all') });
  if (color !== 'all') chips.push({ label: colorLabel(color), clear: () => setColor('all') });
  if (brand !== 'all') chips.push({ label: brand, clear: () => setBrand('all') });
  if (minP || maxP) chips.push({
    label: `${tu.priceRange}: ${minP || 0}–${maxP || '∞'}`,
    clear: () => { setMinP(''); setMaxP(''); setMinDraft(''); setMaxDraft(''); },
  });
  if (inStockOnly) chips.push({ label: tu.availability, clear: () => setInStockOnly(false) });

  const clearAll = () => {
    setQuery(''); setType('all'); setColor('all'); setBrand('all');
    setMinP(''); setMaxP(''); setMinDraft(''); setMaxDraft('');
    setInStockOnly(false); setQuick('all');
  };

  const QUICK_FILTERS = [
    { key: 'all', label: t.quickAll },
    { key: 'new', label: t.quickNew },
    { key: 'best', label: t.quickBest },
    { key: 'gifts', label: t.quickGifts },
  ];

  const applyPrice = (e) => { e.preventDefault(); setMinP(minDraft); setMaxP(maxDraft); };

  const FilterGroup = ({ title, children }) => (
    <div>
      <h3 className="eyebrow-new">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );

  const catLink = (active) => `flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition-colors duration-300 ${active ? 'bg-ink text-white' : 'text-foreground/75 hover:bg-secondary'}`;

  const filterPanel = (
    <div className="grid gap-8">
      <FilterGroup title={tu.categories}>
        <div className="space-y-2">
          <Link href={`/${locale}/shop`} className={catLink(!currentCollection)} aria-current={!currentCollection ? 'page' : undefined}>{t.all}</Link>
          {collections.map((c) => (
            <Link key={c.handle} href={`/${locale}/shop/${c.handle}`} className={catLink(currentCollection === c.handle)} aria-current={currentCollection === c.handle ? 'page' : undefined}>
              <span>{c.title}</span>{typeof c.count === 'number' ? <span className="text-xs opacity-70">{c.count}</span> : null}
            </Link>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title={tu.priceRange}>
        <form onSubmit={applyPrice} className="flex items-center gap-2">
          <input type="number" inputMode="numeric" min="0" placeholder={tu.min} value={minDraft} onChange={(e) => setMinDraft(e.target.value)} aria-label={tu.min} className="min-w-0 flex-1 rounded-xl border-2 border-border bg-card px-3 py-2 text-sm outline-none focus:border-coral" />
          <span aria-hidden="true">–</span>
          <input type="number" inputMode="numeric" min="0" placeholder={tu.max} value={maxDraft} onChange={(e) => setMaxDraft(e.target.value)} aria-label={tu.max} className="min-w-0 flex-1 rounded-xl border-2 border-border bg-card px-3 py-2 text-sm outline-none focus:border-coral" />
          <button type="submit" className="shrink-0 rounded-full bg-ink px-4 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-white">{tu.apply}</button>
        </form>
      </FilterGroup>

      {brands.length > 1 && (
        <FilterGroup title={tu.brand}>
          <div className="max-h-80 space-y-2 overflow-y-auto pe-1">
            <button type="button" className={catLink(brand === 'all')} onClick={() => setBrand('all')}>{t.all}</button>
            {(showAllBrands || brand !== 'all' ? brands : brands.slice(0, BRAND_VISIBLE_CAP)).map((bnd) => (
              <button key={bnd.name} type="button" className={catLink(brand === bnd.name)} onClick={() => setBrand(bnd.name)}>
                <span className="truncate">{bnd.name}</span><span className="shrink-0 text-xs opacity-70">{bnd.count}</span>
              </button>
            ))}
          </div>
          {!showAllBrands && brand === 'all' && brands.length > BRAND_VISIBLE_CAP && (
            <button type="button" onClick={() => setShowAllBrands(true)} className="mt-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] underline underline-offset-4">
              {tu.showAllBrands} ({brands.length - BRAND_VISIBLE_CAP} {tu.more})
            </button>
          )}
        </FilterGroup>
      )}

      {colors.length > 0 && (
        <FilterGroup title={t.color}>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(color === c ? 'all' : c)}
                aria-label={colorLabel(c)}
                aria-pressed={color === c}
                title={colorLabel(c)}
                style={{ background: COLOR_SWATCHES[c] || '#ccc' }}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-ink' : 'border-border hover:scale-105'}`}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="h-4 w-4 accent-coral" />
        {tu.availability}
      </label>
    </div>
  );

  const gridImages = assignGridImages(shown);

  return (
    <div>
      {/* quick filters + search — always visible, feeds the same state as the sidebar */}
      <div className="mb-8 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => setQuick(q.key)}
            data-testid={`quick-${q.key}`}
            className={`rounded-full border-[1.5px] px-5 py-2.5 text-[0.72rem] font-extrabold uppercase tracking-[0.1em] transition-all duration-300 ${quick === q.key ? 'border-ink bg-ink text-white' : 'border-ink/30 bg-card text-ink hover:border-ink hover:bg-sun'}`}
          >
            {q.label}
          </button>
        ))}
        <a
          href={`${b.whatsappHref}?text=${encodeURIComponent(dict.footerUi.bulkMsg)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border-[1.5px] border-ink/30 bg-card px-5 py-2.5 text-[0.72rem] font-extrabold uppercase tracking-[0.1em] text-ink transition-all duration-300 hover:border-ink hover:bg-sun"
        >
          {t.quickBulk}
        </a>
      </div>
      <div className="relative mb-8 max-w-md">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.search.placeholder}
          aria-label={dict.search.label}
          data-testid="shop-search"
          className="w-full rounded-full border-[1.5px] border-border bg-card py-3.5 ps-11 pe-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-coral"
        />
      </div>

      <div className="grid gap-12 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
      <aside className="hidden lg:block">
        <div className="sticky top-28 rounded-3xl border border-border bg-card p-6">
          {filterPanel}
          {chips.length > 0 && (
            <button type="button" onClick={clearAll} className="mt-8 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] underline underline-offset-4">{tu.clearAll} ({chips.length})</button>
          )}
        </div>
      </aside>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <p className="label-xs"><strong className="text-foreground">{filtered.length}</strong> {tu.itemsIn} {collectionTitle || tu.breadcrumbShop}</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setPanelOpen(true)} className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] transition-colors hover:bg-secondary lg:hidden">
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.6} /> {t.filters}{chips.length ? ` (${chips.length})` : ''}
            </button>
            <label className="hidden items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] sm:flex">
              {tu.perPage}
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="rounded-full border border-border bg-card px-3 py-2 text-[0.7rem] uppercase tracking-[0.1em] outline-none focus:border-coral">
                {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t.sort} className="rounded-full border border-border bg-card px-3 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] outline-none focus:border-coral">
              <option value="featured">{t.sortFeatured}</option>
              <option value="new">{t.sortNew}</option>
              <option value="low">{t.sortLow}</option>
              <option value="high">{t.sortHigh}</option>
            </select>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {chips.map((c, i) => (
              <button key={i} type="button" onClick={c.clear} aria-label={`${tu.remove}: ${c.label}`} className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white">
                {c.label} <X className="h-3 w-3" />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="rounded-full border border-border px-4 py-2 text-xs font-bold">{tu.clearAll}</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="py-16">
            <EmptyState dict={dict} locale={locale} collections={collections} title={t.emptyTitle} action={<button type="button" onClick={clearAll} className="rounded-full bg-ink px-6 py-3 text-xs font-extrabold uppercase tracking-[0.1em] text-white">{tu.clearAll}</button>} />
          </div>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-3">
              {shown.map((p, i) => (
                <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={gridImages[p.handle]} index={i} />
              ))}
            </div>
            {visible < filtered.length && (
              <div className="mt-12 flex flex-col items-center gap-3">
                <p className="label-xs">{shown.length} {tu.of} {filtered.length}</p>
                <button type="button" onClick={() => setVisible((v) => v + perPage)} className="rounded-full border-[1.5px] border-ink px-8 py-3.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-white">
                  {tu.loadMore}
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-20 overflow-hidden rounded-3xl bg-cyan">
          <div className="grid items-center gap-8 p-8 sm:grid-cols-[1fr_auto] sm:p-12">
            <div>
              <span className="eyebrow-new text-ink/70">{dict.bulkBand.title}</span>
              <p className="display-md mt-3 text-ink">{dict.bulkBand.lede}</p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-white transition-transform hover:scale-[1.03]">
              {dict.bulkBand.cta} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </a>
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      <div className={`fixed inset-0 z-[75] lg:hidden ${panelOpen ? 'visible' : 'invisible pointer-events-none'}`}>
        <div onClick={() => setPanelOpen(false)} className={`absolute inset-0 bg-ink/30 transition-opacity duration-400 ${panelOpen ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-card p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${panelOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between pb-6">
            <span className="eyebrow-new">{t.filters}</span>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close"><X className="h-5 w-5" strokeWidth={1.6} /></button>
          </div>
          {filterPanel}
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={clearAll} className="flex-1 rounded-full border-2 border-border py-4 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] transition-colors hover:border-ink">{tu.clearAll}</button>
            <button type="button" onClick={() => setPanelOpen(false)} className="flex-1 rounded-full bg-ink py-4 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral">{t.show} {filtered.length}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
