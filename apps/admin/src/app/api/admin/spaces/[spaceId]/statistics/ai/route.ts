import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  const period = req.nextUrl.searchParams.get('period') ?? 'last_14_days';
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/statistics/ai?period=${period}`));
}
