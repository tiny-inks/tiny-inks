import Link from 'next/link';

/* One-tap collection switcher shown above the shop grid on phones (desktop has
   the sidebar). Current collection highlighted. */
export default function CollectionChips({ collections, current = null, locale, dict }) {
  return (
    <nav className="col-chips" aria-label={dict.shopUi.categories}>
      <Link href={`/${locale}/shop`} className={`chip ${!current ? 'on' : ''}`} aria-current={!current ? 'page' : undefined}>
        {dict.shop.all}
      </Link>
      {collections.map((c) => (
        <Link
          key={c.handle}
          href={`/${locale}/shop/${c.handle}`}
          className={`chip ${current === c.handle ? 'on' : ''}`}
          aria-current={current === c.handle ? 'page' : undefined}
        >
          {c.title}
        </Link>
      ))}
    </nav>
  );
}
