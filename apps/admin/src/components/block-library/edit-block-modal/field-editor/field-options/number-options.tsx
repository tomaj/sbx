'use client';

import {
  FormRow,
  Label,
  CheckboxRow,
  NumberStepper,
  SectionTitle,
  TooltipHint,
} from '../form-primitives';

export function NumberOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Number Field Options</SectionTitle>
      <FormRow>
        <Label>Default value</Label>
        <input
          type="text"
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </FormRow>
      <FormRow>
        <Label>Min value</Label>
        <NumberStepper value={def.min_value} onChange={(v) => onChange({ min_value: v })} />
      </FormRow>
      <FormRow>
        <Label>Max value</Label>
        <NumberStepper value={def.max_value} onChange={(v) => onChange({ max_value: v })} />
      </FormRow>
      <FormRow>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Number of decimals
          </span>
          <TooltipHint text="The number of decimal places is the number of digits that appear after the decimal point." />
        </div>
        <NumberStepper value={def.decimals} onChange={(v) => onChange({ decimals: v })} min={0} />
        <p className="mt-1 text-xs text-gray-400">{def.decimals ?? 0}</p>
      </FormRow>
      <FormRow>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Step size</span>
          <TooltipHint text="Specifies the interval between numbers in the input field." />
        </div>
        <NumberStepper value={def.steps} onChange={(v) => onChange({ steps: v })} min={0} />
        <p className="mt-1 text-xs text-gray-400">
          {def.steps != null ? def.steps : '1, 2, 3, ...'}
        </p>
      </FormRow>
    </>
  );
}

export function DatetimeOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Date/Time Field Options</SectionTitle>
      <CheckboxRow
        label="Disable time selection"
        checked={!!def.disable_time}
        onChange={(v) => onChange({ disable_time: v })}
      />
      <FormRow>
        <Label>Default value</Label>
        <input
          type="text"
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          placeholder="YYYY-MM-DD HH:mm"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </FormRow>
    </>
  );
}

export function BooleanOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Boolean Field Options</SectionTitle>
      <CheckboxRow
        label="Inline label"
        checked={!!def.inline_label}
        onChange={(v) => onChange({ inline_label: v })}
      />
      <FormRow>
        <Label>Default value</Label>
        <button
          type="button"
          onClick={() => onChange({ default_value: !def.default_value })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            def.default_value ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              def.default_value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </FormRow>
    </>
  );
}
