import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; componentId: string; versionId: string }> },
) {
  const { spaceId, componentId, versionId } = await params
  return proxyResponse(await apiFetch(
    `/v1/spaces/${spaceId}/components/${componentId}/component_versions/${versionId}`,
  ))
}
