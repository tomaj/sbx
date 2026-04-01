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
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string }> },
) {
  const { spaceId, discussionId } = await params
  const token = await getSessionToken()
  const res = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/discussions/${discussionId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string }> },
) {
  const { spaceId, discussionId } = await params
  const token = await getSessionToken()
  const body = await req.text()
  const res = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/discussions/${discussionId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
    },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; discussionId: string }> },
) {
  const { spaceId, discussionId } = await params
  const token = await getSessionToken()
  const res = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/discussions/${discussionId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
