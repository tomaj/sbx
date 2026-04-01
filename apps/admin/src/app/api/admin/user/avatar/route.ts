import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const body = new FormData()
  const file = formData.get('file')
  if (file) body.append('file', file)

  return proxyResponse(await apiFetch(`/v1/user/me/avatar`, {
    method: 'POST',
    body,
  }))
}
