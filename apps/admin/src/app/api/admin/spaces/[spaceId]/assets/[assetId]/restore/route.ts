import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; assetId: string }> },
) {
  const { spaceId, assetId } = await params
  return proxyResponse(await apiFetch(`/v1/admin/spaces/${spaceId}/assets/${assetId}/restore`, { method: 'POST' }))
}
