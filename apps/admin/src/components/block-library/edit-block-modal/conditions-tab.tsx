'use client';

import { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import type { FieldConditions, FieldConditionRule, WorkingField } from './types';

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

interface ConditionsTabProps {
  fields: WorkingField[];
  onFieldsChange: (fields: WorkingField[]) => void;
}

export function ConditionsTab({ fields, onFieldsChange }: ConditionsTabProps) {
  const editableFields = fields.filter((f) => f.def.type !== 'tab' && f.def.type !== 'section');

  const fieldsWithConditions = editableFields.filter(
    (f) => (f.def as any).conditions?.rule_conditions?.length > 0,
  );
  const fieldsWithoutConditions = editableFields.filter(
    (f) => !(f.def as any).conditions?.rule_conditions?.length,
  );

  function updateFieldConditions(fieldKey: string, conditions: FieldConditions | undefined) {
    onFieldsChange(
      fields.map((f) => {
        if (f.key !== fieldKey) return f;
        const newDef = { ...f.def } as any;
        if (conditions && conditions.rule_conditions.length > 0) {
          newDef.conditions = conditions;
        } else {
          delete newDef.conditions;
        }
        return { ...f, def: newDef };
      }),
    );
  }

  if (editableFields.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p className="text-sm">No fields to configure conditions for</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="mb-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
          Field visibility conditions
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Control when fields are visible based on the values of other fields. Hidden fields keep
          their values but are not shown to editors.
        </p>
      </div>

      {/* Fields with conditions */}
      {fieldsWithConditions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            Fields with conditions ({fieldsWithConditions.length})
          </p>
          <div className="space-y-2">
            {fieldsWithConditions.map((field) => (
              <FieldConditionCard
                key={field.key}
                field={field}
                allFields={editableFields}
                onUpdate={(c) => updateFieldConditions(field.key, c)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fields without conditions */}
      {fieldsWithoutConditions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            {fieldsWithConditions.length > 0
              ? `Always visible (${fieldsWithoutConditions.length})`
              : `All fields (${fieldsWithoutConditions.length})`}
          </p>
          <div className="space-y-1">
            {fieldsWithoutConditions.map((field) => (
              <FieldConditionCard
                key={field.key}
                field={field}
                allFields={editableFields}
                onUpdate={(c) => updateFieldConditions(field.key, c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldConditionCard({
  field,
  allFields,
  onUpdate,
}: {
  field: WorkingField;
  allFields: WorkingField[];
  onUpdate: (c: FieldConditions | undefined) => void;
}) {
  const conditions = (field.def as any).conditions as FieldConditions | undefined;
  const hasConditions = !!conditions?.rule_conditions?.length;
  const [expanded, setExpanded] = useState(hasConditions);
  const rules = conditions?.rule_conditions ?? [];
  const availableFields = allFields.filter((f) => f.key !== field.key);

  function addRule() {
    const firstField = availableFields[0]?.key ?? '';
    const newRule: FieldConditionRule = { field: firstField, validation: 'not_empty' };
    onUpdate({
      validation: conditions?.validation ?? 'any',
      rule_conditions: [...rules, newRule],
    });
    setExpanded(true);
  }

  function removeRule(idx: number) {
    const next = rules.filter((_, i) => i !== idx);
    onUpdate(
      next.length === 0 ? undefined : { validation: conditions!.validation, rule_conditions: next },
    );
  }

  function updateRule(idx: number, patch: Partial<FieldConditionRule>) {
    onUpdate({
      validation: conditions!.validation,
      rule_conditions: rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  }

  function setMode(v: 'any' | 'all') {
    onUpdate({ validation: v, rule_conditions: rules });
  }

  const displayName = (field.def as any).display_name || field.key;

  return (
    <div
      className={`border rounded-lg transition-colors ${
        hasConditions
          ? 'border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-900/10'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        {hasConditions ? (
          <EyeOff className="w-4 h-4 text-teal-500 flex-shrink-0" />
        ) : (
          <Eye className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {displayName}
          </p>
          {hasConditions && (
            <p className="text-xs text-teal-600 dark:text-teal-400">
              {rules.length} condition{rules.length !== 1 ? 's' : ''} (
              {conditions!.validation === 'all' ? 'all must match' : 'any must match'})
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400 mr-1">{field.def.type}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded rules editor */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
          {rules.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
              <span>Show this field if</span>
              <SelectDropdown
                compact
                value={conditions!.validation}
                onChange={(v) => setMode((v ?? 'any') as 'any' | 'all')}
                options={[
                  { value: 'any', label: 'any' },
                  { value: 'all', label: 'all' },
                ]}
              />
              <span>of these are true:</span>
            </div>
          )}

          <div className="space-y-2 mb-3">
            {rules.map((rule, idx) => {
              const valOpt = VALIDATION_OPTIONS.find((o) => o.value === rule.validation);
              return (
                <div key={idx} className="flex items-start gap-2">
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
                        className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add condition
          </button>
        </div>
      )}
    </div>
  );
}
