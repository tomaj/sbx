'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const themes = [
  {
    value: 'light',
    label: 'Default',
    preview: (
      <div className="w-full h-20 rounded bg-gray-100 flex overflow-hidden">
        <div className="w-1/3 bg-[#1b2539]" />
        <div className="flex-1 bg-gray-100 p-1.5 space-y-1">
          <div className="h-1.5 bg-gray-300 rounded w-3/4" />
          <div className="h-1.5 bg-gray-300 rounded w-1/2" />
          <div className="h-3 bg-teal-400 rounded w-1/3 mt-1" />
        </div>
      </div>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    preview: (
      <div className="w-full h-20 rounded bg-gray-900 flex overflow-hidden">
        <div className="w-1/3 bg-[#111827]" />
        <div className="flex-1 bg-gray-900 p-1.5 space-y-1">
          <div className="h-1.5 bg-gray-700 rounded w-3/4" />
          <div className="h-1.5 bg-gray-700 rounded w-1/2" />
          <div className="h-3 bg-teal-600 rounded w-1/3 mt-1" />
        </div>
      </div>
    ),
  },
];

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setMounted(true), []);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!mounted) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appearance</h1>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          <Check className="size-4" />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        Choose how SBX looks to you
      </p>

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        {themes.map((t) => (
          <button
            type="button"
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              'rounded-lg border-2 p-3 text-left transition-colors',
              theme === t.value
                ? 'border-teal-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
            )}
          >
            {t.preview}
            <div className="flex items-center gap-2 mt-2">
              <div
                className={cn(
                  'size-4 rounded-full border-2 flex items-center justify-center',
                  theme === t.value
                    ? 'border-teal-500 bg-teal-500'
                    : 'border-gray-300 dark:border-gray-600',
                )}
              >
                {theme === t.value && <div className="size-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">{t.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
