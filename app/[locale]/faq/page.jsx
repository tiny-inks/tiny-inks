import Link from 'next/link';
import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getDict } from '@/lib/dictionaries';
import { FAQ, POLICY_SLUGS } from '@/content/policies';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.policies.faq, description: dict.faqPage.lede };
}

export default function FaqPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const items = FAQ[locale].items;

  return (
    <section className="section" style={{ paddingTop: 'clamp(40px, 6vw, 70px)' }}>
      <div className="wrap policy-wrap">
        <Breadcrumbs dict={dict} locale={locale} items={[{ label: dict.policies.faq }]} />
        <Reveal>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}>{dict.faqPage.title}</h1>
          <p className="lede" style={{ marginBottom: 34 }}>{dict.faqPage.lede}</p>
        </Reveal>
        <div className="faq-list">
          {items.map((item, i) => (
            <Reveal key={i} delay={Math.min(i * 0.04, 0.2)}>
              <details className="faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
        <div className="policy-links">
          {POLICY_SLUGS.map((s) => (
            <Link key={s} href={`/${locale}/policies/${s}`} className="chip">
              {dict.policies[s]}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
