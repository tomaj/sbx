import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET() {
  return proxyResponse(await apiFetch(`/v1/admin/me/tokens`))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/admin/me/tokens`, {
    method: 'POST',
    body: JSON.stringify(body),
  }))
}
