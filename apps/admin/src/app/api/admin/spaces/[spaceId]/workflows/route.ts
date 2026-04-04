import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/workflows`));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/spaces/${spaceId}/workflows`, {
      method: 'POST',
      body: JSON.stringify({
        workflow: { name: body.name, content_types: body.contentTypes, is_default: body.isDefault },
      }),
    }),
  );
}
