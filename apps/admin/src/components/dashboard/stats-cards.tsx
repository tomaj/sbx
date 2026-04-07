'use client';

import Link from 'next/link';
import { BookOpen, Images, LayoutPanelLeft, Database, Users } from 'lucide-react';
import { SkeletonBlock, SkeletonText } from '@/components/ui/skeleton';

interface Stats {
  stories: number | null;
  assets: number | null;
  blocks: number | null;
  datasources: number | null;
  users: number | null;
}

const STAT_CARDS = [
  {
    key: 'stories' as const,
    label: 'Stories',
    icon: BookOpen,
    color: 'text-blue-500',
    href: 'content',
  },
  {
    key: 'assets' as const,
    label: 'Assets',
    icon: Images,
    color: 'text-green-500',
    href: 'assets',
  },
  {
    key: 'blocks' as const,
    label: 'Blocks',
    icon: LayoutPanelLeft,
    color: 'text-purple-500',
    href: 'block-library',
  },
  {
    key: 'datasources' as const,
    label: 'Datasources',
    icon: Database,
    color: 'text-amber-500',
    href: 'datasources',
  },
  {
    key: 'users' as const,
    label: 'Users',
    icon: Users,
    color: 'text-teal-500',
    href: 'settings/users',
  },
];

interface StatsCardsProps {
  spaceId: string;
  stats: Stats;
}

export function StatsCards({ spaceId, stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {STAT_CARDS.map(({ key, label, icon: Icon, color, href }) => (
        <Link
          key={key}
          href={`/spaces/${spaceId}/${href}`}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-3 hover:shadow-lg hover:border-teal-400 dark:hover:border-teal-500 hover:-translate-y-0.5 transition-all duration-150"
        >
          <Icon className={`size-5 ${color}`} />
          {stats[key] === null ? (
            <div className="space-y-1.5">
              <SkeletonBlock className="h-7 w-16" />
              <SkeletonText className="w-14 h-3.5" />
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats[key]?.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
