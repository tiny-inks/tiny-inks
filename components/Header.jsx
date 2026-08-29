'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';

export default function Header({ dict, locale, collections = [] }) {
  const [menu, setMenu] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [announceIdx, setAnnounceIdx] = useState(0);
  const [term, setTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();
  const wishlist = useWishlist();
  const catsRef = useRef(null);

  /* rotating announcement bar */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(
      () => setAnnounceIdx((i) => (i + 1) % dict.announce.length),
      4000
    );
    return () => clearInterval(id);
  }, [dict.announce.length]);

  useEffect(() => { setMenu(false); setCatsOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    const onKey = (e) => {
      if (e.key === 'Escape') { setMenu(false); setCatsOpen(false); }
    };
    const onClick = (e) => {
      if (catsRef.current && !catsRef.current.contains(e.target)) setCatsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [menu]);

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const rest = pathname.replace(/^\/(en|ar)/, '') || '';
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '971500000000';

  const submitSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    setMenu(false);
    router.push(`/${locale}/shop${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  /* categories come from Shopify collections (demo mode: mock categories) */
  const catLinks = [
    { href: `/${locale}/shop`, label: dict.nav.allProducts },
    ...collections.map((c) => ({
      href: `/${locale}/shop/${c.handle}`,
      label: c.title,
    })),
    { href: `https://wa.me/${wa}?text=${encodeURIComponent(dict.footerUi.bulkMsg)}`, label: dict.nav.bulk, external: true },
  ];

  const searchForm = (extraClass = '') => (
    <form className={`mk-search ${extraClass}`} onSubmit={submitSearch} role="search">
      <input
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

  return (
    <>
      <div className="announce" role="status">
        <span key={announceIdx} className="announce-text">✦ {dict.announce[announceIdx]}</span>
      </div>

      <header className="header mk-header">
        <div className="wrap mk-row2">
          <button
            className="menu-toggle"
            onClick={() => setMenu(!menu)}
            aria-label="Menu"
            aria-expanded={menu}
          >
            {menu ? '✕' : '☰'}
          </button>

          <Link href={`/${locale}`} className="brand" aria-label={dict.brand}>
            <img src="/logo-icon.png" alt="" />
            <span className="brand-name">Tiny Inks</span>
          </Link>

          <div className="mk-cats-wrap" ref={catsRef}>
            <button
              className="btn btn-primary mk-cats-btn"
              onClick={() => setCatsOpen((v) => !v)}
              aria-expanded={catsOpen}
            >
              ☰ {dict.header.allCategories}
            </button>
            {catsOpen && (
              <div className="dropdown mk-cats-dd">
                {catLinks.map((l) =>
                  l.external ? (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                  ) : (
                    <Link key={l.label} href={l.href}>{l.label}</Link>
                  )
                )}
              </div>
            )}
          </div>

          {searchForm('mk-search-desktop')}

          <div className="header-actions">
            <Link href={`/${locale}/wishlist`} className="icon-btn" aria-label={`${dict.nav.wishlist}${wishlist?.handles.length ? ` (${wishlist.handles.length})` : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21C7 16.5 3 13.2 3 9.3 3 6.9 4.9 5 7.3 5c1.7 0 3.3.9 4.7 2.8C13.4 5.9 15 5 16.7 5 19.1 5 21 6.9 21 9.3c0 3.9-4 7.2-9 11.7z" />
              </svg>
              {wishlist?.handles.length > 0 && <span className="cart-count">{wishlist.handles.length}</span>}
            </Link>
            <button className="icon-btn cart-btn-mk" onClick={() => cart.setOpen(true)} aria-label={`${dict.cart}${cart.count > 0 ? ` (${cart.count})` : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 7h12l1.2 13H4.8L6 7z" />
                <path d="M9 10V6a3 3 0 0 1 6 0v4" />
              </svg>
              {cart.count > 0 && <span className="cart-count" key={cart.count}>{cart.count}</span>}
            </button>
            <Link href={`/${otherLocale}${rest}`} className="locale-btn" aria-label="Switch language">
              {otherLocale === 'ar' ? 'العربية' : 'EN'}
            </Link>
          </div>
        </div>

        {searchForm('mk-search-mobile wrap')}

        <nav className="mk-catbar" aria-label={dict.header.allCategories}>
          <div className="wrap mk-catbar-inner">
            {catLinks.map((l) =>
              l.external ? (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  className={pathname === l.href.split('?')[0] && !l.href.includes('?') ? 'active' : ''}
                >
                  {l.label}
                </Link>
              )
            )}
          </div>
        </nav>
      </header>

      {/* mobile drawer menu */}
      <nav className={`mk-drawer ${menu ? 'open' : ''}`} aria-label="Main">
        <div className="mk-drawer-top">
          <Link href={`/${otherLocale}${rest}`} className="locale-btn">
            {otherLocale === 'ar' ? 'العربية' : 'English'}
          </Link>
        </div>
        <Link href={`/${locale}`}>{dict.nav.home}</Link>
        {catLinks.map((l) =>
          l.external ? (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
          ) : (
            <Link key={l.label} href={l.href}>{l.label}</Link>
          )
        )}
        <Link href={`/${locale}/wishlist`}>{dict.nav.wishlist}</Link>
        <Link href={`/${locale}/about`}>{dict.nav.about}</Link>
        <Link href={`/${locale}/contact`}>{dict.nav.contact}</Link>
      </nav>
    </>
  );
}
