'use client';

import { cn } from '@/lib/utils';

interface IconButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  title?: string;
  variant?: 'default' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  icon: Icon,
  onClick,
  title,
  variant = 'default',
  size = 'md',
  disabled,
  className,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50',
        size === 'md' ? 'w-8 h-8' : 'w-7 h-7',
        variant === 'danger'
          ? 'text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
        className,
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
