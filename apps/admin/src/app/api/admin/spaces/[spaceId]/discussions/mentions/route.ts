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
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params
  const token = await getSessionToken()
  const url = req.nextUrl
  const qs = new URLSearchParams()
  if (url.searchParams.get('page')) qs.set('page', url.searchParams.get('page')!)
  if (url.searchParams.get('per_page')) qs.set('per_page', url.searchParams.get('per_page')!)
  if (url.searchParams.get('by_status')) qs.set('by_status', url.searchParams.get('by_status')!)

  const res = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/mentioned_discussions/me${qs.toString() ? `?${qs}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
