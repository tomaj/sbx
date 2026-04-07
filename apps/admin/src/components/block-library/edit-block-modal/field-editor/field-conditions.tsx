'use client';

import { Trash2, Plus } from 'lucide-react';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { type FieldConditions, type FieldConditionRule, type WorkingField } from '../types';
import { FormRow, SectionTitle } from './form-primitives';

const VALIDATION_OPTIONS: Array<{
  value: FieldConditionRule['validation'];
  label: string;
  hasValue: boolean;
}> = [
  { value: 'empty', label: 'Is empty', hasValue: false },
  { value: 'not_empty', label: 'Is not empty', hasValue: false },
  { value: 'equal', label: 'Is equal to', hasValue: true },
  { value: 'not_equal', label: 'Is not equal to', hasValue: true },
  { value: 'greater', label: 'Is greater than', hasValue: true },
  { value: 'less', label: 'Is less than', hasValue: true },
];

export function FieldConditionsSection({
  conditions,
  allFields,
  currentKey,
  onChange,
}: {
  conditions: FieldConditions | undefined;
  allFields: WorkingField[];
  currentKey: string;
  onChange: (c: FieldConditions | undefined) => void;
}) {
  const availableFields = allFields.filter(
    (f) => f.key !== currentKey && f.def.type !== 'tab' && f.def.type !== 'section',
  );
  const rules = conditions?.rule_conditions ?? [];

  function addRule() {
    const firstField = availableFields[0]?.key ?? '';
    const newRule: FieldConditionRule = { field: firstField, validation: 'not_empty' };
    onChange({
      validation: conditions?.validation ?? 'any',
      rule_conditions: [...rules, newRule],
    });
  }

  function removeRule(idx: number) {
    const next = rules.filter((_, i) => i !== idx);
    if (next.length === 0) {
      onChange(undefined);
    } else {
      onChange({ validation: conditions!.validation, rule_conditions: next });
    }
  }

  function updateRule(idx: number, patch: Partial<FieldConditionRule>) {
    onChange({
      validation: conditions!.validation,
      rule_conditions: rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  }

  function setMode(v: 'any' | 'all') {
    onChange({ validation: v, rule_conditions: rules });
  }

  return (
    <>
      <SectionTitle>Field Conditions</SectionTitle>

      {rules.length > 0 && (
        <FormRow>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span>If</span>
            <SelectDropdown
              compact
              value={conditions!.validation}
              onChange={(v) => setMode((v ?? 'any') as 'any' | 'all')}
              options={[
                { value: 'any', label: 'any' },
                { value: 'all', label: 'all' },
              ]}
            />
            <span>of the following conditions are true</span>
          </div>
        </FormRow>
      )}

      <div className="space-y-2 mb-2">
        {rules.map((rule, idx) => {
          const valOpt = VALIDATION_OPTIONS.find((o) => o.value === rule.validation);
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs text-gray-400 w-5 pt-2.5 flex-shrink-0 text-right">
                {idx === 0 ? 'if' : 'and'}
              </span>
              <div className="flex-1 flex flex-col gap-1.5">
                <SelectDropdown
                  value={rule.field}
                  onChange={(v) => updateRule(idx, { field: v ?? '' })}
                  options={
                    availableFields.length === 0
                      ? [{ value: '', label: 'No fields available' }]
                      : availableFields.map((f) => ({
                          value: f.key,
                          label: (f.def as any).display_name || f.key,
                        }))
                  }
                />
                <SelectDropdown
                  value={rule.validation}
                  onChange={(v) =>
                    updateRule(idx, {
                      validation: (v ?? 'empty') as FieldConditionRule['validation'],
                      value: undefined,
                    })
                  }
                  options={VALIDATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
                {valOpt?.hasValue && (
                  <input
                    type="text"
                    value={rule.value ?? ''}
                    onChange={(e) => updateRule(idx, { value: e.target.value || undefined })}
                    placeholder="Value..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeRule(idx)}
                className="mt-2 p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium"
      >
        <Plus className="w-4 h-4" />
        Add a condition
      </button>
    </>
  );
}
