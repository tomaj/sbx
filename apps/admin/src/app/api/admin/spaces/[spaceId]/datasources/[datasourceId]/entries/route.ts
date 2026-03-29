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

type Params = { params: Promise<{ spaceId: string; datasourceId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { spaceId, datasourceId } = await params
  const token = await getSessionToken()
  const searchParams = req.nextUrl.searchParams
  const page = searchParams.get('page') ?? '1'
  const perPage = searchParams.get('per_page') ?? '25'
  const search = searchParams.get('search')
  const qs = new URLSearchParams({ datasource_id: datasourceId, page, per_page: perPage })
  if (search) qs.set('search', search)
  const res = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/datasource_entries?${qs.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { spaceId, datasourceId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  const res = await fetch(
    `${API_URL}/v1/spaces/${spaceId}/datasource_entries`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasource_entry: { name: body.name, value: body.value, datasource_id: parseInt(datasourceId) } }),
    },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
