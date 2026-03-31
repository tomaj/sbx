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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { spaceId, memberId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/collaborators/${memberId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collaborator: {
        role: body.role,
        space_role_id: body.spaceRoleId,
        space_role_ids: body.spaceRoleIds,
      },
    }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { spaceId, memberId } = await params
  const token = await getSessionToken()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/collaborators/${memberId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
