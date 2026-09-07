'use client';
import { useState } from 'react';
import { Mail } from 'lucide-react';
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
    <div className="mt-3 flex flex-wrap gap-2">
      <a className="rounded-full bg-ink px-5 py-2.5 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] text-white" href={`${b.whatsappHref}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">{t.whatsapp}</a>
      <a className="rounded-full border-2 border-ink px-5 py-2.5 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] text-ink" href={`mailto:${b.email}?subject=${encodeURIComponent(t.mailSubject)}&body=${encodeURIComponent(text)}`}>{t.email}</a>
    </div>
  );
}

export function NewsletterForm({ dict, locale = 'en', dark = false }) {
  const [state, setState] = useState('idle'); // idle | sending | ok | error
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const t = dict.home;
  if (state === 'ok') {
    return (
      <div role="status" className={`rounded-full px-5 py-2.5 text-sm font-bold ${dark ? 'bg-white/10 text-white' : 'bg-sage text-ink'}`}>
        {t.newsOk}
      </div>
    );
  }
  return (
    <div className="w-full max-w-md">
      <form
        className={`flex w-full items-center gap-2 rounded-full p-1.5 ${dark ? 'bg-white/10' : 'border-2 border-border bg-card'}`}
        onSubmit={async (e) => {
          e.preventDefault();
          setState('sending');
          const r = await submit({ type: 'newsletter', email, locale });
          if (r.ok) setState('ok'); else { setError(r.error); setState('error'); }
        }}
      >
        <input
          type="email"
          required
          placeholder={t.newsPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label={t.newsPlaceholder}
          className={`min-w-0 flex-1 bg-transparent py-2.5 ps-4 text-sm outline-none ${dark ? 'text-white placeholder:text-white/50' : 'placeholder:text-muted-foreground'}`}
        />
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="absolute h-0 w-0 opacity-0" aria-hidden="true" />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="shrink-0 rounded-full bg-coral px-5 py-2.5 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-white disabled:opacity-60"
        >
          {state === 'sending' ? t.newsSending : t.newsCta}
        </button>
      </form>
      {state === 'error' && (
        <p role="alert" className={`mt-2 text-xs ${dark ? 'text-white/70' : 'text-destructive'}`}>
          {error === 'email' ? dict.contact.errEmail : error === 'not_configured' ? t.newsErrSetup : t.newsErr}
        </p>
      )}
    </div>
  );
}

export function ContactForm({ dict, locale = 'en' }) {
  const t = dict.contact;
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const text = `${form.name}\n${form.email}\n\n${form.message}`;
  const field = 'mt-2 w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-coral';

  if (state === 'ok') {
    return (
      <div role="status" className="rounded-3xl border border-border bg-card p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage text-ink">
          <Mail className="h-6 w-6" strokeWidth={1.6} />
        </div>
        <h3 className="display-md mt-6">{t.ok}</h3>
      </div>
    );
  }

  return (
    <form
      className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('sending');
        const r = await submit({ type: 'contact', ...form, locale });
        if (r.ok) setState('ok'); else { setError(r.error); setState('error'); }
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="label-xs">{t.name}</span>
          <input id="cf-name" required autoComplete="name" value={form.name} onChange={set('name')} className={field} />
        </label>
        <label className="block">
          <span className="label-xs">{t.emailLabel}</span>
          <input id="cf-email" type="email" required autoComplete="email" dir="ltr" value={form.email} onChange={set('email')} className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label-xs">{t.message}</span>
          <textarea id="cf-msg" rows={5} required value={form.message} onChange={set('message')} className={`${field} resize-none`} />
        </label>
      </div>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="absolute h-0 w-0 opacity-0" aria-hidden="true" />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink py-4 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral disabled:opacity-60"
      >
        {state === 'sending' ? t.sending : t.send}
      </button>
      {state === 'error' && (
        <div role="alert" className="mt-4 rounded-2xl bg-blush/60 p-4 text-sm text-ink">
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
