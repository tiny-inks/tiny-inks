'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { STAFF_DICT } from '@/lib/staff-dict';

export function useStaffLang() {
  const [lang, setLang] = useState('en');
  useEffect(() => { try { const l = localStorage.getItem('ti_staff_lang'); if (l === 'ar' || l === 'en') setLang(l); } catch {} }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('ti_staff_lang', lang); } catch {}
  }, [lang]);
  return [lang, setLang];
}

export default function StaffLogin() {
  const [lang, setLang] = useStaffLang();
  const t = STAFF_DICT[lang];
  const router = useRouter();
  const params = useSearchParams();
  const [pw, setPw] = useState('');
  const [state, setState] = useState('idle');
  const [demo, setDemo] = useState(false);

  useEffect(() => { fetch('/api/staff/login').then((r) => r.json()).then((j) => setDemo(!!j.demoPassword)).catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    try {
      const r = await fetch('/api/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      if (r.ok) { router.replace(params.get('next') && params.get('next').startsWith('/staff') ? params.get('next') : '/staff'); router.refresh(); return; }
      setState(r.status === 429 ? 'rate' : 'wrong');
    } catch { setState('offline'); }
  };

  return (
    <main className="staff-login">
      <button type="button" className="staff-lang" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.lang}</button>
      <img src="/staff/icon-192.png" alt="" width="72" height="72" className="staff-logo" />
      <h1>{t.login.title}</h1>
      <p className="staff-sub">{t.app}</p>
      {demo && <p className="staff-warn" role="status">{t.login.demo}</p>}
      <form onSubmit={submit} className="staff-form">
        <label htmlFor="staff-pw">{t.login.password}</label>
        <input id="staff-pw" type="password" autoComplete="current-password" className="staff-input" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
        {state === 'wrong' && <p className="staff-err" role="alert">{t.login.wrong}</p>}
        {state === 'rate' && <p className="staff-err" role="alert">{t.login.rate}</p>}
        {state === 'offline' && <p className="staff-err" role="alert">{t.login.offline}</p>}
        <button className="staff-btn primary" disabled={state === 'sending'}>{t.login.submit}</button>
      </form>
    </main>
  );
}
