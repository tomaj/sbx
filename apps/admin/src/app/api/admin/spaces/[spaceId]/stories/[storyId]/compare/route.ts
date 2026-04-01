import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; storyId: string }> },
) {
  const { spaceId, storyId } = await params
  return proxyResponse(await apiFetch(
    `/v1/spaces/${spaceId}/stories/${storyId}/compare${req.nextUrl.search}`,
  ))
}
