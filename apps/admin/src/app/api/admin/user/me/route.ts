import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET() {
  return proxyResponse(await apiFetch(`/v1/user/me`))
}

export async function PATCH(req: Request) {
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/user/me`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }))
}
