import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  const url = req.nextUrl;
  const qs = new URLSearchParams();
  if (url.searchParams.get('page')) qs.set('page', url.searchParams.get('page')!);
  if (url.searchParams.get('per_page')) qs.set('per_page', url.searchParams.get('per_page')!);
  if (url.searchParams.get('by_status')) qs.set('by_status', url.searchParams.get('by_status')!);

  return proxyResponse(
    await apiFetch(
      `/v1/spaces/${spaceId}/mentioned_discussions/me${qs.toString() ? `?${qs}` : ''}`,
    ),
  );
}
