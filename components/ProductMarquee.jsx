import Link from 'next/link';

/* Seamless slow marquee of circular product photos. Track is duplicated for
   the wrap; CSS reverses direction in RTL, pauses on hover, and goes fully
   static (scrollable) under prefers-reduced-motion. Server component. */
export default function ProductMarquee({ products, locale, label }) {
  const items = products.filter((p) => p.images?.[0]?.url).slice(0, 12);
  if (items.length < 4) return null;

  const track = (ariaHidden) => (
    <div className="pmq-track" aria-hidden={ariaHidden || undefined}>
      {items.map((p, i) => (
        <Link
          key={`${p.handle}-${i}`}
          href={`/${locale}/product/${p.handle}`}
          className="pmq-item"
          tabIndex={ariaHidden ? -1 : 0}
          aria-label={ariaHidden ? undefined : p.title}
        >
          <img src={p.images[0].url} alt={ariaHidden ? '' : p.title} loading="lazy" />
        </Link>
      ))}
    </div>
  );

  return (
    <div className="pmq" aria-label={label}>
      <div className="pmq-rail">
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}
