import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getDict } from '@/lib/dictionaries';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.nav.about, description: dict.about.p1 };
}

export default function AboutPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.about;

  return (
    <>
      <section className="section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)', paddingBottom: 'clamp(30px, 5vw, 60px)' }}>
        <div className="wrap" style={{ marginBottom: 18 }}>
          <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.nav.about }]} />
        </div>
        <div className="wrap split wide-start">
          <Reveal>
            <div className="eyebrow">{t.eyebrow}</div>
            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}>{t.title}</h1>
            <p className="lede">{t.p1}</p>
            <p className="lede">{t.p2}</p>
            <p className="lede">{t.p3}</p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="block cream" style={{ display: 'grid', placeItems: 'center', minHeight: 340 }}>
              <img src="/logo-full.png" alt="Tiny Inks logo" style={{ maxHeight: 300, width: 'auto' }} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal><h2>{t.valuesTitle}</h2></Reveal>
          <div className="cards-3" style={{ marginTop: 26 }}>
            {[
              { bg: 'var(--blue)', title: t.v1t, d: t.v1d },
              { bg: 'var(--mustard)', title: t.v2t, d: t.v2d },
              { bg: 'var(--blush)', title: t.v3t, d: t.v3d },
            ].map((v, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="block" style={{ background: v.bg, padding: '34px 30px' }}>
                  <h3>{v.title}</h3>
                  <p style={{ margin: 0 }}>{v.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
