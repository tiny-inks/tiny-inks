'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STAFF_DICT } from '@/lib/staff-dict';
import { useStaffLang } from './StaffLogin';

const STATUSES = ['new', 'printing', 'ready', 'done'];
const NEXT = { new: 'printing', printing: 'ready', ready: 'done' };
const fmt = (n, lang) => new Intl.NumberFormat(lang === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2 }).format(n || 0);
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const digits = (s) => String(s || '').replace(/\D/g, '');
const attrsHasNote = (o) => o.items.some((it) => (it.attributes || []).some((a) => a.key === 'Customer note'));

export default function StaffApp() {
  const [lang, setLang] = useStaffLang();
  const t = STAFF_DICT[lang];
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [f, setF] = useState({ status: 'all', period: 'all', fulfil: 'all', q: '' });

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/orders', { cache: 'no-store' });
      if (r.status === 401) { router.replace('/staff/login'); return; }
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setData(j); setError('');
    } catch (e) { setError(t.error); }
  }, [router, t.error]);
  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, [load]);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 3000); return () => clearTimeout(id); } }, [toast]);

  const orders = data?.orders || [];
  const today0 = startOfDay();
  const week0 = today0 - 6 * 86400 * 1000;

  const visible = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const qd = digits(q);
    return orders
      .filter((o) => f.status === 'all' || o.status === f.status)
      .filter((o) => f.fulfil === 'all' || o.fulfilment === f.fulfil)
      .filter((o) => { const ts = new Date(o.createdAt).getTime(); return f.period === 'all' || (f.period === 'today' ? ts >= today0 : ts >= week0); })
      .filter((o) => !q || o.name.toLowerCase().includes(q) || (qd && digits(o.customer?.phone).includes(qd)) || (o.customer?.name || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, f, today0, week0]);
  const todays = visible.filter((o) => new Date(o.createdAt).getTime() >= today0);
  const older = visible.filter((o) => new Date(o.createdAt).getTime() < today0);

  const totals = useMemo(() => {
    const list = orders.filter((o) => new Date(o.createdAt).getTime() >= today0);
    return { orders: list.length, pages: list.reduce((s, o) => s + (o.pagesPrinted || 0), 0), revenue: list.reduce((s, o) => s + (o.total || 0), 0) };
  }, [orders, today0]);

  const setStatus = async (o, status) => {
    const prev = o.status;
    setData((d) => ({ ...d, orders: d.orders.map((x) => (x.id === o.id ? { ...x, status } : x)) }));
    try {
      const r = await fetch('/api/staff/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, status }) });
      if (!r.ok) throw new Error('status');
    } catch {
      setData((d) => ({ ...d, orders: d.orders.map((x) => (x.id === o.id ? { ...x, status: prev } : x)) }));
      setToast(t.statusErr);
    }
  };

  const openFile = async (ref, e) => {
    e.preventDefault();
    try {
      const r = await fetch('/api/staff/file-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref }) });
      const j = await r.json();
      if (!j.ok) throw new Error();
      window.open(j.url, '_blank', 'noopener');
    } catch { setToast(t.card.linkErr); }
  };

  const logout = async () => { await fetch('/api/staff/login', { method: 'DELETE' }); router.replace('/staff/login'); };

  const notifyHref = (o) => {
    const msg = (o.fulfilment === 'delivery' ? t.notifyMsgDelivery : t.notifyMsg).replace(/\{order\}/g, o.name).replace(/\{total\}/g, fmt(o.total, 'en'));
    return `https://wa.me/${digits(o.customer?.phone)}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <main className="staff">
      <header className="staff-top">
        <div className="staff-brand"><img src="/staff/icon-192.png" alt="" width="36" height="36" /> <strong>{t.app}</strong></div>
        <div className="staff-top-actions">
          <button type="button" className="staff-btn small" onClick={load} aria-label={t.refresh}>↻ {t.refresh}</button>
          <button type="button" className="staff-btn small" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.lang}</button>
          <button type="button" className="staff-btn small ghost" onClick={logout} data-testid="staff-logout">{t.logout}</button>
        </div>
      </header>

      {data && !data.live && <p className="staff-warn" role="status">{t.demoBadge}</p>}
      {data && data.storage !== 'blob' && <p className="staff-warn" role="status">{t.storageWarn}</p>}
      {error && <p className="staff-err" role="alert">{error} <button type="button" className="staff-btn small" onClick={load}>{t.refresh}</button></p>}

      <section className="staff-totals" aria-label={t.totals.title}>
        <div><small>{t.totals.orders}</small><strong data-testid="total-orders">{totals.orders}</strong></div>
        <div><small>{t.totals.pages}</small><strong data-testid="total-pages">{totals.pages}</strong></div>
        <div><small>{t.totals.revenue}</small><strong className="money" data-testid="total-revenue">{fmt(totals.revenue, lang)}</strong></div>
      </section>

      <section className="staff-filters">
        <input className="staff-input search" type="search" inputMode="search" placeholder={t.filters.search} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label={t.filters.search} data-testid="staff-search" />
        <div className="staff-chips" role="group" aria-label={t.filters.status}>
          {['all', ...STATUSES].map((s) => (
            <button key={s} type="button" className={`staff-chip ${f.status === s ? 'on' : ''}`} onClick={() => setF({ ...f, status: s })} data-testid={`filter-${s}`}>{s === 'all' ? t.filters.all : t.status[s]}</button>
          ))}
        </div>
        <div className="staff-chips" role="group" aria-label={t.filters.period}>
          {['all', 'today', 'week'].map((p) => (
            <button key={p} type="button" className={`staff-chip ${f.period === p ? 'on' : ''}`} onClick={() => setF({ ...f, period: p })}>{t.filters[p]}</button>
          ))}
          {['all', 'collect', 'delivery'].map((p) => (
            <button key={`f-${p}`} type="button" className={`staff-chip ${f.fulfil === p ? 'on' : ''}`} onClick={() => setF({ ...f, fulfil: p })}>{p === 'all' ? `${t.filters.fulfil}: ${t.filters.all}` : t.filters[p]}</button>
          ))}
        </div>
      </section>

      {data && visible.length === 0 && (
        <div className="staff-empty" data-testid="staff-empty">
          <span aria-hidden="true">✦</span>
          <h2>{t.empty.title}</h2>
          <p>{t.empty.lede}</p>
        </div>
      )}

      {[['today', todays], ['older', older]].map(([key, list]) => list.length > 0 && (
        <section key={key} className="staff-section">
          <h2 className="staff-h2">{t.sections[key]} <span>{list.length}</span></h2>
          {list.map((o) => (
            <article key={o.id} className={`job status-${o.status}`} data-testid="job-card" data-status={o.status}>
              <header className="job-head">
                <div>
                  <strong className="job-no">{o.name}</strong>
                  <time dateTime={o.createdAt}>
                    <b>{new Date(o.createdAt).toLocaleTimeString(lang === 'ar' ? 'ar-AE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</b>
                    <span>{new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short' })}</span>
                  </time>
                </div>
                <span className={`job-status s-${o.status}`}>{t.status[o.status]}</span>
              </header>

              <div className="job-customer">
                <strong>{o.customer?.name || '—'}</strong>
                {o.customer?.phone && (
                  <div className="job-contact">
                    <a className="staff-btn small" href={`tel:${o.customer.phone}`}>☎ {t.card.call}</a>
                    <a className="staff-btn small" href={`https://wa.me/${digits(o.customer.phone)}`} target="_blank" rel="noreferrer">💬 {t.card.whatsapp}</a>
                    <span className="job-phone" dir="ltr">{o.customer.phone}</span>
                  </div>
                )}
              </div>

              {(() => {
                const attrs = o.items.flatMap((it) => it.attributes || []);
                const get = (k) => attrs.find((a) => a.key === k)?.value;
                const chips = [get('Paper size'), get('Colour'), get('Sides'), get('Copies') ? `× ${get('Copies')}` : null, get('Finishing') && get('Finishing') !== 'none' ? get('Finishing') : null].filter(Boolean);
                const pageMap = Object.fromEntries((get('Pages') || '').split(' | ').map((s) => { const i = s.lastIndexOf(':'); return i > 0 ? [s.slice(0, i).trim(), s.slice(i + 1).trim()] : [s, '']; }));
                const files = (get('Files') || '').split(' | ').filter(Boolean).map((n) => (pageMap[n] ? `${n} (${pageMap[n]} ${t.card.pages})` : n));
                const noteTxt = get('Customer note');
                const refs = [...new Set(attrs.filter((a) => a.key === 'File ref').flatMap((a) => a.value.split(' | ')).filter(Boolean))];
                return (
                  <>
                    {chips.length > 0 && <div className="job-chips" data-testid="job-chips">{chips.map((c, i) => <span key={i} className="job-chip">{c}</span>)}</div>}
                    {files.length > 0 && <p className="job-files">📄 {files.join(' · ')}</p>}
                    {noteTxt && <p className="job-note"><b>{t.card.note}:</b> {noteTxt}</p>}
                    <ul className="job-items">
                      {o.items.map((it, i) => <li key={i}><span>{it.title}</span><b>× {it.quantity}</b></li>)}
                    </ul>
                    <div className="job-primary">
                      {refs.length > 0 ? refs.map((ref, j) => (
                        <a key={j} href="#" className="staff-btn big file-btn" onClick={(e) => openFile(ref, e)} data-testid="open-file">
                          📄 {t.card.openFile}{refs.length > 1 ? ` ${j + 1}` : ''}{ref.startsWith('demo:') ? ` · ${t.card.demoFile}` : ''}
                        </a>
                      )) : <span className="job-nofile">{t.card.noFile}</span>}
                      {NEXT[o.status] ? (
                        <button type="button" className="staff-btn primary big" onClick={() => setStatus(o, NEXT[o.status])} data-testid="next-status">
                          {o.status === 'ready' && o.fulfilment === 'delivery' ? t.next.readyDelivery : t.next[o.status]} →
                        </button>
                      ) : (
                        <span className="job-done">✓ {t.next.done}</span>
                      )}
                    </div>
                  </>
                );
              })()}

              <div className="job-meta">
                <span><b>{o.pagesPrinted || 0}</b> {t.card.pages}</span>
                <span className={`pay ${o.financialStatus === 'PAID' ? 'ok' : ''}`}>{fmt(o.total, lang)} · {o.financialStatus === 'PAID' ? t.card.paid : o.financialStatus === 'PENDING' ? t.card.pending : t.card.unpaid}</span>
                <span className="ful">{o.fulfilment === 'delivery' ? `🚚 ${t.card.delivery}` : `🏪 ${t.card.collect}`}</span>
              </div>
              {o.address && <p className="job-note">📍 {o.address}</p>}
              {o.note && !attrsHasNote(o) && <p className="job-note"><b>{t.card.note}:</b> {o.note}</p>}

              <div className="job-actions">
                {o.status !== 'new' && (
                  <button type="button" className="staff-btn small ghost" onClick={() => setStatus(o, STATUSES[STATUSES.indexOf(o.status) - 1])}>← {t.back} {t.status[STATUSES[STATUSES.indexOf(o.status) - 1]]}</button>
                )}
                {o.customer?.phone && (
                  <a className="staff-btn small" href={notifyHref(o)} target="_blank" rel="noreferrer" data-testid="notify">💬 {t.card.notify}</a>
                )}
              </div>
            </article>
          ))}
        </section>
      ))}

      {toast && <div className="staff-toast" role="status">{toast}</div>}
      <p className="staff-install">{t.install}</p>
    </main>
  );
}
