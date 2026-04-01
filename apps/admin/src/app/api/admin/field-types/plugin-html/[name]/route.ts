import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  // Forward all query params (uid, protocol, host, theme) to the backend
  return proxyResponse(await apiFetch(`/v1/field_types/${encodeURIComponent(name)}/get_html${req.nextUrl.search}`))
}
