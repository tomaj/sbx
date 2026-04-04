'use client';

import { useEffect, useState } from 'react';

function formatRelative(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;

  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(days / 365);
  if (years === 1) return '1 year ago';
  return `${years} years ago`;
}

interface TimeAgoProps {
  date: string | Date | null | undefined;
  fallback?: string;
  className?: string;
}

export function TimeAgo({ date, fallback = 'Never', className }: TimeAgoProps) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!date) {
      setLabel(fallback);
      return;
    }
    const d = typeof date === 'string' ? new Date(date) : date;
    setLabel(formatRelative(d));

    // refresh every 30s
    const interval = setInterval(() => setLabel(formatRelative(d)), 30_000);
    return () => clearInterval(interval);
  }, [date, fallback]);

  if (!date) return <span className={className}>{fallback}</span>;

  const d = typeof date === 'string' ? new Date(date) : date;

  return (
    <time dateTime={d.toISOString()} title={d.toLocaleString()} className={className}>
      {label || formatRelative(d)}
    </time>
  );
}
