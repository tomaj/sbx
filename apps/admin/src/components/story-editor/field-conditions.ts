import type { FieldConditions } from '@/components/block-library/edit-block-modal/types';

/**
 * Evaluates field visibility conditions against a content object.
 * Returns true if the field should be visible (conditions pass or are missing).
 */
export function evaluateFieldConditions(
  conditions: FieldConditions | undefined,
  content: Record<string, any>,
): boolean {
  if (!conditions?.rule_conditions || conditions.rule_conditions.length === 0) {
    return true;
  }

  const results = conditions.rule_conditions.map((rule) => {
    const actual = content[rule.field];
    const expected = rule.value;

    switch (rule.validation) {
      case 'empty':
        return isEmpty(actual);
      case 'not_empty':
        return !isEmpty(actual);
      case 'equal':
        return String(actual ?? '') === String(expected ?? '');
      case 'not_equal':
        return String(actual ?? '') !== String(expected ?? '');
      case 'greater':
        return Number(actual) > Number(expected);
      case 'less':
        return Number(actual) < Number(expected);
      default:
        return true;
    }
  });

  return conditions.validation === 'all' ? results.every(Boolean) : results.some(Boolean);
}

function isEmpty(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}
