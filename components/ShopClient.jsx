'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import { assignGridImages } from '@/lib/product-images';
import { COLOR_SWATCHES, COLOR_NAMES } from '@/lib/mock-data';

const PER_PAGE_OPTIONS = [12, 24, 48];

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
  const [perPage, setPerPage] = useState(12);
  const [visible, setVisible] = useState(12);
  const [panelOpen, setPanelOpen] = useState(false);

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
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [query, type, color, brand, minP, maxP, inStockOnly, sort, pathname, router]);

  useEffect(() => { setVisible(perPage); }, [perPage, query, type, color, brand, minP, maxP, inStockOnly, sort]);

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

  const colors = useMemo(
    () => [...new Set(products.map((p) => p.color).filter(Boolean))],
    [products]
  );
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
      return true;
    });
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'new') list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'featured') {
      list = [...list].sort(
        (a, b) => (b.tags?.includes('bestseller') ? 1 : 0) - (a.tags?.includes('bestseller') ? 1 : 0)
      );
    }
    return list;
  }, [products, type, color, brand, minP, maxP, inStockOnly, sort, query]);

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
    setInStockOnly(false);
  };

  const applyPrice = (e) => {
    e.preventDefault();
    setMinP(minDraft);
    setMaxP(maxDraft);
  };

  const sidebar = (
    <aside className={`filters ${panelOpen ? 'open' : ''}`} aria-label={t.filters}>
      <div className="filter-group">
        <h4>{tu.categories}</h4>
        <div className="cat-list">
          {/* collection links — driven by Shopify (demo: mock categories) */}
          <Link href={`/${locale}/shop`} className={`cat-link ${!currentCollection ? 'on' : ''}`} aria-current={!currentCollection ? 'page' : undefined}>
            {t.all}
          </Link>
          {collections.map((c) => (
            <Link
              key={c.handle}
              href={`/${locale}/shop/${c.handle}`}
              className={`cat-link ${currentCollection === c.handle ? 'on' : ''}`}
              aria-current={currentCollection === c.handle ? 'page' : undefined}
            >
              {c.title} {typeof c.count === 'number' ? <span>{c.count}</span> : null}
            </Link>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h4>{tu.priceRange}</h4>
        <form className="price-form" onSubmit={applyPrice}>
          <input
            type="number" inputMode="numeric" min="0" className="input"
            placeholder={tu.min} value={minDraft} onChange={(e) => setMinDraft(e.target.value)}
            aria-label={tu.min}
          />
          <span aria-hidden="true">–</span>
          <input
            type="number" inputMode="numeric" min="0" className="input"
            placeholder={tu.max} value={maxDraft} onChange={(e) => setMaxDraft(e.target.value)}
            aria-label={tu.max}
          />
          <button type="submit" className="btn btn-ink btn-sm">{tu.apply}</button>
        </form>
      </div>

      {brands.length > 1 && (
        <div className="filter-group">
          <h4>{tu.brand}</h4>
          <div className="cat-list">
            <button className={`cat-link ${brand === 'all' ? 'on' : ''}`} onClick={() => setBrand('all')}>{t.all}</button>
            {brands.map((b) => (
              <button key={b.name} className={`cat-link ${brand === b.name ? 'on' : ''}`} onClick={() => setBrand(b.name)}>
                {b.name} <span>{b.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div className="filter-group">
          <h4>{t.color}</h4>
          <div className="swatch-row">
            {colors.map((c) => (
              <button
                key={c}
                className={`swatch-btn ${color === c ? 'on' : ''}`}
                style={{ background: COLOR_SWATCHES[c] || '#ccc' }}
                onClick={() => setColor(color === c ? 'all' : c)}
                aria-label={colorLabel(c)}
                aria-pressed={color === c}
                title={colorLabel(c)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="filter-group">
        <label className="avail-toggle">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          {tu.availability}
        </label>
      </div>

      <button className="btn btn-primary sheet-apply" onClick={() => setPanelOpen(false)}>
        {t.show} {filtered.length} {t.results} ✦
      </button>
    </aside>
  );

  const gridImages = assignGridImages(shown);

  return (
    <div>

      {/* count + sort + per-page on one line */}
      <div className="shop-toolbar">
        <span className="result-count" aria-live="polite">
          <strong>{filtered.length}</strong> {tu.itemsIn} {collectionTitle || tu.breadcrumbShop}
        </span>
        <div className="toolbar-actions">
          <label className="perpage-label">
            {tu.perPage}
            <select className="select" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t.sort}>
            <option value="featured">{t.sortFeatured}</option>
            <option value="new">{t.sortNew}</option>
            <option value="low">{t.sortLow}</option>
            <option value="high">{t.sortHigh}</option>
          </select>
          <button
            className={`filters-toggle chip ${chips.length ? 'on' : ''}`}
            onClick={() => setPanelOpen(true)}
            aria-expanded={panelOpen}
          >
            {t.filters}{chips.length ? ` · ${chips.length}` : ''}
          </button>
        </div>
      </div>

      {/* active filter chips */}
      {chips.length > 0 && (
        <div className="active-chips">
          {chips.map((c, i) => (
            <button key={i} className="chip on chip-x" onClick={c.clear} aria-label={`${tu.remove}: ${c.label}`}>
              {c.label} <span aria-hidden="true">×</span>
            </button>
          ))}
          <button className="chip" onClick={clearAll}>{tu.clearAll}</button>
        </div>
      )}

      <div className="shop-layout">
        <div className={`sheet-veil ${panelOpen ? 'open' : ''}`} onClick={() => setPanelOpen(false)} />
        {sidebar}

        <div>
          {filtered.length === 0 ? (
            <EmptyState
              dict={dict}
              locale={locale}
              collections={collections}
              title={t.emptyTitle}
              action={<button className="btn btn-sm" onClick={clearAll}>{tu.clearAll}</button>}
            />
          ) : (
            <>
              <div className="grid">
                {shown.map((p) => (
                  <ProductCard key={p.id} product={p} locale={locale} dict={dict} image={gridImages[p.handle]} />
                ))}
              </div>
              {visible < filtered.length && (
                <div className="load-more">
                  <span className="result-count">{shown.length} {tu.of} {filtered.length}</span>
                  <button className="btn" onClick={() => setVisible((v) => v + perPage)}>
                    {tu.loadMore}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
