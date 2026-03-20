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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = await getSessionToken()
  const res = await fetch(`${API_URL}/v1/admin/me/tokens/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json(data)
}
