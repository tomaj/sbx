import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string }> },
) {
  const { spaceId, discussionId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/discussions/${discussionId}`))
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string }> },
) {
  const { spaceId, discussionId } = await params
  const body = await req.text()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/discussions/${discussionId}`, {
    method: 'PUT',
    body,
  }))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string }> },
) {
  const { spaceId, discussionId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/discussions/${discussionId}`, { method: 'DELETE' }))
}
