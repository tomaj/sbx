'use client';

import { FormRow, Label, CheckboxRow, NumberStepper, SectionTitle } from '../form-primitives';

export function RichtextOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Richtext Field Options</SectionTitle>
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
        <Label>Custom CSS class</Label>
        <input
          type="text"
          value={def.custom_class ?? ''}
          onChange={(e) => onChange({ custom_class: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </FormRow>
    </>
  );
}

export function MarkdownOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Markdown Field Options</SectionTitle>
      <CheckboxRow
        label="Enable RTL"
        checked={!!def.rtl}
        onChange={(v) => onChange({ rtl: v })}
        tooltip="Writing starts from the right of the page and continues to the left."
      />
      <CheckboxRow
        label="Rich-text as default"
        checked={!!def.rich_text_as_default}
        onChange={(v) => onChange({ rich_text_as_default: v })}
        tooltip="When enabled, the editor opens in rich-text mode by default instead of markdown mode."
      />
      <CheckboxRow
        label="Allow empty paragraphs"
        checked={!!def.allow_empty_paragraphs}
        onChange={(v) => onChange({ allow_empty_paragraphs: v })}
        tooltip="Allows the field to contain paragraphs with no content."
      />
      <CheckboxRow
        label="Customize toolbar items"
        checked={!!def.customize_toolbar}
        onChange={(v) => onChange({ customize_toolbar: v })}
        tooltip="Select which toolbar buttons are available in the editor."
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
    </>
  );
}
