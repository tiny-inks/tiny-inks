import { Clock, Instagram, Mail, MapPin, Send } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ContactForm } from '@/components/Forms';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.nav.contact, description: dict.contact.lede };
}

export default function ContactPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.contact;
  const b = getBusiness();
  const hours = process.env.NEXT_PUBLIC_SHOP_HOURS || t.hoursText;
  const socials = [
    b.instagram && { Icon: Instagram, href: b.instagram, label: 'Instagram' },
    { Icon: Send, href: b.whatsappHref, label: 'WhatsApp' },
  ].filter(Boolean);

  const details = [
    { Icon: MapPin, t: t.visit, lines: [b.address || t.addressFallback] },
    { Icon: Clock, t: t.hours, lines: [hours] },
    { Icon: Mail, t: t.emailLabel, lines: [b.email], href: `mailto:${b.email}` },
  ];

  return (
    <>
      <section className="overflow-hidden bg-sky pb-12 pt-8 sm:pb-16 sm:pt-12">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.contact }]} />
          <span className="eyebrow-new mt-4 text-ink/70">{t.eyebrow}</span>
          <h1 className="display-xl mt-3 max-w-[14ch] text-ink">{t.title}</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/75 sm:text-base">{t.lede}</p>
        </div>
      </section>

      <section className="mx-auto -mt-1 max-w-[1240px] px-5 pb-14 sm:px-8 sm:pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {details.map((d) => (
            <div key={d.t} className="rounded-3xl border border-border bg-card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-sun text-ink"><d.Icon className="h-5 w-5" strokeWidth={1.6} /></div>
              <h2 className="mt-5 eyebrow-new">{d.t}</h2>
              {d.lines.map((line) => d.href ? (
                <a key={line} href={d.href} dir="ltr" className="mt-1.5 block text-sm font-medium text-foreground/85 hover:text-coral">{line}</a>
              ) : (
                <p key={line} className="mt-1.5 text-sm font-medium text-foreground/85">{line}</p>
              ))}
              {d.t === t.visit && (
                <a href={b.mapsHref} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-coral">{t.map}</a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
          <div>
            <span className="eyebrow-new">{t.eyebrow}</span>
            <h2 className="display-lg mt-4 max-w-[14ch] text-ink">{t.formTitle}</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{t.formLede}</p>
            <a href={`${b.whatsappHref}?text=${encodeURIComponent(t.waMsg)}`} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral">
              <Send className="h-4 w-4" /> {t.whatsapp}
            </a>
            <div className="mt-8 flex flex-wrap gap-3">
              {socials.map(({ Icon, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className="grid h-12 w-12 place-items-center rounded-full border-2 border-border bg-card shadow-sm transition-[transform,background-color,border-color,color] duration-300 hover:-translate-y-1 hover:border-coral hover:bg-coral hover:text-white">
                  <Icon className="h-4 w-4" strokeWidth={1.4} />
                </a>
              ))}
            </div>
          </div>
          <ContactForm dict={dict} locale={locale} />
        </div>
      </section>
    </>
  );
}
