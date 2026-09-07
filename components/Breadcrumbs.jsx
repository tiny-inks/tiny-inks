import Link from 'next/link';

/* Always show where the user is. items: [{ href, label }, ...] — the last one
   is the current page (rendered as text). Home is added automatically. */
export default function Breadcrumbs({ items, dict, locale, className = '' }) {
  const trail = [{ href: `/${locale}`, label: dict.nav.home }, ...items];
  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb">
      {trail.map((it, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={i} className="breadcrumb-item">
            {last || !it.href ? <span aria-current="page">{it.label}</span> : <Link href={it.href}>{it.label}</Link>}
            {!last && <span aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
