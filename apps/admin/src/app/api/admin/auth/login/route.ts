import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

const API_URL = env.API_URL;
// Mark cookies as Secure if we're in production OR if the app is served over HTTPS (e.g. staging with NODE_ENV=development)
const IS_SECURE = env.NODE_ENV === 'production' || env.NEXT_PUBLIC_APP_URL.startsWith('https://');

export async function POST(req: NextRequest) {
  // CSRF is enforced by middleware.ts for all /api/admin/ routes
  const body = await req.json().catch(() => ({}));

  const apiRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await apiRes.json().catch(() => ({}));

  if (!apiRes.ok) {
    return NextResponse.json(data, { status: apiRes.status });
  }

  const { access_token, refresh_token, user } = data as {
    access_token: string;
    refresh_token: string;
    user: Record<string, unknown>;
  };

  const response = NextResponse.json({ user }, { status: 200 });
  response.cookies.set('sbx.session', access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_SECURE,
    path: '/',
    maxAge: 2 * 60 * 60, // 2 hours — matches JWT access token expiry
  });
  response.cookies.set('sbx.refresh', refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_SECURE,
    path: '/api/admin/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  return response;
}
