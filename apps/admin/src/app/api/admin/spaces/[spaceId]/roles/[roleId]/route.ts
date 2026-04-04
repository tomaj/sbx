import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; roleId: string }> },
) {
  const { spaceId, roleId } = await params;
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/space_roles/${roleId}`));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; roleId: string }> },
) {
  const { spaceId, roleId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/space_roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({ space_role: body }),
    }),
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; roleId: string }> },
) {
  const { spaceId, roleId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/space_roles/${roleId}`, { method: 'DELETE' }),
  );
}
