'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Building2,
  ArrowLeft,
  Gauge,
  Monitor,
  Activity,
  Users,
  Code2,
  Settings,
  LayoutTemplate,
  Image,
  Database,
  Tag,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/swr';

const mainNavItems = [
  { href: '/spaces', icon: LayoutGrid, label: 'My Spaces' },
  { href: '/organization', icon: Building2, label: 'My Organization' },
];

const orgNavItems = [
  { href: '/organization', icon: Gauge, label: 'Dashboard', exact: true },
  { href: '/organization/spaces', icon: Monitor, label: 'Spaces' },
  { href: '/organization/activities', icon: Activity, label: 'Activities' },
  { href: '/organization/user-management', icon: Users, label: 'User management' },
  { href: '/organization/field-types', icon: Code2, label: 'Field-types' },
  { href: '/organization/settings', icon: Settings, label: 'Settings' },
];

const spaceNavItems = [
  { segment: '', icon: Gauge, label: 'Dashboard', exact: true },
  { segment: 'content', icon: LayoutTemplate, label: 'Content' },
  { segment: 'activities', icon: Activity, label: 'Activities' },
  { segment: 'block-library', icon: Monitor, label: 'Block Library' },
  { segment: 'assets', icon: Image, label: 'Assets' },
  { segment: 'datasources', icon: Database, label: 'Datasources' },
  { segment: 'tags', icon: Tag, label: 'Tags' },
  { segment: 'tasks', icon: ClipboardList, label: 'Tasks' },
  { segment: 'settings', icon: Settings, label: 'Settings' },
];

function useSpaceId(pathname: string): string | null {
  const match = pathname.match(/^\/spaces\/(\d+)/);
  return match ? match[1] : null;
}

export function NavLinks() {
  const pathname = usePathname();
  const isOrg = pathname === '/organization' || pathname.startsWith('/organization/');
  const spaceId = useSpaceId(pathname);
  const isSpace = !!spaceId;

  const { data: spacesData } = useApi<{ spaces: { id: number; name: string }[] }>(
    spaceId ? '/api/admin/spaces' : null,
  );
  const spaceName = spacesData?.spaces?.find((s) => String(s.id) === spaceId)?.name ?? '';

  if (isSpace) {
    const base = `/spaces/${spaceId}`;
    return (
      <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
        <Link
          href="/spaces"
          className="flex items-center gap-3 px-3 py-3 rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors text-sm mb-3"
        >
          <ArrowLeft className="size-4 shrink-0" />
          {spaceName || 'My Spaces'}
        </Link>

        {spaceNavItems.map(({ segment, icon: Icon, label, exact }) => {
          const href = segment ? `${base}/${segment}` : base;
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-sm',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  if (isOrg) {
    return (
      <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
        <Link
          href="/spaces"
          className="flex items-center gap-3 px-3 py-3 rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors text-sm mb-3"
        >
          <ArrowLeft className="size-4 shrink-0" />
          My Spaces
        </Link>

        {orgNavItems.map(({ href, icon: Icon, label, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-sm',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
      {mainNavItems.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-sm',
            pathname === href || pathname.startsWith(`${href}/`)
              ? 'bg-white/15 text-white'
              : 'text-slate-300 hover:bg-white/10 hover:text-white',
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
