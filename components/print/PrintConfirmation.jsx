'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Send } from 'lucide-react';
import { fmtMoney, PRINT } from '@/lib/print';

const KEY = 'ti_print_job';
export const saveJob = (job) => { try { sessionStorage.setItem(KEY, JSON.stringify(job)); } catch {} };

export default function PrintConfirmation({ dict, locale, business }) {
  const t = dict.print;
  const c = t.confirm;
  const [job, setJob] = useState(null);
  const [none, setNone] = useState(false);
  useEffect(() => {
    try { const j = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (j) setJob(j); else setNone(true); } catch { setNone(true); }
  }, []);

  if (none) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <h3 className="display-md">{c.none}</h3>
        <Link href={`/${locale}/print`} className="mt-7 ui-btn ui-btn-primary ui-btn-lg">{c.startNew}</Link>
      </section>
    );
  }
  if (!job) return <div aria-busy="true" className="min-h-[40vh]" />;

  const q = job.quote;
  const waText = encodeURIComponent(`${c.waMsg} ${job.orderName || ''} — ${fmtMoney(q.total, locale)}`);
  const hours = PRINT.pickup.readyInHours;

  return (
    <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-sage text-ink"><Check className="h-7 w-7" strokeWidth={1.8} /></div>
        <div>
          <span className="eyebrow-new">{job.demo ? c.demoEyebrow : c.eyebrow}</span>
          <h1 className="display-lg mt-2">{c.title}</h1>
          {job.orderName && <p className="mt-3 text-sm text-muted-foreground">{c.orderNo}: <strong className="text-foreground">{job.orderName}</strong></p>}
        </div>
      </div>

      {job.demo && <div role="status" className="mx-auto mt-6 max-w-lg rounded-2xl bg-blush/60 p-4 text-center text-sm text-ink">{c.demoNote}</div>}
      {!job.demo && !job.paid && (
        <div className="mx-auto mt-6 max-w-lg rounded-2xl bg-sun/60 p-5 text-center">
          <p className="text-sm text-ink">{c.payNote}</p>
          <Link href={`/${locale}/cart`} className="mt-3 ui-btn ui-btn-primary">{c.payCta}</Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h3 className="eyebrow-new">{c.summary}</h3>
          <ul className="mt-3 space-y-1.5">
            {job.files.map((f, i) => (
              <li key={i} className="flex justify-between gap-3 text-sm"><span className="truncate">{f.name}</span><small className="shrink-0 text-muted-foreground">{f.pages} {t.pagesShort}</small></li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
            {[
              [t.opt.size, q.size], [t.opt.color, t.colors[q.color]], [t.opt.sided, t.sides[q.sided]],
              [t.opt.copies, q.copies], [t.opt.finishing, t.finishing[q.finishing]], [t.opt.fulfilment, t.fulfil[q.fulfilment]],
              ...(job.note ? [[t.noteLabel, job.note]] : []),
            ].map(([label, val]) => (
              <div key={label}><dt className="label-xs">{label}</dt><dd className="font-medium">{val}</dd></div>
            ))}
          </dl>
          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            {q.lines.map((l, i) => (
              <div key={i} className="flex justify-between">
                <span className={l.amount < 0 ? 'text-sage' : 'text-muted-foreground'}>{lineLabel(l, t)}</span><strong className="tabular-nums">{fmtMoney(l.amount, locale)}</strong>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-3 text-base"><span className="font-semibold">{t.quote.total}</span><strong className="font-display tabular-nums">{fmtMoney(q.total, locale)}</strong></div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 text-center sm:p-8">
          <h3 className="eyebrow-new">{c.nextTitle}</h3>
          <ol className="mx-auto mt-4 max-w-sm list-decimal space-y-2 text-start text-sm text-muted-foreground [&>li]:ms-5">
            <li>{job.demo ? c.step1Demo : c.step1}</li>
            <li>{q.fulfilment === 'delivery' ? c.step2Delivery : c.step2Collect.replace('{hours}', String(hours))}</li>
            <li>{c.step3}</li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">{t.privacyShort}</p>
          <a href={`${business.whatsappHref}?text=${waText}`} target="_blank" rel="noreferrer" className="mt-5 ui-btn ui-btn-primary">
            <Send className="h-4 w-4" /> {c.whatsapp}
          </a>
          <Link href={`/${locale}/print`} className="mt-4 block text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted-foreground underline underline-offset-4">{c.startNew}</Link>
        </section>
      </div>
    </section>
  );
}

export function lineLabel(l, t) {
  const q = t.quote;
  if (l.key === 'pages') return `${l.qty} ${t.pagesShort} × ${l.unit.toFixed(2)} (${l.meta.size} · ${t.colors[l.meta.color]} · ${t.sides[l.meta.sided]})`;
  if (l.key === 'discount') return `${q.discount} −${l.percent}%`;
  if (l.key === 'finishing') return `${t.finishing[l.finishing]} × ${l.qty}`;
  if (l.key === 'minimum') return `${q.minimum} (${l.minimum.toFixed(2)})`;
  if (l.key === 'delivery') return q.delivery;
  return l.key;
}
