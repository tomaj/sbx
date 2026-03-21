'use client'

import { use, useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { StoryEditor } from '@/components/story-editor'
import type { ComponentMeta, StoryDetail } from '@/components/story-editor/types'

interface PageProps {
  params: Promise<{ spaceId: string; storyId: string }>
}

interface StoryData {
  story: StoryDetail
  component_schema: Record<string, any> | null
  all_components: ComponentMeta[]
}

export default function StoryDetailPage({ params }: PageProps) {
  const { spaceId, storyId } = use(params)
  const [data, setData] = useState<StoryData | null>(null)
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

  if (notFoundError) notFound()

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading story...</p>
        </div>
      </div>
    )
  }

  return (
    <StoryEditor
      spaceId={spaceId}
      story={data.story}
      componentSchema={data.component_schema}
      allComponents={data.all_components}
    />
  )
}
