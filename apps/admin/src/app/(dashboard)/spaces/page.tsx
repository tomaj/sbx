import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SpacesGrid } from '@/components/spaces/spaces-grid'

export const metadata: Metadata = { title: 'Spaces' }

async function getSpaces(sessionToken: string) {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3000'
  const res = await fetch(`${apiUrl}/v1/admin/spaces`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
    cache: 'no-store',
  })
  if (res.status === 401) return null
  if (!res.ok) return []
  const data = await res.json()
  return data.spaces ?? []
}

export default async function SpacesPage() {
  const cookieStore = await cookies()
  const sessionToken =
    cookieStore.get('better-auth.session_token')?.value ??
    cookieStore.get('__Secure-better-auth.session_token')?.value ??
    ''

  const spaces = await getSpaces(sessionToken)

  if (spaces === null) redirect('/login')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Spaces</h1>
      <SpacesGrid spaces={spaces} />
    </div>
  )
}
