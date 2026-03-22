'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { OptionFieldDef } from '@/components/block-library/edit-block-modal/types'
import { fieldLabel } from '../field-label'
import { FieldLabel } from '../FieldLabel'
import { StoryPickerModal } from '../StoryPickerModal'

interface Props {
  fieldKey: string
  def: OptionFieldDef
  value: string | undefined
  onChange: (v: string) => void
  spaceId: string
}

export function OptionField({ fieldKey, def, value, onChange, spaceId }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

  const isInternalStories = def.source === 'internal_stories'

  // For internal_stories: fetch the display name of current value on mount / value change
  useEffect(() => {
    if (!isInternalStories || !value) {
      setSelectedLabel(null)
      return
    }
    const params = new URLSearchParams({ per_page: '1' })
    if (def.use_uuid) params.set('uuid', value)
    else params.set('story_id', value)
    if (def.filter_content_type?.length) params.set('content_type', def.filter_content_type[0])
    fetch(`/api/admin/spaces/${spaceId}/stories?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const story = data.stories?.[0]
        setSelectedLabel(story ? story.name : value)
      })
      .catch(() => setSelectedLabel(value))
  }, [isInternalStories, value, spaceId, def.use_uuid, def.filter_content_type])

  if (isInternalStories) {
    return (
      <>
        <div>
          <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            <span className={selectedLabel ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
              {selectedLabel ?? 'Choose an option'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        </div>

        {pickerOpen && (
          <StoryPickerModal
            spaceId={spaceId}
            title={fieldLabel(def.display_name, fieldKey)}
            filterContentType={def.filter_content_type}
            useUuid={def.use_uuid}
            value={value}
            onSelect={(v, name) => { onChange(v); setSelectedLabel(name) }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </>
    )
  }

  // Static options (source: 'self' or no source)
  const options = def.options ?? []
  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {!def.exclude_empty_option && <option value="">— Select —</option>}
        {options.map((opt) => (
          <option key={opt._uid ?? opt.value} value={opt.value}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  )
}
