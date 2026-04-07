'use client';

import type { TextareaFieldDef } from '@/components/block-library/edit-block-modal/types';
import { fieldLabel } from '../field-label';
import { FieldLabel } from '../FieldLabel';

interface Props {
  fieldKey: string;
  def: TextareaFieldDef;
  value: string | undefined;
  onChange: (v: string) => void;
}

export function TextareaField({ fieldKey, def, value, onChange }: Props) {
  const regexError = (() => {
    if (!def.regex || !value) return null;
    try {
      return new RegExp(def.regex).test(value) ? null : 'Value does not match required pattern';
    } catch {
      return null;
    }
  })();
  const hasError = !!regexError;
  return (
    <div>
      <FieldLabel
        label={fieldLabel(def.display_name, fieldKey)}
        required={def.required}
        description={def.description}
      />
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={def.max_length}
        rows={4}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 resize-y ${
          hasError
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-teal-500'
        }`}
        dir={def.rtl ? 'rtl' : undefined}
      />
      {regexError && <p className="text-xs text-red-500 mt-1">{regexError}</p>}
      {def.max_length && (
        <p className="text-xs text-gray-400 mt-1 text-right">
          {(value ?? '').length} / {def.max_length}
        </p>
      )}
    </div>
  );
}
