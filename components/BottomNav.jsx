'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './CartContext';
import { OPEN_SEARCH_EVENT } from './Header';

/* Phone-only tab bar: Home / Shop / Search / Cart. Search asks the header to
   drop its search row down. Hidden on product pages where the sticky buy bar
   takes the slot. */
export default function BottomNav({ dict, locale }) {
  const pathname = usePathname();
  const cart = useCart();

  const openSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
  };

  const icon = {
    home: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>,
    shop: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16l-1.5 14h-13z" /><path d="M8 10V6a4 4 0 0 1 8 0v4" /></svg>,
    search: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>,
    cart: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.6" /><circle cx="17" cy="20" r="1.6" /><path d="M3 4h2l2.5 12h10L20 8H6" /></svg>,
  };

  return (
    <nav className="bottom-nav" aria-label={dict.nav.shop}>
      <Link href={`/${locale}`} className={`bottom-tab ${pathname === `/${locale}` ? 'active' : ''}`}>
        <span className="bottom-tab-icon">{icon.home}</span><span>{dict.nav.home}</span>
      </Link>
      <Link href={`/${locale}/shop`} className={`bottom-tab ${pathname.startsWith(`/${locale}/shop`) ? 'active' : ''}`}>
        <span className="bottom-tab-icon">{icon.shop}</span><span>{dict.nav.shop}</span>
      </Link>
      <button type="button" className="bottom-tab" onClick={openSearch}>
        <span className="bottom-tab-icon">{icon.search}</span><span>{dict.search.label}</span>
      </button>
      <Link href={`/${locale}/cart`} className={`bottom-tab ${pathname === `/${locale}/cart` ? 'active' : ''}`}>
        <span className="bottom-tab-icon">
          {icon.cart}
          {cart.count > 0 && <span className="bottom-tab-badge">{cart.count}</span>}
        </span>
        <span>{dict.cart}</span>
      </Link>
    </nav>
  );
}
