'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, TriangleAlert } from 'lucide-react'

interface Token {
  id: number
  name: string
  lastFour: string
  expiresAt: string | null
  createdAt: string
}

const EXPIRY_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No expiration', days: 0 },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [showForm, setShowForm] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [expiryDays, setExpiryDays] = useState(90)
  const [generating, setGenerating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchTokens = useCallback(async () => {
    const res = await fetch('/api/admin/tokens')
    if (res.ok) {
      const data = await res.json()
      setTokens(Array.isArray(data.tokens) ? data.tokens : [])
    }
  }, [])

  useEffect(() => { fetchTokens() }, [fetchTokens])

  async function handleGenerate() {
    if (!tokenName.trim()) return
    setGenerating(true)
    const res = await fetch('/api/admin/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tokenName, expiresInDays: expiryDays || undefined }),
    })
    if (res.ok) {
      const data = await res.json()
      setNewToken(data.token)
      setTokenName('')
      fetchTokens()
    }
    setGenerating(false)
  }

  async function handleDelete(id: number) {
    await fetch(`/api/admin/tokens/${id}`, { method: 'DELETE' })
    fetchTokens()
  }

  function handleCopy() {
    if (newToken) {
      navigator.clipboard.writeText(newToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const expiryDate = expiryDays
    ? new Date(Date.now() + expiryDays * 86400000).toLocaleDateString('en-GB')
    : null

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Personal access token</h1>

      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Tokens that have been generated to access the{' '}
          <span className="underline">SBX Management API</span>
        </h2>
        <p className="text-sm text-gray-400">
          Personal access tokens work like ordinary OAuth access tokens. They can be used to authenticate yourself to have full access to the management API programmatically and should NEVER be exposed in public.
        </p>
      </div>

      {/* Token list */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        {tokens.map((token) => (
          <div key={token.id} className="flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {token.name} (••••••••••••{token.lastFour})
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Generated: {formatDate(token.createdAt)}
              </p>
              {token.expiresAt && (
                <p className="text-xs text-gray-400">
                  The token will expire on {new Date(token.expiresAt).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 transition-colors">
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => handleDelete(token.id)}
                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Generate new token */}
      {!showForm && !newToken && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Generate new token
        </button>
      )}

      {showForm && !newToken && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Provide a expiration date to your new token
          </h3>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Name</label>
            <input
              type="text"
              placeholder="Enter your token name"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Expiration</label>
            <div className="flex items-center gap-4">
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[140px]"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.days} value={o.days}>{o.label}</option>
                ))}
              </select>
              {expiryDate && (
                <span className="text-sm text-gray-400">
                  The token will expire on {expiryDate}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm text-gray-500">
            <TriangleAlert className="size-4 shrink-0 mt-0.5" />
            Please copy this personal access token now. It will be visible only once.
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !tokenName.trim()}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {generating ? 'Generating...' : 'Generate & Copy token'}
          </button>

          <div>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {newToken && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Your new token:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-gray-100 break-all">
              {newToken}
            </code>
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded transition-colors shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-400">Save this token now — it will not be shown again.</p>
          <button
            onClick={() => { setNewToken(null); setShowForm(false) }}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
