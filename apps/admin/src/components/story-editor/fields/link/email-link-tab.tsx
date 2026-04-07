'use client';

import type { LinkValue } from './types';

interface Props {
  displayUrl: string;
  onUpdate: (patch: Partial<LinkValue>) => void;
}

export function EmailLinkTab({ displayUrl, onUpdate }: Props) {
  return (
    <input
      type="email"
      placeholder="email@example.com"
      value={displayUrl}
      onChange={(e) =>
        onUpdate({ url: e.target.value, href: e.target.value, cached_url: e.target.value })
      }
      className="flex-1 px-3 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none min-w-0"
    />
  );
}
