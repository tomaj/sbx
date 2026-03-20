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

export async function GET(req: NextRequest) {
  const token = await getSessionToken()
  const { searchParams } = req.nextUrl
  const spaceId = searchParams.get('spaceId')
  if (!spaceId) return NextResponse.json({ error: 'spaceId required' }, { status: 400 })

  const params = new URLSearchParams()
  for (const [key, value] of searchParams) {
    if (key !== 'spaceId') params.set(key, value)
  }

  const res = await fetch(`${API_URL}/v1/admin/spaces/${spaceId}/activities?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
