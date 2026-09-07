import Link from 'next/link';
import { Instagram, Mail, MapPin, Phone, Send } from 'lucide-react';
import { getBusiness } from '@/lib/site';
import { NewsletterForm } from './Forms';

/* Lovable-style footer: newsletter band, brand + link columns, bottom bar
   with address/payment marks. */
export default function Footer({ dict, locale, collections = [] }) {
  const b = getBusiness();

  const columns = [
    {
      title: dict.footer.shop,
      links: [
        { label: dict.nav.allProducts, href: `/${locale}/shop` },
        ...collections.slice(0, 3).map((c) => ({ label: c.title, href: `/${locale}/shop/${c.handle}` })),
        { label: dict.nav.drops, href: `/${locale}/bundles` },
      ],
    },
    {
      title: dict.footerUi.company,
      links: [
        { label: dict.nav.print, href: `/${locale}/print` },
        { label: dict.nav.bulk, href: `${b.whatsappHref}?text=${encodeURIComponent(dict.footerUi.bulkMsg)}`, ext: true },
        { label: dict.policies.shipping, href: `/${locale}/policies/shipping` },
      ],
    },
    {
      title: dict.policies.title,
      links: [
        { label: dict.nav.about, href: `/${locale}/about` },
        { label: dict.nav.contact, href: `/${locale}/contact` },
        { label: dict.policies.privacy, href: `/${locale}/policies/privacy` },
        { label: dict.policies.terms, href: `/${locale}/policies/terms` },
      ],
    },
  ];

  const socials = [
    ...(b.instagram ? [{ Icon: Instagram, label: 'Instagram', href: b.instagram }] : []),
    { Icon: Send, label: 'WhatsApp', href: b.whatsappHref },
  ];

  return (
    <footer className="relative overflow-hidden bg-ink text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-coral/15 blur-3xl" />

      <div className="relative">
        <div className="border-b border-white/15">
          <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-6 px-4 py-10 text-center sm:px-8 lg:flex-row lg:justify-between lg:text-left">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl">{dict.home.newsTitle}</h2>
              <p className="mt-2 text-sm text-white/70">{dict.home.newsLede}</p>
            </div>
            <NewsletterForm dict={dict} locale={locale} dark />
          </div>
        </div>

        <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr]">
            <div>
              <img src="/logo-icon.png" alt="Tiny Inks" width={64} height={64} className="h-14 w-14 object-contain" loading="lazy" />
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">{dict.footer.blurb}</p>
              <p className="mt-1 text-sm text-white/50">{dict.footer.arabicName}</p>
              <div className="mt-5 flex gap-3">
                {socials.map(({ Icon, label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-white/25 transition-colors hover:border-coral hover:text-coral">
                    <Icon className="h-4 w-4" strokeWidth={1.6} />
                  </a>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {columns.map((col) => (
                <div key={col.title}>
                  <h3 className="eyebrow-new">{col.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        {l.ext ? (
                          <a href={l.href} target="_blank" rel="noreferrer" className="text-sm text-white/70 transition-colors hover:text-white">{l.label}</a>
                        ) : (
                          <Link href={l.href} className="text-sm text-white/70 transition-colors hover:text-white">{l.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-10 grid gap-6 border-t border-white/15 pt-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/60">
              <span>© {new Date().getFullYear()} Tiny Inks · {dict.footer.arabicName}</span>
              {b.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {b.address}</span>}
              <a href={`mailto:${b.email}`} dir="ltr" className="inline-flex items-center gap-1.5 hover:text-white"><Mail className="h-3.5 w-3.5" /> {b.email}</a>
            </div>
            <div className="flex flex-wrap items-center gap-2" aria-label={dict.payment.accept}>
              {dict.payment.methods.map((m) => (
                <span key={m} className="flex h-8 items-center justify-center rounded-[6px] bg-white px-2.5 text-[0.62rem] font-extrabold uppercase tracking-wide text-ink shadow-[0_1px_2px_rgba(0,0,0,0.15)]">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
