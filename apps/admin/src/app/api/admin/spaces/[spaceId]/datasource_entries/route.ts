import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

type Params = { params: Promise<{ spaceId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { spaceId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/datasource_entries${req.nextUrl.search}`))
}

export async function POST(req: NextRequest, { params }: Params) {
  const { spaceId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/datasource_entries`, {
    method: 'POST',
    body: JSON.stringify(body),
  }))
}
