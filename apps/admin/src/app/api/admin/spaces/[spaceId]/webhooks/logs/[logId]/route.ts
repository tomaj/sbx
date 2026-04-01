import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; logId: string }> },
) {
  const { spaceId, logId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/webhook_endpoints/logs/${logId}`))
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; logId: string }> },
) {
  const { spaceId, logId } = await params
  return proxyResponse(await apiFetch(
    `/v1/spaces/${spaceId}/webhook_endpoints/logs/${logId}/retry`,
    { method: 'POST' },
  ))
}
