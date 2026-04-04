import { type NextRequest, NextResponse } from 'next/server';

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
  : 'http://localhost:3001';

const ALLOWED_ORIGINS = new Set([APP_ORIGIN, 'http://localhost:3001']);

/** CSRF protection: verify Origin/Referer on state-changing API requests */
function verifyCsrf(req: NextRequest): NextResponse | null {
  const method = req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;

  const origin = req.headers.get('origin');
  if (origin) {
    return ALLOWED_ORIGINS.has(origin)
      ? null
      : NextResponse.json({ error: 'CSRF: invalid origin' }, { status: 403 });
  }

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return ALLOWED_ORIGINS.has(new URL(referer).origin)
        ? null
        : NextResponse.json({ error: 'CSRF: invalid referer' }, { status: 403 });
    } catch {
      return NextResponse.json({ error: 'CSRF: malformed referer' }, { status: 403 });
    }
  }

  return NextResponse.json({ error: 'CSRF: missing origin' }, { status: 403 });
}

export function proxy(request: NextRequest) {
  // CSRF protection for admin API mutation requests
  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    const csrfError = verifyCsrf(request);
    if (csrfError) return csrfError;
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('sbx.session');

  const isLoggedIn = !!sessionCookie;
  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/spaces', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
