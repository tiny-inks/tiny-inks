'use client';
import { useEffect, useRef, useState } from 'react';

/* Horizontal product row: scroll-snap + ~15% peek (CSS), mouse drag-to-scroll,
   and desktop arrow buttons that fade out at either end. RTL-safe (rect math). */
export default function Shelf({ children, ariaLabel = '' }) {
  const ref = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const drag = useRef(null);

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 2) { setAtStart(true); setAtEnd(true); return; }
    const x = Math.abs(el.scrollLeft); // RTL gives negative values in Chrome
    setAtStart(x <= 2);
    setAtEnd(x >= max - 2);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const page = (dir) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const sign = rtl ? -1 : 1;
    el.scrollBy({ left: dir * sign * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  /* mouse drag-to-scroll (touch already scrolls natively) */
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    ref.current.scrollLeft = drag.current.left - dx;
  };
  const endDrag = (e) => {
    if (drag.current?.moved) {
      /* swallow the click that follows a drag so cards don't navigate */
      const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      ref.current.addEventListener('click', kill, { capture: true, once: true });
      setTimeout(() => ref.current?.removeEventListener('click', kill, { capture: true }), 0);
    }
    drag.current = null;
  };

  return (
    <div className="shelf-wrap">
      <div
        className={`shelf ${drag.current ? 'dragging' : ''}`}
        ref={ref}
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {children}
      </div>
      <button
        className={`shelf-arrow prev ${atStart ? 'off' : ''}`}
        onClick={() => page(-1)}
        aria-hidden={atStart}
        tabIndex={atStart ? -1 : 0}
        aria-label="previous"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button
        className={`shelf-arrow next ${atEnd ? 'off' : ''}`}
        onClick={() => page(1)}
        aria-hidden={atEnd}
        tabIndex={atEnd ? -1 : 0}
        aria-label="next"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
}
