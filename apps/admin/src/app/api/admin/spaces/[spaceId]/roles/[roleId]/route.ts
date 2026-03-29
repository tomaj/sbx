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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; roleId: string }> },
) {
  const { spaceId, roleId } = await params
  const token = await getSessionToken()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/space_roles/${roleId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; roleId: string }> },
) {
  const { spaceId, roleId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/space_roles/${roleId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ space_role: body }),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; roleId: string }> },
) {
  const { spaceId, roleId } = await params
  const token = await getSessionToken()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/space_roles/${roleId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
