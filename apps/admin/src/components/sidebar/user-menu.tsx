'use client'

import { useState, useRef, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'

interface UserMenuProps {
  name: string
  email: string
}

export function UserMenu({ name, email }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50">
          <div className="p-4 flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 p-2 space-y-0.5">
            <button
              onClick={() => { setOpen(false); router.push('/settings/account') }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings className="size-4" />
              Account settings
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-left"
      >
        <div className="size-7 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
          {initials}
        </div>
        <span className="text-sm text-slate-200 truncate">{name || email}</span>
      </button>
    </div>
  )
}
