'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useReducedMotion from './reactbits/useReducedMotion';
import { IMAGES, imgAlt } from '@/lib/images';

/* Promo banner carousel: scroll-snap track (native swipe + RTL), auto-advance
   6s, pauses on hover, arrows + dots, static under reduced motion. */
const SLIDE_META = [
  { bg: 'var(--cream)', href: '/shop' },
  { bg: 'var(--blush)', href: '/shop' },
  { bg: 'var(--blue)', href: '/bundles' },
];

export default function PromoCarousel({ dict, locale }) {
  const reduced = useReducedMotion();
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const hoverRef = useRef(false);
  const slides = dict.carousel.slides;

  const goTo = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const n = ((i % slides.length) + slides.length) % slides.length;
    const child = el.children[n];
    if (!child) return;
    /* rect delta works identically in LTR and RTL (scrollLeft does not) */
    const delta = child.getBoundingClientRect().left - el.getBoundingClientRect().left;
    el.scrollBy({ left: delta, behavior: reduced === false ? 'smooth' : 'auto' });
  };

  /* auto-advance */
  useEffect(() => {
    if (reduced !== false) return;
    const id = setInterval(() => {
      if (!hoverRef.current && document.visibilityState === 'visible') goTo(idxRef.current + 1);
    }, 6000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  /* track current slide from scroll position (works in RTL too) */
  const idxRef = useRef(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let t;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const base = el.getBoundingClientRect().left;
        let best = 0;
        let bestDist = Infinity;
        [...el.children].forEach((c, i) => {
          const d = Math.abs(c.getBoundingClientRect().left - base);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        idxRef.current = best;
        setIdx(best);
      }, 80);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(t); };
  }, []);

  return (
    <section
      className="carousel wrap"
      aria-roledescription="carousel"
      aria-label={dict.carousel.ariaLabel}
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >
      <div className="carousel-track" ref={trackRef}>
        {slides.map((s, i) => {
          const meta = SLIDE_META[i % SLIDE_META.length];
          const photo = IMAGES.promoSlides[i % IMAGES.promoSlides.length];
          return (
            <div className="carousel-slide" key={i} style={{ background: meta.bg }} aria-hidden={idx !== i}>
              <div className="carousel-copy">
                <h2>{s.title}</h2>
                <p>{s.line}</p>
                <Link href={`/${locale}${meta.href}`} className="btn btn-primary" tabIndex={idx === i ? 0 : -1}>
                  {s.cta}
                </Link>
              </div>
              <div className="carousel-photo">
                {/* the first slide's photo is the LCP element — let next/image
                    right-size and preload it */}
                <Image
                  src={photo.url}
                  alt={imgAlt(photo, locale)}
                  width={750}
                  height={563}
                  priority={i === 0}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  sizes="(max-width: 700px) 92vw, 38vw"
                />
              </div>
            </div>
          );
        })}
      </div>

      <button className="carousel-arrow prev" onClick={() => goTo(idx - 1)} aria-label={dict.carousel.prev}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button className="carousel-arrow next" onClick={() => goTo(idx + 1)} aria-label={dict.carousel.next}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>

      <div className="carousel-dots" aria-label={dict.carousel.ariaLabel}>
        {slides.map((_, i) => (
          <button
            key={i}
            className={`carousel-dot ${idx === i ? 'on' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`${i + 1} / ${slides.length}`}
            aria-current={idx === i}
          />
        ))}
      </div>
    </section>
  );
}
