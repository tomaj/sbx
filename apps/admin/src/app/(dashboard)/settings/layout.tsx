'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const sections = [
  {
    title: 'General',
    items: [
      { href: '/settings/account', label: 'Account' },
      { href: '/settings/appearance', label: 'Appearance' },
    ],
  },
  {
    title: 'Security',
    items: [
      { href: '/settings/security', label: 'Account Security' },
      { href: '/settings/tokens', label: 'Personal access token' },
    ],
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-full">
      {/* Settings sub-nav */}
      <nav className="w-[220px] shrink-0 border-r border-gray-200 dark:border-gray-800 p-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-2">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block px-3 py-1.5 text-sm rounded-md transition-colors',
                    pathname === item.href
                      ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-700'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 p-8 max-w-3xl">
        {children}
      </div>
    </div>
  )
}
