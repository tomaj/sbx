import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

type Params = { params: Promise<{ spaceId: string; datasourceId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { spaceId, datasourceId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/admin/spaces/${spaceId}/datasources/${datasourceId}/entries/reorder`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  );
}
