import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; releaseId: string }> },
) {
  const { spaceId, releaseId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/releases/${releaseId}`))
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; releaseId: string }> },
) {
  const { spaceId, releaseId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/releases/${releaseId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; releaseId: string }> },
) {
  const { spaceId, releaseId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/releases/${releaseId}`, { method: 'DELETE' }))
}
