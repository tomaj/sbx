import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string }> },
) {
  const { spaceId, discussionId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/discussions/${discussionId}/comments`))
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string }> },
) {
  const { spaceId, discussionId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/discussions/${discussionId}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  }))
}
