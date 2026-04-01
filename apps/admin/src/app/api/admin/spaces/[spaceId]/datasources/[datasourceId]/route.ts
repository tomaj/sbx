import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

type Params = { params: Promise<{ spaceId: string; datasourceId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { spaceId, datasourceId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/datasources/${datasourceId}`))
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { spaceId, datasourceId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/datasources/${datasourceId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }))
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { spaceId, datasourceId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/datasources/${datasourceId}`, { method: 'DELETE' }))
}
