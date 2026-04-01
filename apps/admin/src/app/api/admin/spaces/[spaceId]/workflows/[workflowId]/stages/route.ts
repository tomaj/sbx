import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ spaceId: string; workflowId: string }> }) {
  const { spaceId, workflowId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/workflow_stages`, {
    method: 'POST',
    body: JSON.stringify({ workflow_stage: { ...body, workflow_id: parseInt(workflowId) } }),
  }))
}
