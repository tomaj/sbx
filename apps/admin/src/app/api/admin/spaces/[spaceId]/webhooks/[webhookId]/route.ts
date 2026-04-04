import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; webhookId: string }> },
) {
  const { spaceId, webhookId } = await params;
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/webhook_endpoints/${webhookId}`));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; webhookId: string }> },
) {
  const { spaceId, webhookId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/webhook_endpoints/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify({ webhook_endpoint: body }),
    }),
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; webhookId: string }> },
) {
  const { spaceId, webhookId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/webhook_endpoints/${webhookId}`, { method: 'DELETE' }),
  );
}
