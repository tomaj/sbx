'use client';

import type { MarkdownFieldDef } from '@/components/block-library/edit-block-modal/types';

interface Props {
  fieldKey: string;
  def: MarkdownFieldDef;
  value: string | undefined;
  onChange: (v: string) => void;
}

export function MarkdownField({ fieldKey, def, value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {def.display_name || fieldKey}
        {def.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {def.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{def.description}</p>
      )}
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
        dir={def.rtl ? 'rtl' : undefined}
        placeholder="Markdown..."
      />
    </div>
  );
}
