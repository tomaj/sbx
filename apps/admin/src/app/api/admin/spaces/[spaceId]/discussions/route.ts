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
  const storyId = url.searchParams.get('story_id')

  if (!storyId) return NextResponse.json({ discussions: [] })

  const qs = new URLSearchParams()
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'story_id') qs.set(key, value)
  }

  const res = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/stories/${storyId}/discussions?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  const storyId = body.story_id
  if (!storyId) return NextResponse.json({ error: 'story_id required' }, { status: 400 })

  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/stories/${storyId}/discussions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ discussion: body.discussion }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
