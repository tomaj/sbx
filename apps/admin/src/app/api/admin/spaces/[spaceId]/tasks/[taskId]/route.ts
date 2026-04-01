import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ spaceId: string; taskId: string }> }) {
  const { spaceId, taskId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/tasks/${taskId}`))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ spaceId: string; taskId: string }> }) {
  const { spaceId, taskId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ task: body }),
  }))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ spaceId: string; taskId: string }> }) {
  const { spaceId, taskId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/tasks/${taskId}`, { method: 'DELETE' }))
}
