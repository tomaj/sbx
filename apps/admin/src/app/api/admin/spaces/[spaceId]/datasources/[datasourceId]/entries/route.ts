import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

type Params = { params: Promise<{ spaceId: string; datasourceId: string }> }

// Legacy route kept for backwards compatibility with reorder endpoint
// New code should use /api/admin/spaces/[spaceId]/datasource_entries instead

export async function POST(req: NextRequest, { params }: Params) {
  const { spaceId, datasourceId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/datasource_entries`, {
    method: 'POST',
    body: JSON.stringify({
      datasource_entry: { name: body.name, value: body.value, datasource_id: parseInt(datasourceId) },
    }),
  }))
}
