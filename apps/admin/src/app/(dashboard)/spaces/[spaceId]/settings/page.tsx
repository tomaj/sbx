import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params
  redirect(`/spaces/${spaceId}/settings/space`)
}
