'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';

/* ONE compact sticky row. Desktop: Home · Shop (Citron-style mega menu:
   Category / Brand / Price / Featured columns + promo tile) · Print · About ·
   Contact + inline search. Phones: search behind the icon, and the menu is the
   same 5 links with accordions for the Shop groups. */
export const OPEN_SEARCH_EVENT = 'ti:open-search';

export default function Header({ dict, locale, collections = [], brands = [] }) {
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [term, setTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();
  const wishlist = useWishlist();
  const mobileInput = useRef(null);
  const megaRef = useRef(null);

  /* route change closes everything */
  useEffect(() => { setMenu(false); setSearchOpen(false); setMegaOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menu]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setMenu(false); setSearchOpen(false); setMegaOpen(false); } };
    const onClick = (e) => { if (megaRef.current && !megaRef.current.contains(e.target)) setMegaOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, []);

  /* the bottom tab bar's Search tab asks the header to open the search row */
  useEffect(() => {
    const open = () => { setMenu(false); setSearchOpen(true); };
    window.addEventListener(OPEN_SEARCH_EVENT, open);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, open);
  }, []);
  useEffect(() => {
    if (searchOpen) setTimeout(() => mobileInput.current?.focus(), 60);
  }, [searchOpen]);

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const rest = pathname.replace(/^\/(en|ar)/, '') || '';
  const is = (href) => pathname === href;
  const inShop = pathname.startsWith(`/${locale}/shop`) || pathname.startsWith(`/${locale}/product`);
  const b = { wa: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '971500000000').replace(/\D/g, '') };
  const mm = dict.megaMenu;

  const NAV = [
    { href: `/${locale}`, label: dict.nav.home, active: is(`/${locale}`) },
    { href: `/${locale}/shop`, label: dict.nav.shop, active: inShop, mega: true },
    { href: `/${locale}/print`, label: dict.nav.print, active: pathname.startsWith(`/${locale}/print`) },
    { href: `/${locale}/about`, label: dict.nav.about, active: is(`/${locale}/about`) },
    { href: `/${locale}/contact`, label: dict.nav.contact, active: is(`/${locale}/contact`) },
  ];

  /* the four Shop groups — shared by the desktop mega menu and mobile accordions */
  const groups = [
    {
      key: 'category', title: mm.byCategory,
      links: [
        { href: `/${locale}/shop`, label: dict.nav.allProducts },
        ...collections.map((c) => ({ href: `/${locale}/shop/${c.handle}`, label: c.title })),
      ],
    },
    {
      key: 'brand', title: mm.byBrand,
      links: brands.map((name) => ({ href: `/${locale}/shop?brand=${encodeURIComponent(name)}`, label: name })),
    },
    {
      key: 'price', title: mm.byPrice,
      links: dict.priceRow.chips.map((c) => {
        const p = new URLSearchParams();
        if (c.min) p.set('min', String(c.min));
        if (c.max) p.set('max', String(c.max));
        return { href: `/${locale}/shop?${p.toString()}`, label: c.label };
      }),
    },
    {
      key: 'featured', title: mm.featured,
      links: [
        { href: `/${locale}/shop?sort=new`, label: mm.newArrivals },
        { href: `/${locale}/shop`, label: mm.bestSellers },
        { href: `/${locale}/bundles`, label: mm.giftSets },
        { href: `https://wa.me/${b.wa}?text=${encodeURIComponent(dict.footerUi.bulkMsg)}`, label: mm.bulkOrders, ext: true },
      ],
    },
  ];

  const submitSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    setMenu(false);
    setSearchOpen(false);
    router.push(`/${locale}/shop${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  const searchForm = (extraClass, ref) => (
    <form className={`mk-search ${extraClass}`} onSubmit={submitSearch} role="search">
      <input
        ref={ref}
        id={extraClass.includes('mobile') ? 'site-search-mobile' : 'site-search'}
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={dict.search.placeholder}
        aria-label={dict.search.label}
      />
      <button type="submit" aria-label={dict.search.label}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" />
        </svg>
      </button>
    </form>
  );

  const linkOut = (l, extra = '', tab) => l.ext
    ? <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={extra} tabIndex={tab}>{l.label}</a>
    : <Link key={l.href + l.label} href={l.href} className={extra} tabIndex={tab}>{l.label}</Link>;

  return (
    <>
      {/* Citron-style time-driven CSS marquee: two identical copies scroll -50%, pauses on hover/focus */}
      <div className="announce" role="status" aria-label="Announcements">
        <div className="announce-track">
          {[0, 1].map((copy) => (
            <div className="announce-group" key={copy} aria-hidden={copy === 1}>
              {dict.announce.map((msg, i) => (
                <span className="announce-item" key={i}>
                  ✦ {msg}
                  {i < dict.announce.length - 1 && <span className="announce-sep" aria-hidden="true">•</span>}
                </span>
              ))}
              <span className="announce-sep" aria-hidden="true">•</span>
            </div>
          ))}
        </div>
      </div>

      <header className={`header mk-header ${menu ? 'menu-open' : ''}`}>
        <div className="wrap hdr-row">
          <button
            className="menu-toggle"
            onClick={() => { setMenu(!menu); setSearchOpen(false); }}
            aria-label={menu ? dict.header.closeMenu : dict.header.menu}
            aria-expanded={menu}
            aria-controls="site-menu"
          >
            {menu ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>

          <Link href={`/${locale}`} className="brand" aria-label={dict.brand}>
            <img src="/logo-icon.png" alt="" />
            <span className="brand-name">Tiny Inks</span>
          </Link>

          <nav className="hdr-nav" aria-label="Main">
            {NAV.map((n) => n.mega ? (
              <span key={n.href} className={`mega-wrap ${megaOpen ? 'open' : ''}`} ref={megaRef}>
                <Link href={n.href} className={`hdr-link ${n.active ? 'active' : ''}`} aria-current={n.active ? 'page' : undefined}>
                  {n.label}
                </Link>
                <button
                  className="mega-toggle"
                  onClick={() => setMegaOpen((v) => !v)}
                  aria-expanded={megaOpen}
                  aria-label={`${n.label} — ${mm.byCategory}`}
                  aria-controls="mega-panel"
                >
                  ▾
                </button>
                {/* Citron-style mega menu: 4 link columns + promo tile */}
                <div className="mega" id="mega-panel" data-testid="mega-panel">
                  <div className="wrap mega-inner">
                    {groups.map((g) => (
                      <div className="mega-col" key={g.key}>
                        <h3>{g.title}</h3>
                        {g.links.map((l) => linkOut(l))}
                      </div>
                    ))}
                    <Link href={`/${locale}/bundles`} className="mega-promo" onClick={() => setMegaOpen(false)}>
                      <img src="/products/gift-sets-bundles-2.webp" alt="" loading="lazy" />
                      <span>
                        <strong>{mm.promoTitle}</strong>
                        <em>{mm.promoCta} →</em>
                      </span>
                    </Link>
                  </div>
                </div>
              </span>
            ) : (
              <Link key={n.href} href={n.href} className={`hdr-link ${n.active ? 'active' : ''}`} aria-current={n.active ? 'page' : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>

          {searchForm('mk-search-desktop')}

          <div className="header-actions">
            <button
              className={`icon-btn search-toggle ${searchOpen ? 'active' : ''}`}
              onClick={() => { setSearchOpen((v) => !v); setMenu(false); }}
              aria-label={dict.search.label}
              aria-expanded={searchOpen}
              aria-controls="site-search-row"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" />
              </svg>
            </button>
            <Link
              href={`/${locale}/wishlist`}
              className={`icon-btn ${is(`/${locale}/wishlist`) ? 'active' : ''}`}
              aria-label={`${dict.nav.wishlist}${wishlist?.handles.length ? ` (${wishlist.handles.length})` : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21C7 16.5 3 13.2 3 9.3 3 6.9 4.9 5 7.3 5c1.7 0 3.3.9 4.7 2.8C13.4 5.9 15 5 16.7 5 19.1 5 21 6.9 21 9.3c0 3.9-4 7.2-9 11.7z" />
              </svg>
              {wishlist?.handles.length > 0 && <span className="cart-count">{wishlist.handles.length}</span>}
            </Link>
            <button className="icon-btn cart-btn-mk" onClick={() => cart.setOpen(true)} aria-label={`${dict.cart}${cart.count > 0 ? ` (${cart.count})` : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 7h12l1.2 13H4.8L6 7z" /><path d="M9 10V6a3 3 0 0 1 6 0v4" />
              </svg>
              {cart.count > 0 && <span className="cart-count" key={cart.count}>{cart.count}</span>}
            </button>
            <Link href={`/${otherLocale}${rest}`} className="locale-btn hdr-locale" aria-label="Switch language">
              {otherLocale === 'ar' ? 'العربية' : 'EN'}
            </Link>
          </div>
        </div>

        {/* phone search row */}
        <div id="site-search-row" className={`hdr-search wrap ${searchOpen ? 'open' : ''}`} hidden={!searchOpen}>
          {searchForm('mk-search-mobile', mobileInput)}
        </div>

        {/* backdrop behind the slide-in phone menu — click closes */}
        <button
          type="button"
          className={`mk-backdrop ${menu ? 'open' : ''}`}
          aria-hidden={!menu}
          tabIndex={-1}
          onClick={() => setMenu(false)}
        />

        {/* phone menu — 5 links + the Shop groups as accordions */}
        <nav id="site-menu" className={`mk-drawer ${menu ? 'open' : ''}`} aria-label="Main" aria-hidden={!menu}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={n.active ? 'active' : ''} aria-current={n.active ? 'page' : undefined} tabIndex={menu ? 0 : -1}>
              {n.label}
            </Link>
          ))}
          <div className="drw-groups">
            {groups.map((g) => (
              <details className="drw-acc" key={g.key}>
                <summary>{g.title}</summary>
                <div className="drw-acc-links">
                  {g.links.map((l) => linkOut(l, '', menu ? 0 : -1))}
                </div>
              </details>
            ))}
          </div>
          <div className="mk-drawer-foot">
            <Link href={`/${otherLocale}${rest}`} className="locale-btn" tabIndex={menu ? 0 : -1}>
              {otherLocale === 'ar' ? 'العربية' : 'English'}
            </Link>
            <Link href={`/${locale}/wishlist`} className="btn btn-ghost btn-sm" tabIndex={menu ? 0 : -1}>{dict.nav.wishlist}</Link>
            <button className="btn btn-primary btn-sm" onClick={() => { setMenu(false); cart.setOpen(true); }} tabIndex={menu ? 0 : -1}>
              {dict.cart}{cart.count > 0 ? ` (${cart.count})` : ''}
            </button>
          </div>
        </nav>
      </header>
    </>
  );
}
