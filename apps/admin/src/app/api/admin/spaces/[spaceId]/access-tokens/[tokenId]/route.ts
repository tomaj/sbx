import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; tokenId: string }> },
) {
  const { spaceId, tokenId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/api_keys/${tokenId}`, {
      method: 'PUT',
      body: JSON.stringify({
        api_key: {
          name: body.name,
          access: body.access,
          branch_id: body.branchId,
          min_cache: body.minCache,
        },
      }),
    }),
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; tokenId: string }> },
) {
  const { spaceId, tokenId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/api_keys/${tokenId}`, { method: 'DELETE' }),
  );
}
