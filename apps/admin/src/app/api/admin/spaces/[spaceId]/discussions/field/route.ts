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

// POST: get or create a discussion for a specific field
// Admin UI sends { story_id, field_key }
// We first try to find an existing unsolved discussion via list, then create if not found
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  const storyId = body.story_id
  const fieldKey = body.field_key

  if (!storyId || !fieldKey) {
    return NextResponse.json({ error: 'story_id and field_key required' }, { status: 400 })
  }

  // Check existing unsolved discussions for this story
  const listRes = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/stories/${storyId}/discussions?by_status=unsolved&per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (listRes.ok) {
    const listData = await listRes.json()
    const existing = (listData.discussions ?? []).find(
      (d: any) => d.field_key === fieldKey || d.fieldname === fieldKey,
    )
    if (existing) {
      return NextResponse.json({ discussion: existing })
    }
  }

  // Create new discussion via MAPI
  const createRes = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/stories/${storyId}/discussions`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discussion: {
          fieldname: fieldKey,
          title: fieldKey,
        },
      }),
    },
  )
  const data = await createRes.json()
  return NextResponse.json(data, { status: createRes.status })
}
