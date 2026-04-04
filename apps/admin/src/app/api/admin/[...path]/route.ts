/**
 * Catch-all proxy route handler.
 *
 * Maps admin UI API requests to the NestJS MAPI backend:
 *   /api/admin/<path> -> /v1/<path>        (default)
 *   /api/admin/spaces (no sub-path) -> /v1/admin/spaces
 *   /api/admin/users/... -> /v1/admin/users/...
 *
 * Routes with custom body transformation, URL remapping, or multipart
 * uploads are kept as specific route files (Next.js matches them first).
 */
import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

/** Top-level admin paths that map to /v1/admin/... instead of /v1/... */
const ADMIN_PREFIXED = new Set(['spaces', 'users'])

function buildApiPath(segments: string[]): string {
  const first = segments[0]

  // /api/admin/spaces (no spaceId sub-path) -> /v1/admin/spaces
  // /api/admin/spaces/123/... -> /v1/spaces/123/...
  // /api/admin/users/... -> /v1/admin/users/...
  if (ADMIN_PREFIXED.has(first)) {
    // "spaces" with a spaceId sub-resource -> /v1/spaces/...
    if (first === 'spaces' && segments.length > 1) {
      return `/v1/${segments.join('/')}`
    }
    // "spaces" alone or "users" -> /v1/admin/...
    return `/v1/admin/${segments.join('/')}`
  }

  // Everything else: /api/admin/X -> /v1/X
  return `/v1/${segments.join('/')}`
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const apiPath = `${buildApiPath(path)}${req.nextUrl.search}`
  const method = req.method

  if (method === 'GET' || method === 'HEAD') {
    return proxyResponse(await apiFetch(apiPath, { method }))
  }

  // For mutation methods, forward the JSON body if present
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    // Forward multipart as FormData (assets/upload, avatar, etc.)
    const formData = await req.formData()
    return proxyResponse(await apiFetch(apiPath, { method, body: formData }))
  }

  // Try to read JSON body; some POST/PUT/DELETE have no body
  let body: string | undefined
  try {
    const text = await req.text()
    if (text) body = text
  } catch {
    // no body
  }

  return proxyResponse(await apiFetch(apiPath, {
    method,
    ...(body !== undefined && { body }),
  }))
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
