'use client';

import type React from 'react';
import { useState } from 'react';
import { cn, avatarUrl } from '@/lib/utils';

const COLORS = [
  'bg-green-400 text-white',
  'bg-violet-400 text-white',
  'bg-blue-400 text-white',
  'bg-pink-400 text-white',
  'bg-indigo-400 text-white',
  'bg-teal-500 text-white',
  'bg-orange-400 text-white',
  'bg-red-400 text-white',
  'bg-cyan-500 text-white',
  'bg-emerald-400 text-white',
  'bg-purple-400 text-white',
  'bg-yellow-400 text-gray-800',
];

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name: string | undefined | null): string {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % COLORS.length;
  }
  return COLORS[Math.abs(hash)];
}

const sizes = {
  xs: 'size-6 text-[10px]',
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-xl',
};

interface UserAvatarProps {
  name: string | undefined | null;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  style?: React.CSSProperties;
}

export function UserAvatar({
  name: nameProp,
  src,
  size = 'md',
  className,
  style,
}: UserAvatarProps) {
  const name = nameProp || '?';
  const [imgError, setImgError] = useState(false);
  const resolvedSrc = avatarUrl(src);

  if (resolvedSrc && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={name}
        style={style}
        className={cn(sizes[size], 'rounded-full object-cover shrink-0', className)}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      style={style}
      className={cn(
        sizes[size],
        getColor(name),
        'rounded-full flex items-center justify-center font-semibold shrink-0',
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
