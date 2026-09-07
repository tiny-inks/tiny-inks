/* Short "Why shop with us" strip — replaces the old editorial/manifesto blocks. */
const ICONS = [
  /* paper sheet */
  <svg key="p" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 2h9l4 4v16H6z" /><path d="M15 2v4h4" /><path d="M9 12h7M9 16h7" />
  </svg>,
  /* gift */
  <svg key="g" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M12 9v12M3 13h18" /><path d="M12 9c-2 0-5-.8-5-3a2.4 2.4 0 0 1 5-.8A2.4 2.4 0 0 1 17 6c0 2.2-3 3-5 3z" />
  </svg>,
  /* truck */
  <svg key="t" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 5h13v11H1z" /><path d="M14 9h4l4 4v3h-8" /><circle cx="6" cy="18.5" r="1.8" /><circle cx="18" cy="18.5" r="1.8" />
  </svg>,
  /* chat */
  <svg key="c" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a8 8 0 0 1-8 8H4l2.5-3A8 8 0 1 1 21 12z" /><path d="M8.5 11.5h7M8.5 14.5h4" />
  </svg>,
];

const BGS = ['var(--blue)', 'var(--blush)', 'var(--mustard)', 'var(--sage)'];

export default function WhyStrip({ dict }) {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="content-block cream grain why-strip">
          <h2 style={{ textAlign: 'center', marginBottom: 28 }}>{dict.home.whyTitle}</h2>
          <div className="why-grid">
            {dict.home.why.map((item, i) => (
              <div className="why-item" key={i}>
                <span className="usp-icon" style={{ background: BGS[i] }}>{ICONS[i]}</span>
                <strong>{item.t}</strong>
                <small>{item.d}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
