import { NextResponse, type NextRequest } from 'next/server';
import { apiFetch, proxyResponse } from '@/lib/api-server';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB — matches NestJS Multer limit

export async function POST(req: NextRequest, { params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;

  // Early rejection before buffering the body — Content-Length check
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large (max 100 MB)' }, { status: 413 });
  }

  const formData = await req.formData();

  // Forward multipart form data to backend
  return proxyResponse(
    await apiFetch(`/v1/admin/spaces/${spaceId}/assets/upload`, {
      method: 'POST',
      body: formData,
    }),
  );
}
