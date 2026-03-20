'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
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

function MemberAvatar({ member, index }: { member: Member; index: number }) {
  const initials = [member.firstname[0], member.lastname[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?'

  const style = { marginLeft: index === 0 ? 0 : -10, zIndex: index }

  if (member.avatar) {
    return (
      <div
        className="relative size-9 rounded-full border-2 border-white dark:border-gray-900 overflow-hidden bg-gray-200 shrink-0"
        style={style}
      >
        <Image src={member.avatar} alt={initials} fill className="object-cover" unoptimized />
      </div>
    )
  }

  return (
    <div
      className="relative size-9 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0"
      style={style}
    >
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-none">
        {initials}
      </span>
    </div>
  )
}

export function SpaceCard({ space }: { space: Space }) {
  const visibleMembers = space.members.slice(0, 5)
  const extraCount = space.members.length - visibleMembers.length

  return (
    <Link
      href={`/spaces/${space.id}`}
      className="group block bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 transition-all duration-200 hover:border-teal-500 dark:hover:border-teal-400 hover:shadow-lg hover:shadow-teal-500/10 dark:hover:shadow-teal-400/10"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
            {space.name}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">#{space.id}</p>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          className="p-1.5 text-gray-300 hover:text-yellow-400 transition-colors"
        >
          <Star className="size-4" />
        </button>
      </div>

      {/* Member avatars */}
      <div className="flex items-center mb-5">
        {visibleMembers.map((member, i) => (
          <MemberAvatar key={i} member={member} index={i} />
        ))}
        {extraCount > 0 && (
          <div
            className="size-9 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0"
            style={{ marginLeft: -10, zIndex: visibleMembers.length }}
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-300">
              +{extraCount}
            </span>
          </div>
        )}
      </div>

      {/* Last activity */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1">
        <span className="text-xs text-gray-400 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors">Updated</span>
        <TimeAgo
          date={space.lastActivityAt ?? space.updatedAt}
          className="text-xs text-gray-400 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors"
        />
      </div>
    </Link>
  )
}
