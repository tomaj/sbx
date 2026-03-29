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

export async function POST(req: NextRequest, { params }: { params: Promise<{ spaceId: string; workflowId: string }> }) {
  const { spaceId, workflowId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/workflow_stages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_stage: { ...body, workflow_id: parseInt(workflowId) } }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
