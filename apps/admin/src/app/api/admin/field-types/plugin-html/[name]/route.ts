import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'

async function getSessionToken() {
  const cookieStore = await cookies()
  return (
    cookieStore.get('better-auth.session_token')?.value ??
    cookieStore.get('__Secure-better-auth.session_token')?.value ??
    ''
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  const token = await getSessionToken()
  const theme = req.nextUrl.searchParams.get('theme') ?? 'light'

  // Forward all query params (uid, protocol, host, theme) to the backend
  const forwardParams = new URLSearchParams(req.nextUrl.searchParams)
  const res = await fetch(
    `${API_URL}/v1/field_types/${encodeURIComponent(name)}/get_html?${forwardParams.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  const html = await res.text()
  return new NextResponse(html, {
    status: res.status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
