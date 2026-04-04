import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
