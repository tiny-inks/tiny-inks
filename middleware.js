import { NextResponse } from 'next/server';

const LOCALES = ['en', 'ar'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  /* storefront: everything lives under /en or /ar */
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
