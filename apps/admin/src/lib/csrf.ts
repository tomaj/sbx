import 'server-only';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

/** CSRF protection: verify Origin/Referer header on state-changing requests */
export function verifyCsrf(req: NextRequest): NextResponse | null {
  const method = req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;

  const allowedOrigin = new URL(env.NEXT_PUBLIC_APP_URL).origin;
  const allowed = new Set([allowedOrigin, 'http://localhost:3001']);

  // Check Origin header first (sent by browsers on all fetch() requests)
  const origin = req.headers.get('origin');
  if (origin) {
    return allowed.has(origin)
      ? null
      : NextResponse.json({ error: 'CSRF: invalid origin' }, { status: 403 });
  }

  // Fallback to Referer for same-origin requests that may omit Origin
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      return allowed.has(refOrigin)
        ? null
        : NextResponse.json({ error: 'CSRF: invalid referer' }, { status: 403 });
    } catch {
      return NextResponse.json({ error: 'CSRF: malformed referer' }, { status: 403 });
    }
  }

  // No Origin or Referer — reject (could be cross-origin attack)
  return NextResponse.json({ error: 'CSRF: missing origin' }, { status: 403 });
}
