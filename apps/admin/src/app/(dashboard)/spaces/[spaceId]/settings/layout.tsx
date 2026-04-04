'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_SECTIONS = [
  {
    label: 'General',
    items: [
      { label: 'Space', href: 'space' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { label: 'Visual Editor', href: 'visual-editor' },
      { label: 'Internationalization', href: 'internationalization' },
      { label: 'Webhooks', href: 'webhooks' },
      { label: 'Access Tokens', href: 'access-tokens' },
      { label: 'Workflows', href: 'workflows' },
      { label: 'Asset Library', href: 'asset-library' },
      { label: 'AI Settings', href: 'ai-settings' },
    ],
  },
  {
    label: 'Team Management',
    items: [
      { label: 'Users', href: 'users' },
      { label: 'Roles', href: 'roles' },
    ],
  },
  {
    label: 'Apps',
    items: [
      { label: 'Pipelines', href: 'pipelines' },
    ],
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const spaceId = params.spaceId as string
  const pathname = usePathname()

  return (
    <div className="flex h-full min-h-0">
      {/* Left sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-y-auto">
        <nav className="px-3 py-5 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-2 mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const href = `/spaces/${spaceId}/settings/${item.href}`
                  const active = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
                        className={cn(
                          'block px-2 py-1.5 rounded-md text-sm transition-colors',
                          active
                            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
