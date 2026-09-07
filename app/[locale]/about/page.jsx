import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getDict } from '@/lib/dictionaries';
import { getProducts, getCollections } from '@/lib/products';
import { getBusiness } from '@/lib/site';
import { collectionTileImage } from '@/components/CollectionGrid';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.nav.about, description: dict.about.intro };
}

const WHY_ICONS = ['✦', '◆', '⚡', '❀', '▣', '☎'];
const WALL = ['desk-tools-4', 'gift-sets-bundles-1', 'pens-pencils-4', 'notebooks-books-2', 'stickers-sticky-notes-1'];
const WALL_SPAN = ['col-span-2 row-span-2 sm:col-span-1', 'col-span-1', 'col-span-1', 'col-span-2', 'col-span-1'];

export default async function AboutPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.about;
  const b = getBusiness();
  const [products, collections] = await Promise.all([getProducts(locale), getCollections(locale)]);

  const vendorCount = new Map();
  products.forEach((p) => { if (p.vendor) vendorCount.set(p.vendor, (vendorCount.get(p.vendor) || 0) + 1); });
  const brands = [...vendorCount.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 16);

  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-blush pb-12 pt-8 sm:pt-12">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.about }]} />
          <span className="eyebrow-new mt-4 text-ink/70">{t.eyebrow}</span>
          <h1 className="display-xl mt-3 max-w-[16ch] text-ink">{t.title}</h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink/75 sm:text-base">{t.intro}</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/75 sm:text-base">{t.intro2}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/${locale}/shop`} className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral">
              {t.ctaShop} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <Link href={`/${locale}/contact`} className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] transition-colors hover:bg-sun">
              {t.ctaContact}
            </Link>
          </div>
        </div>
      </section>

      {/* Shop card */}
      <section className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="rounded-3xl border border-border bg-card p-7 sm:p-10">
          <img src="/logo-icon.png" alt="" width={56} height={56} className="h-14 w-14 object-contain" />
          <h3 className="mt-4 font-display text-xl">{t.shopTitle}</h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{t.shopText}</p>
          <p className="mt-4 text-sm">
            <strong>{dict.contact.visit}:</strong> {b.address || dict.contact.addressFallback}<br />
            <strong>{dict.contact.hours}:</strong> {process.env.NEXT_PUBLIC_SHOP_HOURS || dict.contact.hoursText}
          </p>
          <a href={b.mapsHref} target="_blank" rel="noreferrer" className="mt-4 inline-block text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-coral underline underline-offset-4">{dict.contact.map}</a>
        </div>
      </section>

      {/* What we sell */}
      <section className="bg-cyan py-14 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow-new text-ink/70">{t.sellEyebrow}</span>
              <h2 className="display-md mt-2 text-ink">{t.sellTitle}</h2>
            </div>
            <Link href={`/${locale}/shop`} className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-ink underline underline-offset-4">{dict.home.viewAll}</Link>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/75">{t.sellText}</p>
          <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
            {collections.map((c) => {
              const img = collectionTileImage(c);
              return (
                <Link key={c.handle} href={`/${locale}/shop/${c.handle}`} className="group flex flex-col items-center gap-2 text-center">
                  <span className="aspect-square w-full overflow-hidden rounded-2xl bg-card/60">
                    {img ? <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="grid h-full place-items-center text-xl">✦</span>}
                  </span>
                  <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.06em] text-ink">{c.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why buy from us */}
      <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
        <span className="eyebrow-new text-muted-foreground">{t.whyEyebrow}</span>
        <h2 className="display-md mt-2">{t.whyTitle}</h2>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.why.map((w, i) => (
            <div key={i} className="rounded-3xl border border-border bg-card p-6">
              <span className="text-2xl" aria-hidden="true">{WHY_ICONS[i % WHY_ICONS.length]}</span>
              <h3 className="mt-3 font-display text-lg">{w.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brands */}
      {brands.length > 0 && (
        <section className="bg-secondary py-14 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <span className="eyebrow-new text-muted-foreground">{t.brandsEyebrow}</span>
            <h2 className="display-md mt-2">{t.brandsTitle}</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{t.brandsText}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {brands.map((name) => (
                <Link key={name} href={`/${locale}/shop?brand=${encodeURIComponent(name)}`} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-bold transition-colors hover:border-ink">{name}</Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Photos */}
      <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
        <span className="eyebrow-new text-muted-foreground">{t.photosEyebrow}</span>
        <h2 className="display-md mt-2">{t.photosTitle}</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 [grid-auto-rows:140px] sm:grid-cols-4 sm:gap-4">
          {WALL.map((pool, i) => (
            <figure key={pool} className={`overflow-hidden rounded-2xl bg-secondary ${WALL_SPAN[i]}`}>
              <img src={`/products/${pool}.webp`} alt={t.photoAlts[i] || ''} loading="lazy" className="h-full w-full object-cover" />
            </figure>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t.photosNote}</p>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-[1240px] px-5 pb-16 text-center sm:px-8 sm:pb-24">
        <div className="rounded-3xl bg-cream p-10 sm:p-14">
          <h2 className="display-lg mx-auto max-w-[18ch]">{t.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{t.ctaLede}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/${locale}/shop`} className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral">{t.ctaShop} <ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
            <Link href={`/${locale}/contact`} className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] transition-colors hover:bg-sun">{t.ctaContact}</Link>
            <a href={`${b.whatsappHref}?text=${encodeURIComponent(dict.footerUi.bulkMsg)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-transparent px-8 py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] underline underline-offset-4">{dict.nav.bulk}</a>
          </div>
        </div>
      </section>
    </>
  );
}
