import Breadcrumbs from '@/components/Breadcrumbs';
import PrintOrder from '@/components/print/PrintOrder';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';
import { isLive } from '@/lib/shopify';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.print.title, description: dict.print.lede };
}

export default function PrintPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.print;
  return (
    <section className="section" style={{ paddingTop: 'clamp(18px, 3vw, 34px)' }}>
      <div className="wrap">
        <Breadcrumbs dict={dict} locale={locale} items={[{ label: t.title }]} />
        <div className="print-head">
          <div className="eyebrow">{t.eyebrow}</div>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}>{t.title}</h1>
          <p className="lede">{t.lede}</p>
        </div>
        <PrintOrder dict={dict} locale={locale} live={isLive()} business={getBusiness()} />
      </div>
    </section>
  );
}
