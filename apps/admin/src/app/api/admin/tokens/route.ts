import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getSessionToken() {
  const cookieStore = await cookies()
  return (
    cookieStore.get('better-auth.session_token')?.value ??
    cookieStore.get('__Secure-better-auth.session_token')?.value ??
    ''
  )
}

const API_URL = process.env.API_URL ?? 'http://localhost:3000'

export async function GET() {
  const token = await getSessionToken()
  const res = await fetch(`${API_URL}/v1/admin/me/tokens`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const token = await getSessionToken()
  const body = await req.json()
  const res = await fetch(`${API_URL}/v1/admin/me/tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
