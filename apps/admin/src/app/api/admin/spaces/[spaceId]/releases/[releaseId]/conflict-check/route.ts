import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; releaseId: string }> },
) {
  const { spaceId, releaseId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/releases/${releaseId}/conflict_check`),
  );
}
