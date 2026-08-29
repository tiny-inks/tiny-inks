import Link from 'next/link';

/* Short looping brand video: muted, autoplay, playsinline, poster first.
   Under prefers-reduced-motion the <video> is hidden by CSS and the poster
   stays — nothing moves. The owner swaps the two files in public/video/. */
export default function VideoLoop({ dict, locale, src = '/video/tiny-inks-loop.webm', poster = '/video/poster.jpg' }) {
  const t = dict.video;
  return (
    <section className="section row-section video-section">
      <div className="wrap">
        <div className="video-loop">
          <img className="video-poster" src={poster} alt={t.alt} loading="lazy" />
          <video
            className="video-el"
            src={src}
            poster={poster}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="video-copy">
            <div className="eyebrow">{t.eyebrow}</div>
            <h2>{t.title}</h2>
            <p>{t.lede}</p>
            <Link href={`/${locale}/shop`} className="btn btn-primary">{t.cta}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
