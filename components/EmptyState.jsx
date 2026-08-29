import Link from 'next/link';

/* No dead ends: every empty state offers a search box and the top collections.
   Server-safe (plain form GET → /shop?q=). */
export default function EmptyState({ dict, locale, collections = [], title, cta, ctaHref, action = null }) {
  const top = collections.slice(0, 4);
  return (
    <div className="empty">
      <div className="empty-glyph" aria-hidden="true">✦</div>
      <h3>{title}</h3>
      {cta && ctaHref ? <Link href={ctaHref} className="btn btn-primary" style={{ marginBottom: 22 }}>{cta}</Link> : null}
      {action ? <div style={{ marginBottom: 22 }}>{action}</div> : null}
      <form className="empty-search" action={`/${locale}/shop`} method="get" role="search">
        <input type="search" name="q" placeholder={dict.search.placeholder} aria-label={dict.emptyState.search} />
        <button type="submit" aria-label={dict.search.label}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" />
          </svg>
        </button>
      </form>
      {top.length > 0 && (
        <div className="empty-links">
          <span className="empty-links-label">{dict.emptyState.browse}</span>
          <div className="chips" style={{ justifyContent: 'center' }}>
            <Link href={`/${locale}/shop`} className="chip">{dict.emptyState.all}</Link>
            {top.map((c) => (
              <Link key={c.handle} href={`/${locale}/shop/${c.handle}`} className="chip">{c.title}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
