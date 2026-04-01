import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(req: NextRequest) {
  return proxyResponse(await apiFetch(`/v1/admin/users${req.nextUrl.search}`))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/admin/users`, {
    method: 'POST',
    body: JSON.stringify(body),
  }))
}
