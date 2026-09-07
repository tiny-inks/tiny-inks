'use client';
import { useState } from 'react';
import Placeholder from './Placeholder';

export default function Gallery({ images, title, handle, noImageLabel }) {
  const [idx, setIdx] = useState(0);
  const list = images && images.length ? images : [];
  const main = list[idx];

  if (list.length === 0) {
    return (
      <div className="pdp-gallery">
        <div className="pdp-main">
          <Placeholder handle={handle} title={title} label={noImageLabel} size="hero" />
        </div>
      </div>
    );
  }

  return (
    <div className="pdp-gallery">
      {/* desktop: main image + thumbnails */}
      <div className="pdp-main">
        <img src={main.url} alt={main.alt || title} loading="eager" fetchPriority="high" />
      </div>
      {list.length > 1 && (
        <div className="pdp-thumbs">
          {list.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Image ${i + 1}`}
              aria-current={i === idx}
              className={`aspect-square w-[76px] shrink-0 overflow-hidden rounded-xl border-2 ${i === idx ? 'border-coral' : 'border-transparent'}`}
            >
              <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {/* phones: swipeable scroll-snap strip */}
      <div className="pdp-strip" aria-label={title}>
        {list.map((img, i) => (
          <img
            key={i}
            src={img.url}
            alt={img.alt || title}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : undefined}
          />
        ))}
      </div>
    </div>
  );
}
