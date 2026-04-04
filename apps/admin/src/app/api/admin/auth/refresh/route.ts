import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/env';

const API_URL = env.API_URL;
const IS_SECURE = env.NODE_ENV === 'production' || env.NEXT_PUBLIC_APP_URL.startsWith('https://');

export async function POST() {
  // CSRF is enforced by middleware.ts for all /api/admin/ routes
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('sbx.refresh')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const apiRes = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${refreshToken}` },
  });

  if (!apiRes.ok) {
    const response = NextResponse.json({ error: 'Session expired' }, { status: 401 });
    response.cookies.delete('sbx.session');
    response.cookies.delete('sbx.refresh');
    return response;
  }

  const { access_token, refresh_token } = (await apiRes.json()) as {
    access_token: string;
    refresh_token: string;
  };

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set('sbx.session', access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_SECURE,
    path: '/',
    maxAge: 2 * 60 * 60,
  });
  response.cookies.set('sbx.refresh', refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_SECURE,
    path: '/api/admin/auth',
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
