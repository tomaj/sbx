/**
 * Server-only API client for admin route handlers.
 * Wraps fetch with session token auth and proxies to the NestJS API.
 *
 * Usage in route handlers:
 *   import { apiFetch, proxyResponse } from '@/lib/api-server'
 *
 *   export async function GET(req, { params }) {
 *     const { spaceId } = await params
 *     return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/stories${req.nextUrl.search}`))
 *   }
 */
import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'

/** Extract the better-auth session token from request cookies. */
export async function getSessionToken(): Promise<string> {
  const cookieStore = await cookies()
  return (
    cookieStore.get('better-auth.session_token')?.value ??
    cookieStore.get('__Secure-better-auth.session_token')?.value ??
    ''
  )
}

/**
 * Authenticated fetch to the NestJS API.
 * Automatically adds Authorization header and Content-Type: application/json when body is present.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getSessionToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string>),
  }
  if (init.body !== undefined && init.body !== null) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(`${API_URL}${path}`, { ...init, headers })
}

/**
 * Convert a raw fetch Response into a NextResponse, forwarding status and
 * pagination headers (total, per-page).
 *
 * Handles:
 * - 204 No Content (empty body)
 * - text/html responses (field-type plugin HTML)
 * - JSON responses (everything else)
 */
export async function proxyResponse(res: Response): Promise<NextResponse> {
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('text/html')) {
    const html = await res.text()
    return new NextResponse(html, {
      status: res.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const data = await res.json().catch(() => ({}))

  // Forward pagination headers set by MAPI (story_versions, etc.)
  const headers: Record<string, string> = {}
  for (const h of ['total', 'per-page']) {
    const v = res.headers.get(h)
    if (v !== null) headers[h] = v
  }

  return NextResponse.json(data, { status: res.status, headers })
}
