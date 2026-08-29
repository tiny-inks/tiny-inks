'use client';
import { useEffect, useRef } from 'react';

/* Section reveal: fade + 24px rise, 0.6s, brand easing, triggered once.
   Content is VISIBLE in the server HTML — the animation is only "armed" for
   elements still below the viewport when JS arrives. Above-the-fold content
   therefore paints immediately (no LCP penalty, no flash for no-JS), and
   scrolled-to sections still get the entrance. Inert under reduced motion. */
export default function Reveal({ children, delay = 0, stagger = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // already on screen (or nearly) → leave it painted, no animation
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) return;

    if (stagger) {
      [...el.children].forEach((c, i) => {
        c.style.transitionDelay = `${delay + i * 0.06}s`;
      });
    } else if (delay) {
      el.style.transitionDelay = `${delay}s`;
    }
    el.classList.add('armed');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('in');
            io.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, stagger]);

  return (
    <div ref={ref} className={`${stagger ? 'reveal-stagger' : 'reveal'} ${className}`}>
      {children}
    </div>
  );
}
