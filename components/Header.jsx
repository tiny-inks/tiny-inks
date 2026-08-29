'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';

/* ONE header. Row 1: logo · search · wishlist · cart · language.
   Row 2 (desktop): Shop ▾ (collections) · Gift Sets · Bulk Orders · About · Contact.
   Mobile: the hamburger holds everything in one clear order. */
export default function Header({ dict, locale, collections = [] }) {
  const [menu, setMenu] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [announceIdx, setAnnounceIdx] = useState(0);
  const [term, setTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();
  const wishlist = useWishlist();
  const shopRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setAnnounceIdx((i) => (i + 1) % dict.announce.length), 4000);
    return () => clearInterval(id);
  }, [dict.announce.length]);

  useEffect(() => { setMenu(false); setShopOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    const onKey = (e) => { if (e.key === 'Escape') { setMenu(false); setShopOpen(false); } };
    const onClick = (e) => { if (shopRef.current && !shopRef.current.contains(e.target)) setShopOpen(false); };
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
  const bulkHref = `https://wa.me/${wa}?text=${encodeURIComponent(dict.footerUi.bulkMsg)}`;
  const is = (href) => pathname === href;
  const inShop = pathname.startsWith(`/${locale}/shop`);
  const currentCollection = collections.find((c) => pathname === `/${locale}/shop/${c.handle}`)?.handle || null;

  const submitSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    setMenu(false);
    router.push(`/${locale}/shop${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  const searchForm = (extraClass = '') => (
    <form className={`mk-search ${extraClass}`} onSubmit={submitSearch} role="search">
      <input
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

  const policyLinks = ['shipping', 'returns', 'privacy', 'terms'].map((s) => ({
    href: `/${locale}/policies/${s}`,
    label: dict.policies[s],
  }));

  const collectionLinks = (extra = '') => (
    <>
      <Link href={`/${locale}/shop`} className={`${extra} ${inShop && !currentCollection ? 'active' : ''}`}>
        {dict.nav.allProducts}
      </Link>
      {collections.map((c) => (
        <Link
          key={c.handle}
          href={`/${locale}/shop/${c.handle}`}
          className={`${extra} ${currentCollection === c.handle ? 'active' : ''}`}
          aria-current={currentCollection === c.handle ? 'page' : undefined}
        >
          {c.title}
        </Link>
      ))}
    </>
  );

  return (
    <>
      <div className="announce" role="status">
        <span key={announceIdx} className="announce-text">✦ {dict.announce[announceIdx]}</span>
      </div>

      <header className="header mk-header">
        {/* row 1 */}
        <div className="wrap mk-row2">
          <button className="menu-toggle" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>
            {menu ? '✕' : '☰'}
          </button>
          <Link href={`/${locale}`} className="brand" aria-label={dict.brand}>
            <img src="/logo-icon.png" alt="" />
            <span className="brand-name">Tiny Inks</span>
          </Link>
          {searchForm('mk-search-desktop')}
          <div className="header-actions">
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
            <Link href={`/${otherLocale}${rest}`} className="locale-btn" aria-label="Switch language">
              {otherLocale === 'ar' ? 'العربية' : 'EN'}
            </Link>
          </div>
        </div>

        {searchForm('mk-search-mobile wrap')}

        {/* row 2 — desktop main nav */}
        <nav className="mk-catbar" aria-label="Main">
          <div className="wrap mk-catbar-inner">
            <div className="mk-shop" ref={shopRef}>
              <Link href={`/${locale}/shop`} className={inShop ? 'active' : ''}>{dict.nav.shop}</Link>
              <button
                className="mk-shop-caret"
                onClick={() => setShopOpen((v) => !v)}
                aria-expanded={shopOpen}
                aria-label={dict.shopUi.categories}
              >
                ▾
              </button>
              <div className={`dropdown mk-shop-dd ${shopOpen ? 'open' : ''}`}>{collectionLinks()}</div>
            </div>
            <Link href={`/${locale}/bundles`} className={is(`/${locale}/bundles`) ? 'active' : ''}>{dict.nav.drops}</Link>
            <a href={bulkHref} target="_blank" rel="noreferrer">{dict.nav.bulk}</a>
            <Link href={`/${locale}/about`} className={is(`/${locale}/about`) ? 'active' : ''}>{dict.nav.about}</Link>
            <Link href={`/${locale}/contact`} className={is(`/${locale}/contact`) ? 'active' : ''}>{dict.nav.contact}</Link>
          </div>
        </nav>
      </header>

      {/* mobile menu — everything, in one clear order */}
      <nav className={`mk-drawer ${menu ? 'open' : ''}`} aria-label="Main">
        <div className="mk-group-label">{dict.menu.shop}</div>
        {collectionLinks()}
        <div className="mk-group-label">{dict.menu.more}</div>
        <Link href={`/${locale}/bundles`} className={is(`/${locale}/bundles`) ? 'active' : ''}>{dict.nav.drops}</Link>
        <a href={bulkHref} target="_blank" rel="noreferrer">{dict.nav.bulk}</a>
        <Link href={`/${locale}/about`} className={is(`/${locale}/about`) ? 'active' : ''}>{dict.nav.about}</Link>
        <Link href={`/${locale}/contact`} className={is(`/${locale}/contact`) ? 'active' : ''}>{dict.nav.contact}</Link>
        <Link href={`/${locale}/wishlist`} className={is(`/${locale}/wishlist`) ? 'active' : ''}>{dict.nav.wishlist}</Link>
        <div className="mk-group-label">{dict.menu.policies}</div>
        {policyLinks.map((l) => (
          <Link key={l.href} href={l.href} className={`mk-small ${is(l.href) ? 'active' : ''}`}>{l.label}</Link>
        ))}
        <Link href={`/${locale}/faq`} className={`mk-small ${is(`/${locale}/faq`) ? 'active' : ''}`}>{dict.policies.faq}</Link>
      </nav>
    </>
  );
}
