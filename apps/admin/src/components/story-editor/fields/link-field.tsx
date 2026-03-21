'use client'

import type { LinkFieldDef, MultilinkFieldDef } from '@/components/block-library/edit-block-modal/types'

// Storyblok link value shape
interface LinkValue {
  linktype?: 'url' | 'story' | 'email' | 'asset'
  url?: string
  href?: string
  cached_url?: string
  target?: '_blank' | '_self'
  anchor?: string
}

interface Props {
  fieldKey: string
  def: LinkFieldDef | MultilinkFieldDef
  value: LinkValue | undefined
  onChange: (v: LinkValue) => void
}

type LinkType = 'url' | 'story' | 'email'

export function LinkField({ fieldKey, def, value, onChange }: Props) {
  const linktype: LinkType = (value?.linktype as LinkType) ?? 'url'
  const allowTarget = (def as LinkFieldDef).allow_target_blank ?? false

  function update(patch: Partial<LinkValue>) {
    onChange({ ...(value ?? {}), ...patch })
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {def.display_name || fieldKey}
        {def.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {def.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{def.description}</p>
      )}

      {/* Link type selector */}
      <div className="flex gap-1 mb-2">
        {(['url', 'story', 'email'] as LinkType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => update({ linktype: t, url: '', href: '', cached_url: '' })}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              linktype === t
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <input
        type={linktype === 'email' ? 'email' : 'text'}
        placeholder={
          linktype === 'story' ? 'story slug or uuid' :
          linktype === 'email' ? 'email@example.com' :
          'https://...'
        }
        value={value?.cached_url ?? value?.url ?? value?.href ?? ''}
        onChange={(e) => update({ cached_url: e.target.value, url: e.target.value, href: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      {allowTarget && (
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value?.target === '_blank'}
            onChange={(e) => update({ target: e.target.checked ? '_blank' : '_self' })}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">Open in new tab</span>
        </label>
      )}
    </div>
  )
}
