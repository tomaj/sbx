import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; workflowId: string }> },
) {
  const { spaceId, workflowId } = await params;
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/workflows/${workflowId}`));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; workflowId: string }> },
) {
  const { spaceId, workflowId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify({
        workflow: { name: body.name, content_types: body.contentTypes, is_default: body.isDefault },
      }),
    }),
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; workflowId: string }> },
) {
  const { spaceId, workflowId } = await params;
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/workflows/${workflowId}`, { method: 'DELETE' }),
  );
}
