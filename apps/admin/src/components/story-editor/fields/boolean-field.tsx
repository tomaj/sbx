'use client';

import type { BooleanFieldDef } from '@/components/block-library/edit-block-modal/types';
import { fieldLabel } from '../field-label';
import { FieldLabel } from '../FieldLabel';

interface Props {
  fieldKey: string;
  def: BooleanFieldDef;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}

export function BooleanField({ fieldKey, def, value, onChange }: Props) {
  const checked = value ?? def.default_value ?? false;

  return (
    <div>
      <FieldLabel
        label={fieldLabel(def.display_name, fieldKey)}
        required={def.required}
        description={def.description}
      />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
          checked ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
