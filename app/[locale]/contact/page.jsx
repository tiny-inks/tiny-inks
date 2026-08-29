import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ContactForm } from '@/components/Forms';
import { getDict } from '@/lib/dictionaries';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.nav.contact, description: dict.contact.lede };
}

export default function ContactPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.contact;
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '971500000000';
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@tinyinks.ae';
  const ig = process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#';

  return (
    <section className="section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)' }}>
      <div className="wrap" style={{ marginBottom: 18 }}>
        <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.contact }]} />
      </div>
      <div className="wrap split">
        <Reveal>
          <div className="eyebrow">{t.eyebrow}</div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>{t.title}</h1>
          <p className="lede" style={{ marginBottom: 30 }}>{t.lede}</p>
          <div style={{ display: 'grid', gap: 14, maxWidth: 380 }}>
            <a className="btn btn-primary" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">{t.whatsapp}</a>
            <a className="btn" href={`mailto:${email}`}>{t.email}</a>
            <a className="btn btn-ghost" href={ig} target="_blank" rel="noreferrer">{t.ig}</a>
          </div>
          <div className="pdp-meta" style={{ marginTop: 34, maxWidth: 380 }}>
            <div><strong>{t.hours}:</strong> {t.hoursText}</div>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="block" style={{ background: '#fff', border: '1px solid var(--line)' }}>
            <h3 style={{ marginBottom: 22 }}>{t.formTitle}</h3>
            <ContactForm dict={dict} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
