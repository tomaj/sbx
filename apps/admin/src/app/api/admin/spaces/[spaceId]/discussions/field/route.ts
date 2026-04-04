import { type NextRequest, NextResponse } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

// POST: get or create a discussion for a specific field
// Admin UI sends { story_id, field_key }
// We first try to find an existing unsolved discussion via list, then create if not found
export async function POST(req: NextRequest, { params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  const body = await req.json();
  const storyId = body.story_id;
  const fieldKey = body.field_key;

  if (!storyId || !fieldKey) {
    return NextResponse.json({ error: 'story_id and field_key required' }, { status: 400 });
  }

  // Check existing unsolved discussions for this story
  const listRes = await apiFetch(
    `/v1/spaces/${spaceId}/stories/${storyId}/discussions?by_status=unsolved&per_page=100`,
  );
  if (listRes.ok) {
    const listData = await listRes.json();
    const existing = (listData.discussions ?? []).find(
      (d: any) => d.field_key === fieldKey || d.fieldname === fieldKey,
    );
    if (existing) {
      return NextResponse.json({ discussion: existing });
    }
  }

  // Create new discussion via MAPI
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/stories/${storyId}/discussions`, {
      method: 'POST',
      body: JSON.stringify({
        discussion: {
          fieldname: fieldKey,
          title: fieldKey,
        },
      }),
    }),
  );
}
