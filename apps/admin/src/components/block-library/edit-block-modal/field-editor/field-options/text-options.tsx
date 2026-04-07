'use client';

import { FormRow, Label, CheckboxRow, NumberStepper, SectionTitle } from '../form-primitives';

export function TextOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Text Field Options</SectionTitle>
      <CheckboxRow
        label="Enable RTL"
        checked={!!def.rtl}
        onChange={(v) => onChange({ rtl: v })}
        tooltip="Writing starts from the right of the page and continues to the left."
      />
      <FormRow>
        <Label>Default value</Label>
        <textarea
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </FormRow>
      <FormRow>
        <Label>Maximum characters</Label>
        <NumberStepper
          value={def.max_length}
          onChange={(v) => onChange({ max_length: v })}
          min={0}
        />
      </FormRow>
      <FormRow>
        <Label>Regex validation</Label>
        <textarea
          value={def.regex ?? ''}
          onChange={(e) => onChange({ regex: e.target.value || undefined })}
          rows={2}
          placeholder="^[a-z]+$"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <p className="mt-1 text-xs text-gray-400">
          Validates the field value against this regular expression
        </p>
      </FormRow>
    </>
  );
}

export function TextareaOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Textarea Field Options</SectionTitle>
      <CheckboxRow
        label="Enable RTL"
        checked={!!def.rtl}
        onChange={(v) => onChange({ rtl: v })}
        tooltip="Writing starts from the right of the page and continues to the left."
      />
      <FormRow>
        <Label>Maximum characters</Label>
        <NumberStepper
          value={def.max_length}
          onChange={(v) => onChange({ max_length: v })}
          min={0}
        />
      </FormRow>
      <FormRow>
        <Label>Default value</Label>
        <textarea
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </FormRow>
      <FormRow>
        <Label>Regex validation</Label>
        <textarea
          value={def.regex ?? ''}
          onChange={(e) => onChange({ regex: e.target.value || undefined })}
          rows={2}
          placeholder="^[a-z]+$"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <p className="mt-1 text-xs text-gray-400">
          Validates the field value against this regular expression
        </p>
      </FormRow>
    </>
  );
}
