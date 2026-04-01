import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; assetId: string }> },
) {
  const { spaceId, assetId } = await params
  const formData = await req.formData()
  return proxyResponse(await apiFetch(`/v1/admin/spaces/${spaceId}/assets/${assetId}/replace`, {
    method: 'POST',
    body: formData,
  }))
}
