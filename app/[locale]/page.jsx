import Link from 'next/link';
import { ArrowRight, FileUp, Gift, Printer, ShieldCheck, Truck } from 'lucide-react';
import Reveal from '@/components/Reveal';
import HomeHero from '@/components/HomeHero';
import CategoryCircles from '@/components/CategoryCircles';
import TabbedFavourites from '@/components/TabbedFavourites';
import ProductMarquee from '@/components/ProductMarquee';
import PhotoFrame from '@/components/PhotoFrame';

import { getDict } from '@/lib/dictionaries';
import { getProducts, getCollections, getCollectionWithProducts } from '@/lib/products';
import { poolUrl } from '@/lib/product-images';
import { FAQ } from '@/content/policies';
import { IMAGES } from '@/lib/images';

/* PLACEHOLDER REVIEWS — not real yet. Replace with genuine customer reviews
   (name · city · product · quote) before launch; "Verified" must only ever
   appear on real, verifiable purchases. */
const REVIEWS = {
  en: [
    { q: 'The colors are even better in real life. My desk finally feels like mine.', name: 'Noor', city: 'Abu Dhabi', product: 'The Everyday Notebook' },
    { q: 'Ordered as a gift, kept it for myself. Ordering again. Sorry, Sara.', name: 'Maha', city: 'Al Ain', product: 'First Ink Gift Box' },
    { q: 'Thick paper, zero ghosting, and the wrapping made me gasp.', name: 'Lina', city: 'Abu Dhabi', product: 'Daily Ritual Planner' },
  ],
  ar: [
    { q: 'الألوان أجمل على الحقيقة. مكتبي أخيرًا صار يشبهني.', name: 'نور', city: 'أبوظبي', product: 'دفتر اليوميات' },
    { q: 'طلبته كهدية واحتفظت به لنفسي. سأطلب مرة أخرى. آسفة يا سارة.', name: 'مها', city: 'العين', product: 'علبة هدايا الحبر الأول' },
    { q: 'ورق سميك، ولا يظهر الحبر من الخلف، والتغليف أدهشني.', name: 'لينا', city: 'أبوظبي', product: 'مخطط الروتين اليومي' },
  ],
};

const PEOPLE_POOLS = ['notebooks-books', 'art-craft', 'desk-tools'];
const LOOKBOOK_POOLS = ['notebooks-books', 'pens-pencils', 'art-craft', 'gift-sets-bundles', 'desk-tools', 'stickers-sticky-notes', 'planners-diaries'];

export default async function Home({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const [products, collections] = await Promise.all([getProducts(locale), getCollections(locale)]);

  const byNewest = [...products].filter((p) => p.available).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const bestsellers = products.filter((p) => p.tags?.includes('bestseller')).slice(0, 8);
  const newest = byNewest.slice(0, 8);
  let bundles = products.filter((p) => p.tags?.includes('bundle'));
  if (bundles.length === 0 && collections.some((c) => c.handle === 'gift-sets')) {
    const gs = await getCollectionWithProducts('gift-sets', locale);
    bundles = (gs?.products || []).slice(0, 8);
  }

  const TAB_MATCH = [
    { rx: /notebook/i, key: 'fresh' },
    { rx: /gift/i, key: 'gifts' },
  ];
  const tabCols = [
    { key: 'best', title: dict.home.bestTitle, products: bestsellers },
    { key: 'new', title: dict.home.newTitle, products: newest },
    ...(bundles.length ? [{ key: 'gifts', title: dict.home.bundlesTitle, products: bundles }] : []),
  ].filter((t) => t.products.length >= 3);

  const vendorCount = new Map();
  products.forEach((p) => { if (p.vendor && p.vendor !== 'Tiny Inks') vendorCount.set(p.vendor, (vendorCount.get(p.vendor) || 0) + 1); });
  const brands = [...vendorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n]) => n);

  const reviews = REVIEWS[locale];
  const faqAll = FAQ[locale].items;
  const faqShort = [faqAll[0], faqAll[1], faqAll[4], faqAll[2]].filter(Boolean);

  const usps = [
    { Icon: Truck, ...dict.home.why[2] },
    { Icon: ShieldCheck, ...dict.home.why[0] },
    { Icon: Gift, ...dict.home.why[1] },
    { Icon: Printer, ...dict.home.why[3] },
  ];

  return (
    <>
      {/* Hero slider */}
      <HomeHero dict={dict} locale={locale} />

      {/* Category circles */}
      <section className="mx-auto max-w-[1240px] px-4 py-12 sm:px-8 sm:py-16">
        <Reveal className="text-center"><h2 className="display-md">{dict.home.categoriesTitle}</h2></Reveal>
        <CategoryCircles collections={collections} locale={locale} />
      </section>

      {/* Tabbed favourites */}
      {tabCols.length > 0 && <TabbedFavourites tabs={tabCols} locale={locale} dict={dict} />}

      {/* Two promo banners */}
      <section className="mx-auto grid max-w-[1240px] gap-5 px-4 py-14 sm:grid-cols-2 sm:px-8 sm:py-20">
        {dict.promos.map((promo, i) => (
          <Reveal key={i} delay={i * 0.09}>
            <div className={`flex h-full flex-col justify-between overflow-hidden rounded-3xl ${i === 0 ? 'bg-sun' : 'bg-cyan'}`}>
              <div className="p-7 sm:p-9">
                <h3 className="display-md text-ink">{promo.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/75">{promo.line}</p>
                <Link href={`/${locale}/${i === 0 ? 'shop' : 'bundles'}`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-card px-6 py-3 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] transition-transform hover:scale-[1.04]">
                  {promo.cta} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </div>
              <img src={poolUrl(i === 0 ? 'desk-tools' : 'gift-sets-bundles', 2)} alt="" loading="lazy" className="h-48 w-full object-cover sm:h-56" />
            </div>
          </Reveal>
        ))}
      </section>

      {/* Print feature band */}
      <section className="bg-ink py-14 text-white sm:py-20">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 sm:px-8 lg:grid-cols-2">
          <Reveal variant="scale">
            <img src={poolUrl('desk-tools', 1)} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover" />
          </Reveal>
          <Reveal>
            <span className="eyebrow-new text-sun">{dict.home2.printBand.eyebrow}</span>
            <h2 className="display-lg mt-3">{dict.home2.printBand.heading}</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">{dict.home2.printBand.desc}</p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {dict.home2.printBand.features.map((f) => (
                <li key={f} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">
                  <span className="h-2 w-2 rounded-full bg-coral" /> {f}
                </li>
              ))}
            </ul>
            <Link href={`/${locale}/print`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-card px-8 py-4 text-[0.75rem] font-extrabold uppercase tracking-[0.12em] text-ink transition-transform hover:scale-[1.03]">
              {dict.home2.printBand.cta} <FileUp className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* USP row */}
      <section className="pencil-grid mx-auto max-w-[1240px] px-4 py-14 sm:px-8 sm:py-20">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {usps.map(({ Icon, t, d }, i) => (
            <Reveal key={t} delay={i * 0.07}>
              <div className="flex h-full flex-col items-center gap-2 rounded-3xl border border-border p-6 text-center">
                <Icon className="h-7 w-7 text-coral" strokeWidth={1.6} />
                <h3 className="font-display text-base">{t}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Shop by who it's for */}
      <section className="bg-secondary py-14 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <Reveal className="text-center">
            <span className="eyebrow-new text-muted-foreground">{dict.home2.people.eyebrow}</span>
            <h2 className="display-lg mt-2">{dict.home2.people.heading}</h2>
          </Reveal>
          <div className="mt-9 grid gap-5 sm:grid-cols-3">
            {dict.home2.people.cards.map((c, i) => (
              <Reveal key={c.t} delay={i * 0.08}>
                <Link href={`/${locale}/shop`} className={`group flex h-full flex-col overflow-hidden rounded-3xl ${['bg-sun', 'bg-blush', 'bg-cyan'][i % 3]}`}>
                  <img src={poolUrl(PEOPLE_POOLS[i % PEOPLE_POOLS.length], 3)} alt={c.t} loading="lazy" className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="p-6">
                    <h3 className="font-display text-xl text-ink">{c.t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink/75">{c.d}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-ink">
                      {dict.home2.people.shopnow} <ArrowRight className="h-4 w-4 rtl:rotate-180 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Brand marquee */}
      {brands.length > 0 && (
        <section className="border-y border-border bg-card py-8">
          <p className="text-center label-xs text-muted-foreground">{dict.brandsRow.title}</p>
          <div className="mt-5 overflow-hidden">
            <div className="marquee-new flex w-max items-center">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex shrink-0 items-center">
                  {brands.map((b) => (
                    <Link key={`${dup}-${b}`} href={`/${locale}/shop?brand=${encodeURIComponent(b)}`} className="whitespace-nowrap px-8 font-display text-2xl text-ink/35 hover:text-ink/70 sm:text-3xl">
                      {b}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How printing works */}
      <section className="mx-auto max-w-[1240px] px-4 py-14 sm:px-8 sm:py-20">
        <Reveal className="text-center">
          <span className="eyebrow-new text-muted-foreground">{dict.home2.steps.eyebrow}</span>
          <h2 className="display-lg mt-2">{dict.home2.steps.heading}</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {dict.home2.steps.items.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.09}>
              <div className="flex h-full flex-col rounded-3xl border border-border p-7">
                <span className="font-display text-4xl text-coral">0{i + 1}</span>
                <h3 className="mt-3 font-display text-lg">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-9 text-center">
          <Link href={`/${locale}/print`} className="inline-flex items-center gap-2 rounded-full bg-coral px-8 py-4 text-[0.75rem] font-extrabold uppercase tracking-[0.12em] text-white transition-transform hover:scale-[1.03]">
            {dict.home2.steps.cta} <FileUp className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Product photo marquee */}
      <ProductMarquee products={products} locale={locale} label={dict.marqueeRow.label} />

      {/* Testimonials */}
      <section className="paper-fibre bg-sky py-14 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <Reveal className="text-center"><h2 className="display-lg text-ink">{dict.home.reviewsTitle}</h2></Reveal>
          <div className="mt-9 grid gap-5 sm:grid-cols-3">
            {reviews.map((r, i) => (
              <Reveal key={r.name} delay={i * 0.08}>
                <figure className="flex h-full flex-col rounded-3xl bg-card p-7">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1 text-coral" aria-hidden="true">★★★★★</div>
                    <span className="rounded-full bg-sage px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.06em] text-ink">✓ {dict.reviewsUi.verified}</span>
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/85">“{r.q}”</blockquote>
                  <figcaption className="mt-5">
                    <span className="font-display text-base">{r.name} · {r.city}</span>
                    <span className="block text-xs text-muted-foreground">{dict.reviewsUi.bought}: {r.product}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Lookbook grid */}
      <section className="mx-auto max-w-[1240px] px-4 py-14 sm:px-8 sm:py-20">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow-new text-muted-foreground">{dict.home2.lookbook.eyebrow}</span>
            <h2 className="display-md mt-2">{dict.home2.lookbook.heading}</h2>
          </div>
          <Link href={`/${locale}/about`} className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-coral">{dict.home2.lookbook.seeshop}</Link>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 [grid-auto-rows:132px] sm:grid-cols-4 sm:gap-4 sm:[grid-auto-rows:150px]">
          {LOOKBOOK_POOLS.map((pool, i) => (
            <div key={pool} className={`group overflow-hidden rounded-2xl bg-secondary ${[
              'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2',
              'col-span-1 row-span-1',
              'col-span-1 row-span-1 sm:row-span-2',
              'col-span-2 row-span-2 sm:col-span-1 sm:row-span-1',
              'col-span-1 row-span-1',
              'col-span-1 row-span-1 sm:col-span-2 sm:row-span-2',
              'col-span-2 row-span-2 sm:col-span-1 sm:row-span-1',
            ][i]}`}>
              <img src={poolUrl(pool, (i % 4) + 1)} alt={dict.home2.lookbook.alts[i] || ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[860px] px-4 pb-14 sm:px-8 sm:pb-20">
        <Reveal className="text-center"><h2 className="display-md">{dict.faqShort.title}</h2></Reveal>
        <div className="mt-8 divide-y divide-border rounded-3xl border border-border">
          {faqShort.map((f, i) => (
            <details key={f.q} className="group px-6 py-5" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base">
                {f.q}
                <span className="shrink-0 text-lg transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href={`/${locale}/faq`} className="text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-coral underline underline-offset-4">{dict.faqShort.more}</Link>
        </div>
      </section>

      {/* Story strip */}
      <section className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-8 sm:pb-24">
        <Reveal>
          <div className="paper-fibre grid items-center gap-8 overflow-hidden rounded-3xl bg-sky lg:grid-cols-2">
            <img src={poolUrl('gift-sets-bundles', 1)} alt="" loading="lazy" className="h-64 w-full object-cover lg:h-full" />
            <div className="p-7 sm:p-12">
              <span className="eyebrow-new text-ink/70">{dict.about.eyebrow}</span>
              <h2 className="display-md mt-3 text-ink">{dict.about.title}</h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/75">{dict.about.intro}</p>
              <Link href={`/${locale}/about`} className="mt-6 inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink px-6 py-3 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-white">
                {dict.about.ctaShop} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Newsletter lives in the footer only — it used to appear here too,
          with the identical heading, copy and form, roughly one screen above
          the footer band that repeats it on every page. */}

      {/* Instagram strip */}
      <section className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-8 sm:pb-24">
        <div className="flex items-center justify-between gap-4">
          <Reveal><h2 className="display-md">{dict.home.igTitle}</h2></Reveal>
          <a href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#'} target="_blank" rel="noreferrer" className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-coral">{dict.home.igHandle}</a>
        </div>
        <Reveal className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2">
          {IMAGES.polaroids.map((photo, i) => (
            <div key={i} className="snap-start shrink-0">
              <PhotoFrame photo={photo} locale={locale} variant="polaroid" caption={dict.home.polaroids[i]} />
            </div>
          ))}
        </Reveal>
      </section>
    </>
  );
}
