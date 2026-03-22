'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Search, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { TimeAgo } from '@/components/ui/time-ago'

interface Member {
  firstname: string
  lastname: string
  avatar: string | null
}

interface Space {
  id: number
  name: string
  updatedAt: string
  lastActivityAt: string | null
  members: Member[]
}

function OwnerAvatar({ member }: { member: Member }) {
  const initials = [member.firstname[0], member.lastname[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?'

  if (member.avatar) {
    return (
      <div className="size-9 rounded-full overflow-hidden bg-gray-200 shrink-0">
        <Image src={member.avatar} alt={initials} width={36} height={36} className="object-cover" unoptimized />
      </div>
    )
  }
  return (
    <div className="size-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{initials}</span>
    </div>
  )
}

function OrgSpaceCard({ space }: { space: Space }) {
  const owner = space.members[0] ?? null

  return (
    <Link
      href={`/spaces/${space.id}`}
      className="group block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 transition-all duration-200 hover:border-teal-500 dark:hover:border-teal-400 hover:shadow-md"
    >
      {/* Header: name + menu */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
          {space.name}
        </h3>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {/* Middle: avatar left, space ID right */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          {owner && <OwnerAvatar member={owner} />}
          <span className="text-xs text-gray-400 mt-1">
            <TimeAgo date={space.lastActivityAt ?? space.updatedAt} />
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Space ID: <span className="font-semibold text-gray-900 dark:text-gray-100">#{space.id}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Enterprise · EU</p>
        </div>
      </div>
    </Link>
  )
}

function Section({
  title,
  count,
  spaces,
  emptyText,
}: {
  title: string
  count: number
  spaces: Space[]
  emptyText?: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        {title} ({count})
      </button>

      {open && (
        spaces.length === 0 ? (
          <p className="text-sm text-gray-400 pl-6">{emptyText ?? 'No spaces found.'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <OrgSpaceCard key={space.id} space={space} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

const SORT_OPTIONS = [
  { value: 'updated', label: 'Last updated' },
  { value: 'name', label: 'Name' },
  { value: 'id', label: 'Space ID' },
]

export function OrgSpacesClient({ spaces }: { spaces: Space[] }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('updated')
  const [sortOpen, setSortOpen] = useState(false)

  const filtered = useMemo(() => {
    let list = spaces
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || String(s.id).includes(q),
      )
    }
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'id') return a.id - b.id
      const aDate = a.lastActivityAt ?? a.updatedAt
      const bDate = b.lastActivityAt ?? b.updatedAt
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })
  }, [spaces, search, sort])

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Last updated'

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Organization Spaces</h1>
        <button className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="size-4" />
          Add new
        </button>
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spaces..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Sort by: {sortLabel}
            <ChevronDown className="size-4" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 z-10 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setSortOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    sort === opt.value
                      ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Section
        title="Organization Spaces with access"
        count={filtered.length}
        spaces={filtered}
        emptyText="No results found. There are no spaces in your organization yet."
      />
      <Section
        title="Organization Spaces without access"
        count={0}
        spaces={[]}
        emptyText="No results found. There are no spaces in your organization yet."
      />
    </div>
  )
}
