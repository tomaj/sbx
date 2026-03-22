'use client'

import { use, useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { StoryEditor } from '@/components/story-editor'
import type { ComponentMeta, ComponentGroup, StoryDetail } from '@/components/story-editor/types'

interface PageProps {
  params: Promise<{ spaceId: string; storyId: string }>
}

interface StoryData {
  story: StoryDetail
  component_schema: Record<string, any> | null
  all_components: ComponentMeta[]
  all_groups: ComponentGroup[]
}

interface SpaceSettings {
  domain: string
  previewUrls: { name: string; location: string }[]
  mobileWidth: number
  previewToken: string
  publicToken: string
}

export default function StoryDetailPage({ params }: PageProps) {
  const { spaceId, storyId } = use(params)
  const [data, setData] = useState<StoryData | null>(null)
  const [spaceSettings, setSpaceSettings] = useState<SpaceSettings | null>(null)
  const [notFoundError, setNotFoundError] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/spaces/${spaceId}/stories/${storyId}`)
      .then((res) => {
        if (res.status === 404) { setNotFoundError(true); return null }
        if (!res.ok) throw new Error('Failed to load story')
        return res.json()
      })
      .then((d) => { if (d) setData(d) })
      .catch(() => setNotFoundError(true))
  }, [spaceId, storyId])

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/spaces/${spaceId}/space`).then((r) => r.json()),
      fetch(`/api/admin/spaces/${spaceId}/access-tokens`).then((r) => r.json()),
    ])
      .then(([spaceData, tokensData]) => {
        const tokens: { access: string; token: string }[] = tokensData.api_keys ?? []
        setSpaceSettings({
          domain: spaceData.space?.domain ?? '',
          previewUrls: spaceData.space?.previewUrls ?? [],
          mobileWidth: spaceData.space?.mobileWidth ?? 360,
          previewToken: tokens.find((t) => t.access === 'private')?.token ?? '',
          publicToken: tokens.find((t) => t.access === 'public')?.token ?? '',
        })
      })
      .catch(() => {})
  }, [spaceId])

  if (notFoundError) notFound()

  return (
    <StoryEditor
      spaceId={spaceId}
      story={data?.story ?? null}
      componentSchema={data?.component_schema ?? null}
      allComponents={data?.all_components ?? []}
      allGroups={data?.all_groups ?? []}
      domain={spaceSettings?.domain ?? ''}
      previewUrls={spaceSettings?.previewUrls ?? []}
      mobileWidth={spaceSettings?.mobileWidth ?? 360}
      previewToken={spaceSettings?.previewToken ?? ''}
      publicToken={spaceSettings?.publicToken ?? ''}
    />
  )
}
