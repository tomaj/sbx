import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Space Settings' }

export default async function Page({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params
  redirect(`/spaces/${spaceId}/settings/space`)
}
