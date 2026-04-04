import type { NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') ?? '';
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return proxyResponse(await apiFetch(`/v1/field_types${qs}`));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyResponse(
    await apiFetch(`/v1/field_types`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}
