import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ spaceId: string; taskId: string }> }) {
  const { spaceId, taskId } = await params
  const body = await req.json().catch(() => ({}))
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/tasks/${taskId}/execute`, {
    method: 'POST',
    body: JSON.stringify(body),
  }))
}
