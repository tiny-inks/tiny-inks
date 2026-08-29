import Breadcrumbs from '@/components/Breadcrumbs';
import PrintOrder from '@/components/print/PrintOrder';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';
import { isLive } from '@/lib/shopify';
import PRINT from '@/config/print-pricing';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.print.title, description: dict.print.lede };
}

const TRUST_ICONS = ['⏱', '🏪', '🔒'];

export default function PrintPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.print;
  return (
    <section className="section print-section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)' }}>
      <div className="wrap">
        <Breadcrumbs dict={dict} locale={locale} items={[{ label: t.title }]} />
        <header className="print-head">
          <div className="eyebrow">{t.eyebrow}</div>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}>{t.headline}</h1>
          <p className="lede">{t.lede}</p>
          <ul className="trust-row" aria-label={t.trustLabel}>
            {t.trust.map((s, i) => (
              <li key={i}><span aria-hidden="true">{TRUST_ICONS[i]}</span>{s.replace('{hours}', String(PRINT.pickup.readyInHours))}</li>
            ))}
          </ul>
        </header>
        <PrintOrder dict={dict} locale={locale} live={isLive()} business={getBusiness()} />
      </div>
    </section>
  );
}
