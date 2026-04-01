import { NextRequest, NextResponse } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const spaceId = searchParams.get('spaceId')
  if (!spaceId) return NextResponse.json({ error: 'spaceId required' }, { status: 400 })

  const params = new URLSearchParams()
  for (const [key, value] of searchParams) {
    if (key !== 'spaceId') params.set(key, value)
  }

  return proxyResponse(await apiFetch(`/v1/admin/spaces/${spaceId}/activities?${params}`))
}
