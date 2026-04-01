import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/webhook_endpoints/logs${req.nextUrl.search}`))
}
