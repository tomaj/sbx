import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; componentId: string }> },
) {
  const { spaceId, componentId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/components/${componentId}`))
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; componentId: string }> },
) {
  const { spaceId, componentId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/components/${componentId}`, {
    method: 'PUT',
    body: JSON.stringify({ component: body }),
  }))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; componentId: string }> },
) {
  const { spaceId, componentId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/components/${componentId}`, { method: 'DELETE' }))
}
