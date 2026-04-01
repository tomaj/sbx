import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; assetId: string }> },
) {
  const { spaceId, assetId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/assets/${assetId}`))
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; assetId: string }> },
) {
  const { spaceId, assetId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/admin/spaces/${spaceId}/assets/${assetId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; assetId: string }> },
) {
  const { spaceId, assetId } = await params
  return proxyResponse(await apiFetch(`/v1/admin/spaces/${spaceId}/assets/${assetId}`, { method: 'DELETE' }))
}
