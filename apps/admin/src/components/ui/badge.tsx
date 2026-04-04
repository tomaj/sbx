/**
 * Badge — colored pill label for statuses, roles, types, etc.
 *
 * Variants:
 *   default   — gray
 *   success   — green
 *   warning   — yellow/amber
 *   danger    — red
 *   info      — blue
 *   purple    — purple
 *   teal      — teal
 *
 * Usage:
 *   <Badge variant="success">Published</Badge>
 *   <Badge variant="danger">Deleted</Badge>
 *   <Badge style={{ backgroundColor: stage.color }}>Custom</Badge>
 */

import type { CSSProperties, ReactNode } from 'react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'teal';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Badge({ variant = 'default', children, className = '', style }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${VARIANT_CLASSES[variant]} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/** Token access level badge: public = green, preview/private = purple */
export function AccessBadge({ access }: { access: string }) {
  const isPublic = access === 'public';
  return <Badge variant={isPublic ? 'success' : 'purple'}>{isPublic ? 'Public' : 'Preview'}</Badge>;
}

/** Story published/draft/scheduled status badge */
export function StoryStatusBadge({
  status,
}: {
  status: 'published' | 'draft' | 'scheduled' | string;
}) {
  const variant =
    status === 'published' ? 'success' : status === 'scheduled' ? 'warning' : 'default';
  return <Badge variant={variant}>{status}</Badge>;
}

/** User/member role badge */
export function RoleBadge({ role }: { role: string }) {
  const variant =
    role === 'admin' || role === 'owner' ? 'danger' : role === 'editor' ? 'teal' : 'default';
  return <Badge variant={variant}>{role}</Badge>;
}
