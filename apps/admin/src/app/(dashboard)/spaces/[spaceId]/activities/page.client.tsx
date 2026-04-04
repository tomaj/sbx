'use client'

import { use, useState, useCallback, useEffect } from 'react'
import { usePerPage } from '@/hooks/use-per-page'
import { DataTable, type Column } from '@/components/ui/data-table'
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
import type { ActivityRow } from '@sbx/types'

interface ActivityUser {
  id: number
  firstname: string
  lastname: string
  email: string
  avatar: string | null
}

export default function SpaceActivitiesPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  const [activityKeys, setActivityKeys] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = usePerPage('perPage:activities', 25)

  const [users, setUsers] = useState<ActivityUser[]>([])
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/users?per_page=100&filter=all')
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
  }, [])

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ spaceId, page: String(page), per_page: String(perPage) })
    if (activityKeys.length) params.set('types', activityKeys.join(','))
    if (userIds.length) params.set('by_owner_ids', userIds.join(','))
    if (dateFrom) params.set('created_at_gte', dateFrom)
    if (dateTo) params.set('created_at_lte', dateTo)
    const res = await fetch(`/api/admin/activities?${params}`)
    if (res.ok) {
      const data = await res.json()
      setRows(data.activities ?? [])
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }, [spaceId, page, perPage, activityKeys, userIds, dateFrom, dateTo])

  useEffect(() => { fetchActivities() }, [fetchActivities])

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
          View history of changes in this space.
        </p>

        <div className="flex items-center gap-3 mt-6 flex-wrap">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter:</span>
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
          storageKey: 'perPage:activities',
        }}
      />
    </div>
  )
}
