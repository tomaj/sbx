import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { OrgSpacesClient } from './client'

export const metadata: Metadata = { title: 'Spaces' }

async function getSpaces(sessionToken: string) {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3000'
  const res = await fetch(`${apiUrl}/v1/admin/spaces`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.spaces ?? []
}

export default async function OrgSpacesPage() {
  const cookieStore = await cookies()
  const sessionToken =
    cookieStore.get('better-auth.session_token')?.value ??
    cookieStore.get('__Secure-better-auth.session_token')?.value ??
    ''

  const spaces = await getSpaces(sessionToken)

  return <OrgSpacesClient spaces={spaces} />
}
