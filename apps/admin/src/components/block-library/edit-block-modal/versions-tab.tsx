'use client'

import { Clock } from 'lucide-react'

interface VersionsTabProps {
  createdAt: string
  updatedAt: string
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VersionsTab({ createdAt, updatedAt }: VersionsTabProps) {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="space-y-3">
        {updatedAt !== createdAt && (
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Last updated</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDateTime(updatedAt)}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Created</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDateTime(createdAt)}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600 text-center pt-4">
          Full version history coming soon
        </p>
      </div>
    </div>
  )
}
