import Breadcrumbs from '@/components/Breadcrumbs';
import PrintOrder from '@/components/print/PrintOrder';
import PrinterScene from '@/components/print/PrinterScene';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';
import { isLive } from '@/lib/shopify';
import PRINT from '@/config/print-pricing';

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.print.title, description: dict.print.lede };
}

export default function PrintPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.print;
  return (
    <>
      <section className="overflow-hidden bg-sage pb-10 pt-8 sm:pt-12">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <Breadcrumbs dict={dict} locale={locale} items={[{ label: t.title }]} />
          {/* the copy used to sit alone in a full-width band, leaving the right
              half of the hero empty on desktop — the printer scene fills it and
              stacks under the copy on phones */}
          <div className="grid items-center gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-14">
            <div>
              <span className="eyebrow-new mt-4 text-ink/70">{t.eyebrow}</span>
              <h1 className="display-xl mt-3 text-ink">{t.headline}</h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/75 sm:text-base">{t.lede}</p>
              <ul aria-label={t.trustLabel} className="mt-6 flex flex-wrap gap-3">
                {t.trust.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-full bg-card/70 px-4 py-2 text-xs font-bold text-ink">{s.replace('{hours}', String(PRINT.pickup.readyInHours))}</li>
                ))}
              </ul>
            </div>
            <PrinterScene label={t.sceneLabel} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:pb-40">
        <PrintOrder dict={dict} locale={locale} live={isLive()} business={getBusiness()} />
      </section>
    </>
  );
}
