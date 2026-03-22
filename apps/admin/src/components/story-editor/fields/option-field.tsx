'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { OptionFieldDef } from '@/components/block-library/edit-block-modal/types'
import { fieldLabel } from '../field-label'
import { FieldLabel } from '../FieldLabel'
import { StoryPickerModal } from '../StoryPickerModal'
import { SelectDropdown } from '@/components/ui/select-dropdown'

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
  const [datasourceOptions, setDatasourceOptions] = useState<Array<{ value: string; label: string }> | null>(null)
  const [loadingDatasource, setLoadingDatasource] = useState(false)

  const isInternalStories = def.source === 'internal_stories'
  const isInternalDatasource = def.source === 'internal' && !!def.datasource_slug

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

  // For internal datasource: fetch entries by slug
  useEffect(() => {
    if (!isInternalDatasource) return
    let cancelled = false
    setLoadingDatasource(true)

    async function load() {
      try {
        const dsRes = await fetch(`/api/admin/spaces/${spaceId}/datasources`)
        const dsData = await dsRes.json()
        const ds = (dsData.datasources ?? []).find((d: any) => d.slug === def.datasource_slug)
        if (!ds) {
          if (!cancelled) setDatasourceOptions([])
          return
        }
        const entriesRes = await fetch(
          `/api/admin/spaces/${spaceId}/datasources/${ds.id}/entries?per_page=500`,
        )
        const entriesData = await entriesRes.json()
        const entries = entriesData.entries ?? []
        if (!cancelled)
          setDatasourceOptions(entries.map((e: any) => ({ value: e.value, label: e.name })))
      } catch {
        if (!cancelled) setDatasourceOptions([])
      } finally {
        if (!cancelled) setLoadingDatasource(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isInternalDatasource, spaceId, def.datasource_slug])

  if (isInternalStories) {
    return (
      <>
        <div>
          <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
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

  if (isInternalDatasource) {
    return (
      <div>
        <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />
        <SelectDropdown
          options={datasourceOptions ?? []}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          placeholder="Choose an option"
          loading={loadingDatasource}
        />
      </div>
    )
  }

  // Static options (source: 'self' or no source)
  const options = (def.options ?? []).map((o) => ({ value: o.value, label: o.name }))
  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />
      <SelectDropdown
        options={options}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        placeholder="Choose an option"
      />
    </div>
  )
}
