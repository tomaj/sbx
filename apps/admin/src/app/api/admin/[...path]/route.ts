/**
 * Catch-all proxy route handler.
 *
 * Maps admin UI API requests to the NestJS MAPI backend:
 *   /api/admin/<path>       -> /v1/<path>          (default, including spaces)
 *   /api/admin/users/...    -> /v1/admin/users/...  (org-level user management)
 *
 * Routes with custom body transformation, URL remapping, or multipart
 * uploads are kept as specific route files (Next.js matches them first).
 */
import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

function buildApiPath(segments: string[]): string {
  // /api/admin/users/... -> /v1/admin/users/...  (no MAPI equivalent)
  if (segments[0] === 'users') {
    return `/v1/admin/${segments.join('/')}`;
  }

  // Everything else: /api/admin/X -> /v1/X
  return `/v1/${segments.join('/')}`;
}

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // CSRF is enforced by middleware.ts for all /api/admin/ routes
  const { path } = await params;
  const apiPath = `${buildApiPath(path)}${req.nextUrl.search}`;
  const method = req.method;

  if (method === 'GET' || method === 'HEAD') {
    return proxyResponse(await apiFetch(apiPath, { method }));
  }

  // For mutation methods, forward the JSON body if present
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    // Forward multipart as FormData (assets/upload, avatar, etc.)
    const formData = await req.formData();
    return proxyResponse(await apiFetch(apiPath, { method, body: formData }));
  }

  // Try to read JSON body; some POST/PUT/DELETE have no body
  let body: string | undefined;
  try {
    const text = await req.text();
    if (text) body = text;
  } catch {
    // no body
  }

  return proxyResponse(
    await apiFetch(apiPath, {
      method,
      ...(body !== undefined && { body }),
    }),
  );
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
