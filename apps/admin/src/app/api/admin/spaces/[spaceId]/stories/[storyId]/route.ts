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
  { params }: { params: Promise<{ spaceId: string; storyId: string }> },
) {
  const { spaceId, storyId } = await params
  const token = await getSessionToken()
  const releaseId = req.nextUrl.searchParams.get('release_id')
  const url = releaseId
    ? `${API_URL}/v1/spaces/${spaceId}/stories/${storyId}?release_id=${releaseId}`
    : `${API_URL}/v1/spaces/${spaceId}/stories/${storyId}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; storyId: string }> },
) {
  const { spaceId, storyId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/stories/${storyId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
