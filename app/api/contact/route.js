import { NextResponse } from 'next/server';

/* Contact + newsletter submissions. Real delivery, never a fake success:
   1. RESEND_API_KEY + CONTACT_TO_EMAIL → emailed via Resend's REST API
   2. FORMSPREE_FORM_ID              → forwarded to Formspree
   3. neither configured             → 503 and the form shows WhatsApp/email instead
   Server-only env vars (no NEXT_PUBLIC_ prefix) — set them in Vercel. */
export const runtime = 'nodejs';

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }); }

  /* honeypot: bots fill every field */
  if (clean(body.company, 10)) return NextResponse.json({ ok: true, delivered: 'ignored' });

  const type = body.type === 'newsletter' ? 'newsletter' : 'contact';
  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const message = clean(body.message, 4000);
  const locale = body.locale === 'ar' ? 'ar' : 'en';

  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: 'email' }, { status: 400 });
  if (type === 'contact' && (!name || !message)) return NextResponse.json({ ok: false, error: 'fields' }, { status: 400 });

  const subject = type === 'newsletter'
    ? `Newsletter signup — ${email}`
    : `Website message from ${name}`;
  const text = type === 'newsletter'
    ? `New newsletter subscriber: ${email}\nLanguage: ${locale}`
    : `Name: ${name}\nEmail: ${email}\nLanguage: ${locale}\n\n${message}`;

  const RESEND = process.env.RESEND_API_KEY;
  const TO = process.env.CONTACT_TO_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const FROM = process.env.CONTACT_FROM_EMAIL || 'Tiny Inks <onboarding@resend.dev>';
  if (RESEND && TO) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: email, subject, text }),
    });
    if (r.ok) return NextResponse.json({ ok: true, delivered: 'resend' });
    console.error('Resend failed', r.status, await r.text().catch(() => ''));
    return NextResponse.json({ ok: false, error: 'delivery' }, { status: 502 });
  }

  const FORMSPREE = process.env.FORMSPREE_FORM_ID;
  if (FORMSPREE) {
    const r = await fetch(`https://formspree.io/f/${FORMSPREE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name, email, message: text, _subject: subject, type }),
    });
    if (r.ok) return NextResponse.json({ ok: true, delivered: 'formspree' });
    console.error('Formspree failed', r.status);
    return NextResponse.json({ ok: false, error: 'delivery' }, { status: 502 });
  }

  /* not configured: say so honestly so the UI can offer WhatsApp / email */
  return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
}
