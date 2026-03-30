'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePerPage } from '@/hooks/use-per-page'
import { Activity } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/data-table'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { CheckboxDropdown } from '@/components/ui/checkbox-dropdown'
import { DateField } from '@/components/ui/date-field'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  ACTIVITY_TYPES,
  formatActivityKey,
  formatActivityTime,
  activityKeyColor,
  resolveItemName,
} from '@/components/activities/activity-utils'

interface Space {
  id: number
  name: string
}

interface User {
  id: number
  firstname: string
  lastname: string
  email: string
  avatar: string | null
}

interface ActivityRow {
  id: number
  activity: {
    id: number
    key: string
    trackable_id: number | null
    trackable_type: string | null
    created_at: string
    space_id: number
  }
  trackable: { id: string | number; name: string; slug: string } | null
  user: {
    id: number
    userid: string
    friendly_name: string
    avatar: string | null
  } | null
}

export default function OrgActivitiesPage() {
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [activityKeys, setActivityKeys] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = usePerPage('perPage:org-activities', 25)

  const [spaces, setSpaces] = useState<Space[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/spaces').then((r) => r.json()).then((d) => setSpaces(d.spaces ?? []))
    fetch('/api/admin/users?per_page=100&filter=all').then((r) => r.json()).then((d) => setUsers(d.users ?? []))
  }, [])

  const fetchActivities = useCallback(async () => {
    if (!spaceId) return
    setLoading(true)
    const params = new URLSearchParams({ spaceId, page: String(page), per_page: String(perPage) })
    if (activityKeys.length) params.set('keys', activityKeys.join(','))
    if (userIds.length) params.set('user_ids', userIds.join(','))
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    const res = await fetch(`/api/admin/activities?${params}`)
    if (res.ok) {
      const data = await res.json()
      setRows(data.activities ?? [])
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }, [spaceId, page, perPage, activityKeys, userIds, dateFrom, dateTo])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  const selectedSpace = spaces.find((s) => String(s.id) === spaceId)

  const columns: Column<ActivityRow>[] = [
    {
      key: 'time',
      label: 'Time',
      width: '130px',
      render: (row) => {
        const { date, time } = formatActivityTime(row.activity.created_at)
        return (
          <div>
            <p className="text-sm text-gray-900 dark:text-gray-100">{date}</p>
            <p className="text-xs text-gray-400">{time}</p>
          </div>
        )
      },
      skeletonRender: () => (
        <div className="space-y-1.5">
          <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-3 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (row) => {
        const user = row.user
        if (!user?.friendly_name) return <span className="text-sm text-gray-400">—</span>
        return (
          <div className="flex items-center gap-3">
            <UserAvatar name={user.friendly_name} src={user.avatar} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.friendly_name}</p>
              <p className="text-xs text-gray-400">{user.userid}</p>
            </div>
          </div>
        )
      },
      skeletonRender: () => (
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      width: '220px',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${activityKeyColor(row.activity.key)}`}>
          {formatActivityKey(row.activity.key)}
        </span>
      ),
    },
    {
      key: 'space',
      label: 'Space',
      width: '140px',
      render: () => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedSpace?.name}</p>
          <p className="text-xs text-gray-400">#{spaceId}</p>
        </div>
      ),
    },
    {
      key: 'item',
      label: 'Item affected',
      render: (row) => {
        const name = resolveItemName(
          row.trackable as { name?: string } | null,
          row.activity.trackable_type,
        )
        return (
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
            {row.activity.trackable_id && (
              <p className="text-xs text-gray-400">#{row.activity.trackable_id}</p>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activities</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View history of changes in your Organization.
        </p>

        <div className="flex items-center gap-3 mt-6 flex-wrap">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter:</span>
          <SelectDropdown
            options={spaces.map((s) => ({ value: String(s.id), label: s.name }))}
            value={spaceId}
            onChange={(v) => { setSpaceId(v); setPage(1) }}
            placeholder="Select Space:"
            className="w-52"
          />
          <CheckboxDropdown
            options={ACTIVITY_TYPES}
            value={activityKeys}
            onChange={(v) => { setActivityKeys(v); setPage(1) }}
            placeholder="Select Activity type"
            className="w-52"
          />
          <CheckboxDropdown
            options={users.map((u) => ({
              value: String(u.id),
              label: `${u.firstname} ${u.lastname}`,
              avatarName: `${u.firstname} ${u.lastname}`,
              avatarSrc: u.avatar,
            }))}
            value={userIds}
            onChange={(v) => { setUserIds(v); setPage(1) }}
            placeholder="Select User(s)"
            className="w-52"
          />
          <DateField
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); setPage(1) }}
            placeholder="From (YY-MM-DD)"
            className="w-44"
          />
          <DateField
            value={dateTo}
            onChange={(v) => { setDateTo(v); setPage(1) }}
            placeholder="To (YY-MM-DD)"
            className="w-44"
          />
        </div>
      </div>

      {!spaceId ? (
        <div className="flex-1 flex items-center justify-center pb-16">
          <div className="text-center">
            <div className="mx-auto size-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Activity className="size-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Select a Space to view activities
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              In order to list the activities within your organization, use the filter to select a space.
            </p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={rows as unknown as Record<string, unknown>[]}
          keyField="id"
          isLoading={loading}
          pagination={{
            total,
            page,
            perPage,
            onPageChange: setPage,
            onPerPageChange: (n) => { setPerPage(n); setPage(1) },
            storageKey: 'perPage:org-activities',
          }}
        />
      )}
    </div>
  )
}
