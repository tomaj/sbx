'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

export default function SecurityPage() {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSavePassword() {
    if (!newPassword) return
    setSaving(true)
    // TODO: wire to better-auth changePassword
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setShowPasswordForm(false)
    setCurrentPassword('')
    setNewPassword('')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Account Security</h1>
        <button
          disabled
          className="flex items-center gap-2 bg-teal-200 text-teal-700 text-sm font-medium px-4 py-2 rounded-md opacity-60 cursor-not-allowed"
        >
          <Check className="size-4" />
          Save
        </button>
      </div>

      {/* Password */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Password</h2>
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Set password
          </button>
        ) : (
          <div className="space-y-3 max-w-sm">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSavePassword}
                disabled={saving}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-md transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save password'}
              </button>
              <button
                onClick={() => setShowPasswordForm(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {saved && (
        <p className="mt-4 text-sm text-teal-600 dark:text-teal-400">Password updated successfully.</p>
      )}
    </div>
  )
}
