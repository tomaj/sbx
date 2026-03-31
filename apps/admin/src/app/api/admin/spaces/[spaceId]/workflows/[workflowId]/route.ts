import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'

async function getSessionToken() {
  const cookieStore = await cookies()
  return (
    cookieStore.get('better-auth.session_token')?.value ??
    cookieStore.get('__Secure-better-auth.session_token')?.value ??
    ''
  )
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ spaceId: string; workflowId: string }> }) {
  const { spaceId, workflowId } = await params
  const token = await getSessionToken()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/workflows/${workflowId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ spaceId: string; workflowId: string }> }) {
  const { spaceId, workflowId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/workflows/${workflowId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow: { name: body.name, content_types: body.contentTypes, is_default: body.isDefault } }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ spaceId: string; workflowId: string }> }) {
  const { spaceId, workflowId } = await params
  const token = await getSessionToken()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/workflows/${workflowId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
