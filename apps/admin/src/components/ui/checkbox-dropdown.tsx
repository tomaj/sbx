'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from './user-avatar'

export interface CheckboxOption {
  value: string
  label: string
  avatarName?: string
  avatarSrc?: string | null
}

interface CheckboxDropdownProps {
  options: CheckboxOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

export function CheckboxDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
}: CheckboxDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => searchRef.current?.focus(), 0)
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((id) => id !== v) : [...value, v])
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  }, [options, search])

  const label =
    value.length === 0
      ? placeholder
      : value.length === 1
      ? (options.find((o) => o.value === value[0])?.label ?? placeholder)
      : `${value.length} selected`

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 transition-colors',
          open
            ? 'border-teal-600 ring-1 ring-teal-600'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        )}
      >
        <span
          className={cn(
            'flex-1 text-left truncate',
            value.length > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400',
          )}
        >
          {label}
        </span>
        <div className="ml-2 p-1 rounded-md border border-gray-200 dark:border-gray-600 shrink-0">
          <ChevronDown className="size-3.5 text-gray-500 dark:text-gray-400" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg min-w-full flex flex-col">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Search className="size-3.5 text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">No results</p>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className={cn(
                        'size-4 shrink-0 rounded border flex items-center justify-center transition-colors',
                        checked
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'border-gray-300 dark:border-gray-600',
                      )}
                    >
                      {checked && <Check className="size-3" strokeWidth={3} />}
                    </div>
                    {opt.avatarName && (
                      <UserAvatar name={opt.avatarName} src={opt.avatarSrc} size="sm" />
                    )}
                    <span className="text-sm text-gray-800 dark:text-gray-200">{opt.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
