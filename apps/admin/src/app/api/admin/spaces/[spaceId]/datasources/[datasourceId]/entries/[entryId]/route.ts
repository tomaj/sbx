import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

type Params = { params: Promise<{ spaceId: string; datasourceId: string; entryId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { spaceId, entryId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/datasource_entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify({ datasource_entry: body }),
    }),
  );
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { spaceId, entryId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/datasource_entries/${entryId}`, { method: 'DELETE' }),
  );
}
