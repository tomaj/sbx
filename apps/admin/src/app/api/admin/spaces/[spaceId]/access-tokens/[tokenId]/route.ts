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
  { params }: { params: Promise<{ spaceId: string; tokenId: string }> },
) {
  const { spaceId, tokenId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/api_keys/${tokenId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: {
        name: body.name,
        token_type: body.access,
        branch_id: body.branchId,
        min_cache: body.minCache,
      },
    }),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; tokenId: string }> },
) {
  const { spaceId, tokenId } = await params
  const token = await getSessionToken()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/api_keys/${tokenId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
