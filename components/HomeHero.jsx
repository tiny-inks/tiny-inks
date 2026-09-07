'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { poolUrl } from '@/lib/product-images';

const SLIDE_META = [
  { bg: 'bg-sky', href: '/shop', pool: 'notebooks-books' },
  { bg: 'bg-sage', href: '/print', pool: 'desk-tools' },
  { bg: 'bg-blush', href: '/bundles', pool: 'gift-sets-bundles' },
];

/* Lovable-style hero slider: full-bleed rounded panel, photo + copy split,
   auto-advance every 6s, arrows + dots. Reduced motion stops the timer. */
export default function HomeHero({ dict, locale }) {
  const [slide, setSlide] = useState(0);
  const slides = dict.carousel.slides;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <section className="px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[28px]">
        <div className="relative min-h-[480px] sm:h-[520px]">
          {slides.map((s, i) => {
            const meta = SLIDE_META[i % SLIDE_META.length];
            return (
              <div
                key={i}
                aria-hidden={i !== slide}
                className={`paper-fibre transition-opacity duration-700 ${meta.bg} ${i === slide ? 'relative opacity-100 sm:absolute sm:inset-0' : 'pointer-events-none absolute inset-0 opacity-0'}`}
              >
                <div className="mx-auto grid h-full max-w-[1240px] items-center gap-6 px-5 pb-14 pt-7 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-10">
                  <div className="order-2 text-center sm:order-1 sm:text-start">
                    <span className="eyebrow-new text-ink/70">{dict.carousel.ariaLabel}</span>
                    <h1 className="display-xl mt-3 text-ink">{s.title}</h1>
                    <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-ink/75 sm:mx-0 sm:text-base">{s.line}</p>
                    <Link href={`/${locale}${meta.href}`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-card px-7 py-3.5 text-[0.75rem] font-extrabold uppercase tracking-[0.12em] text-ink transition-transform hover:scale-[1.04]">
                      {s.cta} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </Link>
                  </div>
                  <div className="order-1 sm:order-2 sm:h-full sm:py-6">
                    <img src={poolUrl(meta.pool, (i % 4) + 1)} alt="" className="aspect-[4/3] w-full rounded-[22px] border-[6px] border-card object-cover shadow-lg sm:aspect-auto sm:h-full sm:rounded-2xl" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" aria-label={dict.carousel.prev} onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)} className="absolute start-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card/85 text-ink shadow sm:grid">
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <button type="button" aria-label={dict.carousel.next} onClick={() => setSlide((s) => (s + 1) % slides.length)} className="absolute end-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card/85 text-ink shadow sm:grid">
          <ChevronRight className="h-5 w-5 rtl:rotate-180" />
        </button>
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button key={i} type="button" aria-label={`${i + 1}/${slides.length}`} aria-current={i === slide} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? 'w-7 bg-ink' : 'w-2 bg-ink/30'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
