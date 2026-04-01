import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string; commentId: string }> },
) {
  const { spaceId, discussionId, commentId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(
    `/v1/spaces/${spaceId}/discussions/${discussionId}/comments/${commentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  ))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string; commentId: string }> },
) {
  const { spaceId, discussionId, commentId } = await params
  return proxyResponse(await apiFetch(
    `/v1/spaces/${spaceId}/discussions/${discussionId}/comments/${commentId}`,
    { method: 'DELETE' },
  ))
}
