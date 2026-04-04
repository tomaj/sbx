import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; componentId: string }> },
) {
  const { spaceId, componentId } = await params;
  const search = req.nextUrl.searchParams.toString();
  return proxyResponse(
    await apiFetch(
      `/v1/spaces/${spaceId}/versions?model=components&model_id=${componentId}${search ? `&${search}` : ''}`,
    ),
  );
}
