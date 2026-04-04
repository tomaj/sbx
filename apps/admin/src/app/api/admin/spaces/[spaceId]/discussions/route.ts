import { type NextRequest, NextResponse } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  const url = req.nextUrl;
  const storyId = url.searchParams.get('story_id');

  if (!storyId) return NextResponse.json({ discussions: [] });

  const qs = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'story_id') qs.set(key, value);
  }

  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/stories/${storyId}/discussions?${qs}`),
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  const body = await req.json();
  const storyId = body.story_id;
  if (!storyId) return NextResponse.json({ error: 'story_id required' }, { status: 400 });

  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/stories/${storyId}/discussions`, {
      method: 'POST',
      body: JSON.stringify({ discussion: body.discussion }),
    }),
  );
}
