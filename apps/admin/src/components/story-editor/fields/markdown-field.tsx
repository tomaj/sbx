'use client';

import type { MarkdownFieldDef } from '@/components/block-library/edit-block-modal/types';

interface Props {
  fieldKey: string;
  def: MarkdownFieldDef;
  value: string | undefined;
  onChange: (v: string) => void;
}

export function MarkdownField({ fieldKey, def, value, onChange }: Props) {
  const max = (def as any).max_length as number | undefined;
  const length = (value ?? '').length;
  const overLimit = max !== undefined && length > max;
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
        maxLength={max}
        className={`w-full px-3 py-2 text-sm font-mono border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 resize-y ${
          overLimit
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-teal-500'
        }`}
        dir={def.rtl ? 'rtl' : undefined}
        placeholder="Markdown..."
      />
      {max !== undefined && (
        <p className={`text-xs mt-1 text-right ${overLimit ? 'text-red-500' : 'text-gray-400'}`}>
          {length} / {max}
        </p>
      )}
    </div>
  );
}
