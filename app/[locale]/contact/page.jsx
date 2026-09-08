import { ArrowRight, Clock, Instagram, Mail, MapPin, Send } from 'lucide-react';
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
  /* WhatsApp deliberately NOT in here — it already has a full CTA below, and
     having both meant two competing buttons for the identical action. */
  const socials = [
    b.instagram && { Icon: Instagram, href: b.instagram, label: 'Instagram' },
    b.tiktok && { Icon: Send, href: b.tiktok, label: 'TikTok' },
  ].filter(Boolean);

  const details = [
    { Icon: MapPin, t: t.visit, lines: [b.address || t.addressFallback], tint: 'bg-sun' },
    { Icon: Clock, t: t.hours, lines: [hours], tint: 'bg-sky' },
    { Icon: Mail, t: t.emailLabel, lines: [b.email], href: `mailto:${b.email}`, tint: 'bg-blush' },
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

      {/* One panel, three divided columns — previously three separate floating
          cards that read as unrelated. Lifted into the sky band so the hero
          and the details are visibly one composition. */}
      <section className="mx-auto -mt-8 max-w-[1240px] px-5 pb-14 sm:-mt-12 sm:px-8 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_50px_-32px_rgba(19,49,85,0.45)]">
          <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
            {details.map((d) => (
              <div key={d.t} className="flex flex-col p-6 sm:p-7">
                <div className={`grid h-11 w-11 place-items-center rounded-2xl ${d.tint} text-ink`}>
                  <d.Icon className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <h2 className="eyebrow-new mt-5">{d.t}</h2>
                {d.lines.map((line) => d.href ? (
                  <a key={line} href={d.href} dir="ltr" className="mt-2 block text-sm font-medium leading-relaxed text-foreground/85 hover:text-coral rtl:text-end">{line}</a>
                ) : (
                  <p key={line} className="mt-2 text-sm font-medium leading-relaxed text-foreground/85">{line}</p>
                ))}
                {d.t === t.visit && (
                  <a href={b.mapsHref} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-coral">
                    {t.map} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map — real Google Maps listing for the Abu Dhabi shop */}
      <section className="mx-auto max-w-[1240px] px-5 pb-14 sm:px-8 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-secondary shadow-sm">
          <iframe
            title="Tiny Inks location in Abu Dhabi"
            src={b.mapEmbedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[380px] w-full sm:h-[460px]"
          />
          <div className="absolute inset-x-3 bottom-3 max-w-sm rounded-2xl bg-card/95 p-5 shadow-xl backdrop-blur-sm sm:bottom-6 sm:start-6 sm:end-auto">
            <span className="eyebrow-new">{t.mapFindUs}</span>
            <p className="mt-2 font-display text-xl leading-tight">{dict.brand}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b.address || t.addressFallback}</p>
            <a href={b.mapsHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-coral">
              {t.mapOpenGoogle} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
          <div>
            <span className="eyebrow-new">{t.eyebrow}</span>
            <h2 className="display-lg mt-4 max-w-[14ch] text-ink">{t.formTitle}</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{t.formLede}</p>
            {/* the one WhatsApp action on this page */}
            <a href={`${b.whatsappHref}?text=${encodeURIComponent(t.waMsg)}`} target="_blank" rel="noreferrer" className="ui-btn ui-btn-primary ui-btn-lg mt-7">
              <Send className="h-4 w-4" /> {t.whatsapp}
            </a>
            <p className="mt-3 text-xs text-muted-foreground">{t.waNote}</p>
            {socials.length > 0 && (
              <div className="mt-8 border-t border-border pt-6">
                <span className="label-xs">{t.followUs}</span>
                <div className="mt-3 flex flex-wrap gap-3">
                  {socials.map(({ Icon, label, href }) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className="ui-icon-btn border border-border bg-card transition-colors hover:border-coral hover:bg-card hover:text-coral">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <ContactForm dict={dict} locale={locale} />
        </div>
      </section>
    </>
  );
}
