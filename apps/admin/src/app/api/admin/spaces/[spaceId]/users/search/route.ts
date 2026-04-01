import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params
  const q = req.nextUrl.searchParams.get('q') ?? ''
  return proxyResponse(await apiFetch(`/v1/admin/spaces/${spaceId}/users/search?q=${encodeURIComponent(q)}`))
}
