import { NextResponse } from 'next/server';
import { env } from '@/env';

const IS_SECURE = env.NODE_ENV === 'production' || env.NEXT_PUBLIC_APP_URL.startsWith('https://');

export async function POST() {
  // CSRF is enforced by middleware.ts for all /api/admin/ routes
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set('sbx.session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_SECURE,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('sbx.refresh', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_SECURE,
    path: '/api/admin/auth',
    maxAge: 0,
  });
  return response;
}
