import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params
  const formData = await req.formData()

  // Forward multipart form data to backend
  return proxyResponse(await apiFetch(`/v1/admin/spaces/${spaceId}/assets/upload`, {
    method: 'POST',
    body: formData,
  }))
}
