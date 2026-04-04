import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fieldTypeId: string }> },
) {
  const { fieldTypeId } = await params;
  return proxyResponse(await apiFetch(`/v1/field_types/${fieldTypeId}`));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ fieldTypeId: string }> },
) {
  const { fieldTypeId } = await params;
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/field_types/${fieldTypeId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fieldTypeId: string }> },
) {
  const { fieldTypeId } = await params;
  return proxyResponse(await apiFetch(`/v1/field_types/${fieldTypeId}`, { method: 'DELETE' }));
}
