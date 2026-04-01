import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyResponse(await apiFetch(`/v1/admin/users/${id}`, { method: 'DELETE' }))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }))
}
