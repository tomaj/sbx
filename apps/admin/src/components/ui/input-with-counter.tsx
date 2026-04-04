'use client';

import { cn } from '@/lib/utils';

interface InputWithCounterProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  id?: string;
  className?: string;
  autoFocus?: boolean;
}

export function InputWithCounter({
  value,
  onChange,
  maxLength,
  placeholder,
  id,
  className,
  autoFocus,
}: InputWithCounterProps) {
  return (
    <div>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        placeholder={placeholder}
        className={cn(
          'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
          className,
        )}
      />
      <div className="mt-1 text-right text-xs text-gray-400">
        {value.length}/{maxLength}
      </div>
    </div>
  );
}
