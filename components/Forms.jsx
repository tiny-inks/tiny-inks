'use client';
import { useState } from 'react';
import { getBusiness } from '@/lib/site';

/* Both forms POST to /api/contact and only show success on a 2xx. When the
   server has no delivery configured (503) or delivery fails, the visitor sees
   an honest message with WhatsApp / email links that carry their text. */
async function submit(payload) {
  try {
    const r = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) return { ok: true };
    return { ok: false, error: j.error || (r.status === 503 ? 'not_configured' : 'delivery') };
  } catch {
    return { ok: false, error: 'network' };
  }
}

function Fallback({ dict, text }) {
  const b = getBusiness();
  const t = dict.contact;
  return (
    <div className="form-fallback">
      <a className="btn btn-primary btn-sm" href={`${b.whatsappHref}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">{t.whatsapp}</a>
      <a className="btn btn-ghost btn-sm" href={`mailto:${b.email}?subject=${encodeURIComponent(t.mailSubject)}&body=${encodeURIComponent(text)}`}>{t.email}</a>
    </div>
  );
}

export function NewsletterForm({ dict, locale = 'en' }) {
  const [state, setState] = useState('idle'); // idle | sending | ok | error
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const t = dict.home;
  if (state === 'ok') return <div className="form-ok" role="status">{t.newsOk}</div>;
  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('sending');
        const r = await submit({ type: 'newsletter', email, locale });
        if (r.ok) setState('ok'); else { setError(r.error); setState('error'); }
      }}
    >
      <input
        className="input"
        type="email"
        required
        placeholder={t.newsPlaceholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label={t.newsPlaceholder}
      />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <button className="btn btn-ink" disabled={state === 'sending'}>{state === 'sending' ? t.newsSending : t.newsCta}</button>
      {state === 'error' && (
        <div className="form-err" role="alert">
          {error === 'email' ? dict.contact.errEmail : error === 'not_configured' ? t.newsErrSetup : t.newsErr}
        </div>
      )}
    </form>
  );
}

export function ContactForm({ dict, locale = 'en' }) {
  const t = dict.contact;
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const text = `${form.name}\n${form.email}\n\n${form.message}`;

  if (state === 'ok') return <div className="form-ok" role="status">{t.ok}</div>;

  return (
    <form
      className="contact-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('sending');
        const r = await submit({ type: 'contact', ...form, locale });
        if (r.ok) setState('ok'); else { setError(r.error); setState('error'); }
      }}
    >
      <div className="field">
        <label htmlFor="cf-name">{t.name}</label>
        <input id="cf-name" className="input" required autoComplete="name" value={form.name} onChange={set('name')} />
      </div>
      <div className="field">
        <label htmlFor="cf-email">{t.emailLabel}</label>
        <input id="cf-email" className="input" type="email" required autoComplete="email" dir="ltr" value={form.email} onChange={set('email')} />
      </div>
      <div className="field">
        <label htmlFor="cf-msg">{t.message}</label>
        <textarea id="cf-msg" className="input" rows={5} required value={form.message} onChange={set('message')} />
      </div>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <button className="btn btn-primary" style={{ justifySelf: 'start' }} disabled={state === 'sending'}>
        {state === 'sending' ? t.sending : t.send}
      </button>
      {state === 'error' && (
        <div className="form-err" role="alert">
          <p>
            {error === 'email' ? t.errEmail
              : error === 'fields' ? t.errFields
              : error === 'not_configured' ? t.errSetup
              : t.errDelivery}
          </p>
          <Fallback dict={dict} text={text} />
        </div>
      )}
    </form>
  );
}
