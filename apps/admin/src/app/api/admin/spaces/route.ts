import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET() {
  return proxyResponse(await apiFetch(`/v1/admin/spaces`))
}

export async function POST(req: Request) {
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/admin/spaces`, {
    method: 'POST',
    body: JSON.stringify(body),
  }))
}
