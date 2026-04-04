import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; configId: string }> },
) {
  const { spaceId, configId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/ai_configurations/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; configId: string }> },
) {
  const { spaceId, configId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/ai_configurations/${configId}`, { method: 'DELETE' }),
  );
}
