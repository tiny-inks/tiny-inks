'use client';
import { useEffect, useRef, useState } from 'react';

/* Citron-style testimonials slider: scroll-snap track + progress dots. The
   active dot is derived from scroll PROGRESS (not intersection), and dot
   clicks page the track — same mechanics as the theme's tm-slider. RTL-safe. */
export default function ReviewsSlider({ children, ariaLabel = 'Reviews' }) {
  const trackRef = useRef(null);
  const [dots, setDots] = useState(1);
  const [active, setActive] = useState(0);
  const list = Array.isArray(children) ? children : [children];

  const recompute = () => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) { setDots(1); return; }
    const per = el.children[0]?.getBoundingClientRect().width || el.clientWidth;
    setDots(Math.max(2, Math.ceil((el.scrollWidth - 2) / (per || el.clientWidth))));
  };

  useEffect(() => {
    recompute();
    const el = trackRef.current;
    if (!el) return;
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 4) { setActive(0); return; }
        const rtl = getComputedStyle(el).direction === 'rtl';
        const x = Math.abs(el.scrollLeft);
        setActive(Math.round((x / max) * (dots - 1)));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', recompute, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', recompute);
      cancelAnimationFrame(raf);
    };
  }, [dots]);

  const goTo = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const target = Math.min(i * el.clientWidth, max);
    el.scrollTo({ left: rtl ? -target : target, behavior: 'smooth' });
  };

  return (
    <div className="tm-slider">
      <div className="tm-track" ref={trackRef}>
        {list.map((child, i) => (
          <div className="tm-cardwrap" key={i}>{child}</div>
        ))}
      </div>
      {dots > 1 && (
        <div className="tm-dots" aria-label={ariaLabel}>
          {Array.from({ length: dots }).map((_, i) => (
            <button
              key={i}
              className={`tm-dot ${active === i ? 'on' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to page ${i + 1} of ${dots}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
