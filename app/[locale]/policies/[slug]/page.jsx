import { notFound } from 'next/navigation';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getDict, LOCALES } from '@/lib/dictionaries';
import { POLICIES, POLICY_SLUGS } from '@/content/policies';

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => POLICY_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const policy = POLICIES[params.slug];
  if (!policy) return {};
  return {
    title: policy[locale].title,
    description: policy[locale].sections[0]?.ps[0]?.slice(0, 150),
  };
}

export default function PolicyPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const policy = POLICIES[params.slug];
  if (!policy) notFound();
  const t = policy[locale];

  return (
    <section className="section" style={{ paddingTop: 'clamp(40px, 6vw, 70px)' }}>
      <div className="wrap policy-wrap">
        <Breadcrumbs dict={dict} locale={locale} items={[{ href: `/${locale}/faq`, label: dict.policies.title }, { label: t.title }]} />
        <Reveal>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}>{t.title}</h1>
          <p className="policy-note">✦ {dict.policies.reviewNote}</p>
        </Reveal>
        <div className="policy-body">
          {t.sections.map((s, i) => (
            <Reveal key={i} delay={Math.min(i * 0.05, 0.2)}>
              <h2 className="policy-h">{s.h}</h2>
              {s.ps.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </Reveal>
          ))}
        </div>
        <div className="policy-links">
          {POLICY_SLUGS.filter((s) => s !== params.slug).map((s) => (
            <Link key={s} href={`/${locale}/policies/${s}`} className="chip">
              {dict.policies[s]}
            </Link>
          ))}
          <Link href={`/${locale}/faq`} className="chip">{dict.policies.faq}</Link>
        </div>
      </div>
    </section>
  );
}
