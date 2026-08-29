import Link from 'next/link';
import Reveal from './Reveal';
import { COLOR_SWATCHES, COLOR_NAMES } from '@/lib/mock-data';
import { PHOTOS, imgAlt } from '@/lib/images';

/* ---- 1. Shop by color — the palette as a signature strip ---- */
export function ShopByColor({ dict, locale }) {
  const names = COLOR_NAMES[locale] || COLOR_NAMES.en;
  return (
    <section className="section row-section">
      <div className="wrap">
        <Reveal>
          <div className="eyebrow">{dict.colorRow.eyebrow}</div>
          <h2>{dict.colorRow.title}</h2>
        </Reveal>
        <Reveal stagger className="color-strip">
          {Object.entries(COLOR_SWATCHES).map(([key, hex]) => (
            <Link key={key} href={`/${locale}/shop?color=${key}`} className="color-dot">
              <span className="color-dot-circle" style={{ background: hex }}>
                <span className="color-dot-spark" aria-hidden="true">✦</span>
              </span>
              <span className="color-dot-name">{names[key] || key}</span>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---- 2. Shop by price ---- */
export function ShopByPrice({ dict, locale }) {
  const href = (c) => {
    const p = new URLSearchParams();
    if (c.min) p.set('min', String(c.min));
    if (c.max) p.set('max', String(c.max));
    return `/${locale}/shop?${p.toString()}`;
  };
  return (
    <section className="section row-section">
      <div className="wrap">
        <Reveal><h2>{dict.priceRow.title}</h2></Reveal>
        <Reveal stagger className="price-chips">
          {dict.priceRow.chips.map((c, i) => (
            <Link key={i} href={href(c)} className="price-chip">
              {c.label} <span className="arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---- 3. Gift finder ---- */
const GIFT_META = (locale) => [
  { href: `/${locale}/shop/notebooks`, photo: PHOTOS.notesNotebook, bg: 'var(--blue)' },
  { href: `/${locale}/shop/desk-notes`, photo: PHOTOS.stickyWall, bg: 'var(--mustard)' },
  { href: `/${locale}/bundles`, photo: PHOTOS.giftBlush, bg: 'var(--blush)' },
];

export function GiftFinder({ dict, locale }) {
  const meta = GIFT_META(locale);
  return (
    <section className="section row-section">
      <div className="wrap">
        <Reveal>
          <div className="eyebrow">{dict.giftFinder.eyebrow}</div>
          <h2>{dict.giftFinder.title}</h2>
        </Reveal>
        <Reveal stagger className="gift-tiles">
          {dict.giftFinder.tiles.map((tile, i) => (
            <Link key={i} href={meta[i].href} className="gift-tile" style={{ background: meta[i].bg }}>
              <img src={meta[i].photo.sm || meta[i].photo.url} alt={imgAlt(meta[i].photo, locale)} loading="lazy" />
              <span>
                <strong>{tile.t}</strong>
                <small>{tile.d}</small>
              </span>
              <span className="arrow gift-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---- 4. Bulk & school orders — B2B band ---- */
export function BulkBand({ dict }) {
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '971500000000';
  const href = `https://wa.me/${wa}?text=${encodeURIComponent(dict.footerUi.bulkMsg)}`;
  return (
    <section className="section row-section">
      <div className="wrap">
        <Reveal>
          <div className="block ink bulk-band">
            <div>
              <h2>{dict.bulkBand.title}</h2>
              <p className="bulk-lede">{dict.bulkBand.lede}</p>
              <ul className="bulk-bullets">
                {dict.bulkBand.bullets.map((b, i) => (
                  <li key={i}><span aria-hidden="true">✦</span> {b}</li>
                ))}
              </ul>
            </div>
            <a className="btn btn-primary" href={href} target="_blank" rel="noreferrer">
              {dict.bulkBand.cta}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- 6. Short FAQ ---- */
export function FaqShort({ dict, locale, items }) {
  return (
    <section className="section row-section">
      <div className="wrap">
        <div className="section-head">
          <Reveal><h2 style={{ marginBottom: 0 }}>{dict.faqShort.title}</h2></Reveal>
          <Link href={`/${locale}/faq`} className="btn btn-ghost btn-sm">
            {dict.faqShort.more} <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
        <Reveal stagger className="faq-list">
          {items.map((item, i) => (
            <details className="faq-item" key={i}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
