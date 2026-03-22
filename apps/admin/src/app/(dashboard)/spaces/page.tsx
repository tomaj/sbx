import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { SpaceCard } from '@/components/spaces/space-card'
import { Plus } from 'lucide-react'

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

export default async function SpacesPage() {
  const cookieStore = await cookies()
  const sessionToken =
    cookieStore.get('better-auth.session_token')?.value ??
    cookieStore.get('__Secure-better-auth.session_token')?.value ??
    ''

  const spaces = await getSpaces(sessionToken)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Spaces</h1>
        <button className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
          <Plus className="size-4" />
          Add Space
        </button>
      </div>

      {spaces.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No spaces yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space: any) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}
    </div>
  )
}
