import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; folderId: string }> },
) {
  const { spaceId, folderId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/asset_folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify({ asset_folder: body }),
    }),
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; folderId: string }> },
) {
  const { spaceId, folderId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/asset_folders/${folderId}`, { method: 'DELETE' }),
  );
}
