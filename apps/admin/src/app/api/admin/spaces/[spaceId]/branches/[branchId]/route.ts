import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; branchId: string }> },
) {
  const { spaceId, branchId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/branches/${branchId}`, {
      method: 'PUT',
      body: JSON.stringify({ branch: body }),
    }),
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; branchId: string }> },
) {
  const { spaceId, branchId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/branches/${branchId}`, { method: 'DELETE' }),
  );
}
