import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; componentId: string }> },
) {
  const { spaceId, componentId } = await params
  return proxyResponse(await apiFetch(
    `/v1/spaces/${spaceId}/components/${componentId}/duplicate`,
    { method: 'POST' },
  ))
}
