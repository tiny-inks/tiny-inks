import { NextResponse } from 'next/server';

const LOCALES = ['en', 'ar'];
const STAFF_COOKIE = 'ti_staff';

/* Same derivation as lib/print-server.js staffToken(): HMAC-SHA256(secret, 'staff-session-v1'), base64url */
async function expectedStaffToken() {
  const secret = process.env.PRINT_SIGNING_SECRET || process.env.STAFF_SESSION_SECRET || 'tiny-inks-dev-secret-change-me';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('staff-session-v1'));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  /* ---- staff app + staff API: shared-password session cookie ---- */
  if (pathname.startsWith('/staff') || pathname.startsWith('/api/staff')) {
    const open = pathname === '/staff/login' || pathname === '/api/staff/login' || /\.[a-z0-9]+$/i.test(pathname); // login + static files (manifest, icons)
    if (open) return NextResponse.next();
    const token = request.cookies.get(STAFF_COOKIE)?.value || '';
    const ok = token && token === (await expectedStaffToken());
    if (ok) return NextResponse.next();
    if (pathname.startsWith('/api/')) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = '/staff/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  /* ---- storefront: everything lives under /en or /ar ---- */
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/staff/:path*', '/api/staff/:path*', '/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
