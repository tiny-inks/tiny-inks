import Link from 'next/link';
import { getBusiness } from '@/lib/site';

/* Compact footer: contact strip (full width) → 2-column link grid on phones
   (5 columns on desktop) → payment row (full width) → legal line. */
export default function Footer({ dict, locale, collections = [] }) {
  const b = getBusiness();
  const suggestHref = `${b.whatsappHref}?text=${encodeURIComponent(dict.footerUi.suggestMsg)}`;

  const cols = [
    {
      title: dict.footerUi.company,
      links: [
        { href: `/${locale}/about`, label: dict.nav.about },
        { href: `/${locale}/contact`, label: dict.nav.contact },
        { href: `/${locale}/print`, label: dict.nav.print },
        { href: `${b.whatsappHref}?text=${encodeURIComponent(dict.footerUi.bulkMsg)}`, label: dict.nav.bulk, ext: true },
      ],
    },
    {
      title: dict.footer.shop,
      links: [
        { href: `/${locale}/shop`, label: dict.nav.allProducts },
        ...collections.slice(0, 3).map((c) => ({ href: `/${locale}/shop/${c.handle}`, label: c.title })),
        { href: `/${locale}/bundles`, label: dict.nav.drops },
      ],
    },
    {
      title: dict.footer.help,
      links: [
        { href: `/${locale}/faq`, label: dict.policies.faq },
        { href: `/${locale}/policies/shipping`, label: dict.policies.shipping },
        { href: `/${locale}/policies/returns`, label: dict.policies.returns },
        { href: `/${locale}/wishlist`, label: dict.nav.wishlist },
      ],
    },
    {
      title: dict.policies.title,
      links: [
        { href: `/${locale}/policies/privacy`, label: dict.policies.privacy },
        { href: `/${locale}/policies/terms`, label: dict.policies.terms },
        ...(b.instagram ? [{ href: b.instagram, label: 'Instagram', ext: true }] : []),
        ...(b.tiktok ? [{ href: b.tiktok, label: 'TikTok', ext: true }] : []),
      ],
    },
  ];

  return (
    <footer className="footer">
      {/* prominent contact + suggest strip — full width */}
      <div className="wrap footer-contact">
        <div className="footer-contact-line">
          <strong>{dict.footerUi.contactTitle}:</strong>
          <a href={`mailto:${b.email}`} dir="ltr">{b.email}</a>
          <span aria-hidden="true">·</span>
          <a href={b.whatsappHref} target="_blank" rel="noreferrer" dir="ltr">WhatsApp +{b.whatsapp}</a>
        </div>
        <a className="btn btn-primary btn-sm" href={suggestHref} target="_blank" rel="noreferrer">
          {dict.footerUi.suggest}
        </a>
      </div>

      <div className="wrap footer-grid">
        <div className="footer-brand">
          <img src="/logo-icon.png" alt="Tiny Inks" />
          <p>{dict.footer.blurb}</p>
          <p className="footer-arabic">{dict.footer.arabicName}</p>
        </div>
        {cols.map((col) => (
          <nav key={col.title} className="footer-col" aria-label={col.title}>
            <h3>{col.title}</h3>
            {col.links.map((l) =>
              l.ext ? (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
              ) : (
                <Link key={l.label} href={l.href}>{l.label}</Link>
              )
            )}
          </nav>
        ))}
      </div>

      {/* payment row — full width */}
      <div className="wrap footer-pay">
        <span>{dict.payment.accept}</span>
        <div className="payment-row">
          {dict.payment.methods.map((m) => (
            <span className="payment-pill" key={m}>{m}</span>
          ))}
        </div>
      </div>

      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} Tiny Inks · Abu Dhabi</span>
        <span>{dict.footer.rights}</span>
      </div>
    </footer>
  );
}
