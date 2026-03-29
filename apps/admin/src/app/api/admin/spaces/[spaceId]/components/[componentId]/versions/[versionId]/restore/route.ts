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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; componentId: string; versionId: string }> },
) {
  const { spaceId, componentId, versionId } = await params
  const token = await getSessionToken()
  const res = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/components/${componentId}/versions/${versionId}/restore`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
