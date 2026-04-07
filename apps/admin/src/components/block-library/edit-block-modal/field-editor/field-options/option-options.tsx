'use client';

import { type OptionFieldDef, type OptionsFieldDef } from '../../types';
import { FormRow, Label, NumberStepper, SectionTitle } from '../form-primitives';
import { OptionSourceConfig, SourceSelect } from '../options-list';

export function SingleOptionOptions({
  def,
  onChange,
  spaceId,
}: {
  def: OptionFieldDef;
  onChange: (patch: any) => void;
  spaceId?: string;
}) {
  return (
    <>
      <SectionTitle>Single-Option Field Options</SectionTitle>
      <SourceSelect value={def.source ?? 'self'} onChange={(v) => onChange({ source: v })} />
      <OptionSourceConfig def={def} onChange={onChange} spaceId={spaceId} />
      <FormRow>
        <Label>Default value</Label>
        <input
          type="text"
          value={String(def.default_value ?? '')}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </FormRow>
    </>
  );
}

export function MultiOptionsOptions({
  def,
  onChange,
  spaceId,
}: {
  def: OptionsFieldDef;
  onChange: (patch: any) => void;
  spaceId?: string;
}) {
  return (
    <>
      <SectionTitle>Multi-Options Field Options</SectionTitle>
      <SourceSelect value={def.source ?? 'self'} onChange={(v) => onChange({ source: v })} />
      <OptionSourceConfig def={def} onChange={onChange} spaceId={spaceId} />
      <FormRow>
        <Label>Minimum selections</Label>
        <NumberStepper value={def.min} onChange={(v) => onChange({ min: v })} min={0} />
      </FormRow>
      <FormRow>
        <Label>Maximum selections</Label>
        <NumberStepper value={def.max} onChange={(v) => onChange({ max: v })} min={0} />
      </FormRow>
    </>
  );
}
