import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; storyId: string }> },
) {
  const { spaceId, storyId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/stories/${storyId}${req.nextUrl.search}`))
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; storyId: string }> },
) {
  const { spaceId, storyId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/stories/${storyId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }))
}
