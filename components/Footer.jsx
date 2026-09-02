import Link from 'next/link';
import { getBusiness } from '@/lib/site';
import { NewsletterForm } from './Forms';

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

      {/* newsletter + socials — full width */}
      <div className="wrap footer-news">
        <div>
          <h3>{dict.home.newsTitle}</h3>
          <NewsletterForm dict={dict} locale={locale} />
        </div>
        <div className="footer-socials" aria-label={dict.footer.follow}>
          {b.instagram && (
            <a href={b.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" /></svg>
            </a>
          )}
          {b.tiktok && (
            <a href={b.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.3 2.4 1.8 4 4.5 4.2v3.2c-1.7 0-3.2-.5-4.5-1.4v6.3A6.3 6.3 0 1 1 10.2 9v3.3a3 3 0 1 0 3 3V3h3.3z" /></svg>
            </a>
          )}
          <a href={b.whatsappHref} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="social-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.9-1.3A9.5 9.5 0 1 0 12 2.5zm0 17.3a7.8 7.8 0 0 1-4-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.8 7.8 0 1 1 12 19.8zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.4 6.4 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.1 1.6 2.5 3.9 3.5 1.5.6 2 .6 2.7.5.4-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1l-.3-.1z" /></svg>
          </a>
        </div>
      </div>

      {/* payment badges — full width */}
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
