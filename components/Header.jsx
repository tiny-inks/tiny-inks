'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe, Heart, Home as HomeIcon, Info, Mail, Menu, Phone, Printer, Search, Send, ShoppingBag, Store, Truck, X,
} from 'lucide-react';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';
import { getBusiness } from '@/lib/site';

/* Lovable-style header: announcement marquee + compact sticky nav row +
   full-screen slide-in menu on phones (icon tiles, no bottom tab bar). */
export default function Header({ dict, locale }) {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const cart = useCart();
  const wishlist = useWishlist();
  const lockedScrollY = useRef(0);
  const b = getBusiness();

  useEffect(() => setMenu(false), [pathname]);

  useEffect(() => {
    if (!menu) return;
    lockedScrollY.current = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, lockedScrollY.current);
    };
  }, [menu]);

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const rest = pathname.replace(/^\/(en|ar)/, '') || '';
  const is = (href) => pathname === href;

  const NAV = [
    { href: `/${locale}`, label: dict.nav.home, active: is(`/${locale}`) },
    { href: `/${locale}/shop`, label: dict.nav.shop, active: pathname.startsWith(`/${locale}/shop`) || pathname.startsWith(`/${locale}/product`) },
    { href: `/${locale}/print`, label: dict.nav.print, active: pathname.startsWith(`/${locale}/print`) },
    { href: `/${locale}/about`, label: dict.nav.about, active: is(`/${locale}/about`) },
    { href: `/${locale}/contact`, label: dict.nav.contact, active: is(`/${locale}/contact`) },
  ];

  const MENU_NAV = [
    { href: `/${locale}`, label: dict.nav.home, sub: dict.header.allCategories, Icon: HomeIcon, tint: 'bg-coral/15 text-coral' },
    { href: `/${locale}/shop`, label: dict.nav.shop, sub: dict.tagline, Icon: Store, tint: 'bg-sky/30 text-ink' },
    { href: `/${locale}/wishlist`, label: dict.nav.wishlist, sub: dict.cartUi.viewCart, Icon: Heart, tint: 'bg-coral/15 text-coral' },
    { href: `/${locale}/print`, label: dict.nav.print, sub: dict.print.eyebrow, Icon: Printer, tint: 'bg-cyan/40 text-ink' },
    { href: `/${locale}/about`, label: dict.nav.about, sub: dict.about.eyebrow, Icon: Info, tint: 'bg-sky/50 text-ink' },
    { href: `/${locale}/contact`, label: dict.nav.contact, sub: dict.contact.eyebrow, Icon: Mail, tint: 'bg-coral/15 text-coral' },
  ];

  const socials = [
    ...(b.instagram ? [{ Icon: Send, label: 'Instagram', href: b.instagram }] : []),
    ...(b.tiktok ? [{ Icon: Send, label: 'TikTok', href: b.tiktok }] : []),
    { Icon: Send, label: 'WhatsApp', href: b.whatsappHref },
  ];

  return (
    <>
      <div className="sticky top-0 z-50 shadow-[0_8px_30px_-24px_var(--ink)]">
        {/* Announcement bar */}
        <div className="flex h-7 items-center gap-4 overflow-hidden bg-ink px-4 text-[0.63rem] font-bold text-white sm:px-8">
          <span className="hidden shrink-0 items-center gap-2 lg:flex">
            <Truck className="h-4 w-4" strokeWidth={1.6} /> {dict.tagline}
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div className="marquee-new flex w-max">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex shrink-0">
                  {dict.announce.map((msg, i) => (
                    <span key={`${dup}-${i}`} className="flex items-center gap-6 px-6 whitespace-nowrap">
                      {msg}
                      <span className="text-coral">●</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <a href={b.whatsappHref} target="_blank" rel="noreferrer" className="hidden shrink-0 items-center gap-2 hover:text-cyan lg:flex">
            <Phone className="h-4 w-4" strokeWidth={1.6} /> <bdi dir="ltr">WhatsApp</bdi>
          </a>
        </div>

        {/* Main nav */}
        <header className="border-b border-border/70 bg-card/95 backdrop-blur-md">
          <div className="mx-auto grid h-14 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:h-16 sm:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label={dict.header.menu}
                onClick={() => setMenu(true)}
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary lg:hidden"
              >
                <Menu className="h-5 w-5" strokeWidth={1.6} />
              </button>
              <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`link-underline py-2 text-[0.72rem] font-extrabold uppercase tracking-[0.11em] transition-colors hdr-link ${item.active ? 'text-coral' : 'text-foreground/75 hover:text-foreground'}`}
                    aria-current={item.active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <Link href={`/${locale}`} className="flex items-center justify-center" aria-label="Tiny Inks home">
              <img src="/logo-icon.png" alt="Tiny Inks" width={44} height={44} className="h-11 w-11 object-contain sm:h-12 sm:w-12" />
            </Link>

            <div className="flex items-center justify-end gap-1 sm:gap-2">
              <Link
                href={`/${otherLocale}${rest}`}
                aria-label="Language"
                className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] transition-colors hover:border-coral hover:text-coral sm:inline-flex"
              >
                <Globe className="h-4 w-4" strokeWidth={1.6} /> {otherLocale === 'ar' ? 'العربية' : 'English'}
              </Link>
              <Link href={`/${locale}/shop`} aria-label={dict.search.label} className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-secondary">
                <Search className="h-[19px] w-[19px]" strokeWidth={1.6} />
              </Link>
              <Link
                href={`/${locale}/wishlist`}
                aria-label={`${dict.nav.wishlist} (${wishlist?.count || 0})`}
                className="relative grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-secondary"
              >
                <Heart className="h-[19px] w-[19px]" strokeWidth={1.6} />
                {wishlist?.count > 0 && (
                  <span className="absolute -end-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-coral px-1 text-[0.6rem] font-extrabold text-white">
                    {wishlist.count}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => cart?.setOpen(true)}
                aria-label={`${dict.cart} (${cart?.count || 0})`}
                className="relative grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-secondary"
              >
                <ShoppingBag className="h-[19px] w-[19px]" strokeWidth={1.6} />
                <span className="absolute -end-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-coral px-1 text-[0.6rem] font-extrabold text-white">
                  {cart?.count || 0}
                </span>
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Mobile full-screen menu */}
      <div
        id="site-menu"
        className={`paper-fibre fixed inset-0 z-[60] flex flex-col overflow-y-auto overflow-x-clip bg-card transition-[opacity,visibility] duration-300 lg:hidden ${menu ? 'visible opacity-100' : 'invisible opacity-0'}`}
        aria-hidden={!menu}
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-1/3 h-56 w-56 rounded-full bg-coral/15 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-lg items-center justify-between px-5 py-4">
          <img src="/logo-icon.png" alt="Tiny Inks" width={44} height={44} className="h-11 w-11 object-contain" />
          <button type="button" aria-label={dict.header.closeMenu} onClick={() => setMenu(false)} className="grid h-10 w-10 place-items-center rounded-full bg-secondary">
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>

        <div className="relative mx-auto mt-2 w-[calc(100%-2.5rem)] max-w-[472px]">
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-1.5">
            {['en', 'ar'].map((code) => (
              <Link
                key={code}
                href={`/${code}${rest}`}
                className={`flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-extrabold uppercase tracking-[0.12em] transition-colors ${locale === code ? 'bg-ink text-white' : 'text-foreground/70'}`}
              >
                {code === 'en' ? 'English' : 'العربية'}
              </Link>
            ))}
          </div>
        </div>

        <nav className="relative mx-auto mt-5 flex w-full max-w-lg flex-col gap-2.5 px-5" aria-label="Main">
          {MENU_NAV.map(({ Icon, ...item }, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/80 px-4 py-3.5 shadow-[0_10px_30px_-22px_var(--ink)] transition-colors active:border-coral"
              style={{
                transitionDelay: `${i * 45}ms`,
                transform: menu ? 'none' : 'translateY(16px)',
                opacity: menu ? 1 : 0,
                transitionProperty: 'transform, opacity',
                transitionDuration: '500ms',
                transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.tint}`}>
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <span className="flex-1">
                <span className="block font-display text-xl leading-tight">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{item.sub}</span>
              </span>
              <span aria-hidden="true" className="text-lg text-muted-foreground/50 transition-transform group-active:translate-x-1 rtl:rotate-180">→</span>
            </Link>
          ))}
        </nav>

        <div className="relative mx-auto mt-auto w-full max-w-lg px-5 pb-8 pt-8">
          <div className="flex items-center justify-center gap-3">
            {socials.map(({ Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card transition-colors hover:border-coral hover:text-coral">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </a>
            ))}
          </div>
          {b.address && (
            <div className="mt-5 flex flex-col items-center gap-1.5 text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/70">
                {b.address}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
