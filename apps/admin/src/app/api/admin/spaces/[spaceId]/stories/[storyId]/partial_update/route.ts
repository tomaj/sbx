import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; storyId: string }> },
) {
  const { spaceId, storyId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/stories/${storyId}/partial_update`, {
    method: 'POST',
    body: JSON.stringify(body),
  }))
}
