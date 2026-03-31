'use client'

import type React from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { TimeAgo } from '@/components/ui/time-ago'
import { UserAvatar } from '@/components/ui/user-avatar'

interface Member {
  firstname: string
  lastname: string
  avatar: string | null
}

interface Space {
  id: number
  name: string
  updated_at: string
  last_activity_at: string | null
  members: Member[]
}

interface SpaceCardProps {
  space: Space
  isFav?: boolean
  onToggleFav?: () => void
}

export function SpaceCard({ space, isFav = false, onToggleFav }: SpaceCardProps) {
  const visibleMembers = space.members.slice(0, 5)
  const extraCount = space.members.length - visibleMembers.length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggleFav?.()}
        className={`absolute top-4 right-4 z-10 p-1.5 transition-colors ${isFav ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
      >
        <Star className={`size-4 ${isFav ? 'fill-yellow-400' : ''}`} />
      </button>

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
          {/* spacer so name doesn't overlap star */}
          <div className="w-8" />
        </div>

        {/* Member avatars */}
        <div className="flex items-center mb-5">
          {visibleMembers.map((member, i) => (
            <UserAvatar
              key={i}
              name={`${member.firstname} ${member.lastname}`}
              src={member.avatar}
              size="md"
              className="border-2 border-white dark:border-gray-900"
              style={{ marginLeft: i === 0 ? 0 : -10, zIndex: i } as React.CSSProperties}
            />
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
            date={space.last_activity_at ?? space.updated_at}
            className="text-xs text-gray-400 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors"
          />
        </div>
      </Link>
    </div>
  )
}
