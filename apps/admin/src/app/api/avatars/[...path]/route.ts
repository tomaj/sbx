import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

const API_URL = env.API_URL;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const res = await fetch(`${API_URL}/avatars/${path.join('/')}`);
  if (!res.ok) return new NextResponse(null, { status: 404 });

  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
