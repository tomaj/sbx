import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; groupId: string }> },
) {
  const { spaceId, groupId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/component_groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify({ component_group: body }),
    }),
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; groupId: string }> },
) {
  const { spaceId, groupId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/component_groups/${groupId}`, { method: 'DELETE' }),
  );
}
