import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; tagId: string }> },
) {
  const { spaceId, tagId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/internal_tags/${tagId}`, {
    method: 'PUT',
    body: JSON.stringify({ internal_tag: body }),
  }))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; tagId: string }> },
) {
  const { spaceId, tagId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/internal_tags/${tagId}`, { method: 'DELETE' }))
}
