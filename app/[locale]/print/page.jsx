import { MessageCircle, Truck } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import PrinterScene from '@/components/print/PrinterScene';
import { getDict } from '@/lib/dictionaries';
import { getBusiness } from '@/lib/site';

/* Printing is handled over WhatsApp, not through the site: the customer sends
   a file, we agree size/colour/copies/finishing in chat and confirm a price by
   hand. So this page is information + one CTA — no upload, no calculator, no
   print checkout. The old on-site ordering flow (PrintOrder, the hidden print
   Shopify products, blob file storage) is no longer rendered anywhere. */

export async function generateMetadata({ params }) {
  const dict = getDict(params.locale);
  return { title: dict.print.title, description: dict.print.waLede };
}

export default function PrintPage({ params }) {
  const locale = params.locale === 'ar' ? 'ar' : 'en';
  const dict = getDict(locale);
  const t = dict.print;
  const b = getBusiness();
  const waHref = `${b.whatsappHref}?text=${encodeURIComponent(t.waMsg)}`;

  return (
    <>
      {/* Hero — the printer scene stays the main visual */}
      <section className="overflow-hidden bg-sage pb-12 pt-8 sm:pb-16 sm:pt-12">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <Breadcrumbs dict={dict} locale={locale} items={[{ label: t.title }]} />
          <div className="grid items-center gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-14">
            <div>
              <span className="eyebrow-new mt-4 text-ink/70">{t.eyebrow}</span>
              <h1 className="display-xl mt-3 text-ink">{t.headline}</h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/80 sm:text-base">{t.waLede}</p>

              <a href={waHref} target="_blank" rel="noreferrer" className="ui-btn ui-btn-primary ui-btn-lg mt-7">
                <MessageCircle className="h-4 w-4" strokeWidth={2} /> {t.waCta}
              </a>
              <p className="mt-3 text-xs text-ink/60">{t.fileTypes}</p>
            </div>
            <PrinterScene label={t.sceneLabel} />
          </div>
        </div>
      </section>

      {/* How it works — explanation only, no controls */}
      <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
        <h2 className="display-md">{t.howTitle}</h2>
        <ol className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-3">
          {t.howSteps.map((s) => (
            <li key={s.n} className="border-t-2 border-ink pt-5">
              <span className="font-display text-2xl text-coral">{s.n}</span>
              <h3 className="mt-2 font-display text-lg">{s.t}</h3>
              <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>

        {/* Delivery — a plain statement, not a calculator */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-border bg-card px-6 py-5">
          <span className="flex items-center gap-2.5 text-sm font-bold">
            <Truck className="h-5 w-5 shrink-0 text-coral" strokeWidth={1.7} />
            {t.deliveryNote}
          </span>
          <span className="text-sm text-muted-foreground">{t.collectNote}</span>
        </div>

        <div className="mt-10">
          <a href={waHref} target="_blank" rel="noreferrer" className="ui-btn ui-btn-primary ui-btn-lg">
            <MessageCircle className="h-4 w-4" strokeWidth={2} /> {t.waCta}
          </a>
        </div>
      </section>
    </>
  );
}
