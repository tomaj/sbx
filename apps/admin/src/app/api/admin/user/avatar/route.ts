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

export async function POST(req: NextRequest) {
  const token = await getSessionToken()
  const formData = await req.formData()

  const body = new FormData()
  const file = formData.get('file')
  if (file) body.append('file', file)

  const res = await fetch(`${API_URL}/v1/user/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
