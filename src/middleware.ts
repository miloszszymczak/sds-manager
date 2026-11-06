import { NextResponse, type NextRequest } from 'next/server';

/**
 * Wstępna bramka: bez ciasteczka sesji → /login. Właściwa weryfikacja sesji
 * (baza, rola, aktywność konta) odbywa się w każdej stronie i akcji (requireUser).
 */
export function middleware(req: NextRequest) {
  if (req.cookies.has('sds_session')) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = req.nextUrl.pathname === '/' ? '' : `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login|api/health|_next/static|_next/image|favicon.ico).*)'],
};
