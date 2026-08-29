import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ContactForm } from '@/components/Forms';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.nav.contact, description: dict.contact.lede };
}

const ICONS = {
  instagram: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 2.4 1.8 4 4.5 4.2v3.2c-1.7 0-3.2-.5-4.5-1.4v6.3A6.3 6.3 0 1 1 10.2 9v3.3a3 3 0 1 0 3 3V3h3.3z" />
    </svg>
  ),
  whatsapp: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.9-1.3A9.5 9.5 0 1 0 12 2.5zm0 17.3a7.8 7.8 0 0 1-4-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.8 7.8 0 1 1 12 19.8zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.4 6.4 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.1 1.6 2.5 3.9 3.5 1.5.6 2 .6 2.7.5.4-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1l-.3-.1z" />
    </svg>
  ),
};

export default function ContactPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.contact;
  const b = getBusiness();
  const hours = process.env.NEXT_PUBLIC_SHOP_HOURS || t.hoursText;
  const socials = [
    b.instagram && { key: 'instagram', href: b.instagram, label: 'Instagram' },
    b.tiktok && { key: 'tiktok', href: b.tiktok, label: 'TikTok' },
    { key: 'whatsapp', href: b.whatsappHref, label: 'WhatsApp' },
  ].filter(Boolean);

  return (
    <>
      <section className="section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)', paddingBottom: 'clamp(40px, 6vw, 80px)' }}>
        <div className="wrap" style={{ marginBottom: 18 }}>
          <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.contact }]} />
        </div>
        <div className="wrap split">
          <Reveal>
            <div className="eyebrow">{t.eyebrow}</div>
            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>{t.title}</h1>
            <p className="lede" style={{ marginBottom: 26 }}>{t.lede}</p>

            <a className="btn btn-primary" href={`${b.whatsappHref}?text=${encodeURIComponent(t.waMsg)}`} target="_blank" rel="noreferrer">
              {ICONS.whatsapp} {t.whatsapp}
            </a>

            <div className="socials" aria-label={t.follow}>
              {socials.map((s) => (
                <a key={s.key} className="social-btn" href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} title={s.label}>
                  {ICONS[s.key]}
                </a>
              ))}
            </div>

            <div className="contact-facts">
              <div>
                <strong>{t.visit}</strong>
                <span>{b.address || t.addressFallback}</span>
                <a href={b.mapsHref} target="_blank" rel="noreferrer" className="pdp-link">{t.map}</a>
              </div>
              <div>
                <strong>{t.hours}</strong>
                <span>{hours}</span>
              </div>
              <div>
                <strong>{t.emailLabel}</strong>
                <a href={`mailto:${b.email}`} className="pdp-link" dir="ltr">{b.email}</a>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="block form-card">
              <h3 style={{ marginBottom: 6 }}>{t.formTitle}</h3>
              <p className="field-note" style={{ marginBottom: 18 }}>{t.formLede}</p>
              <ContactForm dict={dict} locale={locale} />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
