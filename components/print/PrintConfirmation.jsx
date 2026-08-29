'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      <div className="empty">
        <div className="empty-glyph" aria-hidden="true">✦</div>
        <h3>{c.none}</h3>
        <Link href={`/${locale}/print`} className="btn btn-primary">{c.startNew}</Link>
      </div>
    );
  }
  if (!job) return <div className="print-confirm" aria-busy="true" />;

  const q = job.quote;
  const waText = encodeURIComponent(`${c.waMsg} ${job.orderName || ''} — ${fmtMoney(q.total, locale)}`);
  const hours = PRINT.pickup.readyInHours;

  return (
    <div className="print-confirm">
      <div className="confirm-hero">
        <span className="confirm-check" aria-hidden="true">✓</span>
        <div>
          <div className="eyebrow">{job.demo ? c.demoEyebrow : c.eyebrow}</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>{c.title}</h1>
          {job.orderName && <p className="confirm-order">{c.orderNo}: <strong>{job.orderName}</strong></p>}
        </div>
      </div>

      {job.demo && <div className="form-err" role="status">{c.demoNote}</div>}
      {!job.demo && !job.paid && (
        <div className="confirm-pay">
          <p>{c.payNote}</p>
          <Link href={`/${locale}/cart`} className="btn btn-primary">{c.payCta}</Link>
        </div>
      )}

      <div className="confirm-grid">
        <section className="confirm-card">
          <h3>{c.summary}</h3>
          <ul className="confirm-files">
            {job.files.map((f, i) => <li key={i}><span>{f.name}</span><small>{f.pages} {t.pagesShort}</small></li>)}
          </ul>
          <dl className="confirm-opts">
            <div><dt>{t.opt.size}</dt><dd>{q.size}</dd></div>
            <div><dt>{t.opt.color}</dt><dd>{t.colors[q.color]}</dd></div>
            <div><dt>{t.opt.sided}</dt><dd>{t.sides[q.sided]}</dd></div>
            <div><dt>{t.opt.copies}</dt><dd>{q.copies}</dd></div>
            <div><dt>{t.opt.finishing}</dt><dd>{t.finishing[q.finishing]}</dd></div>
            <div><dt>{t.opt.fulfilment}</dt><dd>{t.fulfil[q.fulfilment]}</dd></div>
            {job.note && <div><dt>{t.noteLabel}</dt><dd>{job.note}</dd></div>}
          </dl>
          <div className="quote-lines">
            {q.lines.map((l, i) => (
              <div key={i} className={`quote-line ${l.amount < 0 ? 'neg' : ''}`}>
                <span>{lineLabel(l, t)}</span><strong>{fmtMoney(l.amount, locale)}</strong>
              </div>
            ))}
            <div className="quote-line total"><span>{t.quote.total}</span><strong>{fmtMoney(q.total, locale)}</strong></div>
          </div>
        </section>

        <section className="confirm-card">
          <h3>{c.nextTitle}</h3>
          <ol className="confirm-steps">
            <li>{job.demo ? c.step1Demo : c.step1}</li>
            <li>{q.fulfilment === 'delivery' ? c.step2Delivery : c.step2Collect.replace('{hours}', String(hours))}</li>
            <li>{c.step3}</li>
          </ol>
          <p className="field-note">{t.privacyShort}</p>
          <a className="btn btn-primary" href={`${business.whatsappHref}?text=${waText}`} target="_blank" rel="noreferrer">{c.whatsapp}</a>
          <Link href={`/${locale}/print`} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>{c.startNew}</Link>
        </section>
      </div>
    </div>
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
