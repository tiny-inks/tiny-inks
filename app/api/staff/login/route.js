import { NextResponse } from 'next/server';
import { staffPasswordOk, staffToken, STAFF_COOKIE, STAFF_PASSWORD_IS_DEMO, rateLimit, clientIp } from '@/lib/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* GET → is a demo password in use? (the login page shows a warning) */
export async function GET() {
  return NextResponse.json({ demoPassword: STAFF_PASSWORD_IS_DEMO });
}

/* POST { password } → httpOnly session cookie. The password itself never leaves the server.
   Only FAILED attempts count against the rate limit (10 wrong tries / 15 min / IP). */
export async function POST(req) {
  const ip = clientIp(req);
  const { password } = await req.json().catch(() => ({}));
  if (!staffPasswordOk(password)) {
    const rl = rateLimit(`login-fail:${ip}`, { max: 10, windowMs: 15 * 60 * 1000 });
    if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    return NextResponse.json({ ok: false, error: 'wrong_password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, staffToken(), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

/* DELETE → log out */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
