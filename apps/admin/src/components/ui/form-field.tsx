import type { ReactNode } from 'react';

/**
 * Shared Tailwind class for standard text inputs and textareas.
 * Import this in form components for consistent styling.
 */
export const inputCls =
  'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500';

interface FormFieldProps {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  /** Show character counter: pass the maxLength value */
  maxLength?: number;
  /** Current value length, required when maxLength is set */
  currentLength?: number;
}

/**
 * Wrapper for a form field: label + children (input/select/etc) + description/error + optional counter.
 *
 * Usage with react-hook-form:
 *   <FormField label="Name" required error={errors.name?.message}>
 *     <input type="text" {...register('name')} className={inputCls} />
 *   </FormField>
 *
 * Usage with controlled inputs:
 *   <FormField label="Title" maxLength={100} currentLength={value.length}>
 *     <input value={value} onChange={...} maxLength={100} className={inputCls} />
 *   </FormField>
 */
export function FormField({
  label,
  required,
  description,
  error,
  children,
  maxLength,
  currentLength,
}: FormFieldProps) {
  const showMeta = error || description || maxLength !== undefined;
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {showMeta && (
        <div className="flex justify-between mt-1">
          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : description ? (
            <p className="text-xs text-gray-400">{description}</p>
          ) : (
            <span />
          )}
          {maxLength !== undefined && currentLength !== undefined && (
            <p className="text-xs text-gray-400 ml-auto">
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
