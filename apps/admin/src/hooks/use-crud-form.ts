'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DefaultValues, FieldValues, UseFormReturn } from 'react-hook-form';
import type { ZodType } from 'zod';

export interface UseCrudFormOptions<TItem, TFormValues extends FieldValues> {
  schema: ZodType<TFormValues>;
  defaultValues: DefaultValues<TFormValues>;
  /**
   * Current sidebar mode ('create' | 'edit').
   * Used to know whether to reset to empty or item values.
   */
  mode: 'create' | 'edit';
  /** Currently selected item (in edit mode). */
  item: TItem | null;
  /** Whether the sidebar is currently open. Used as reset trigger. */
  open: boolean;
  /**
   * Maps the selected item to initial form values.
   * Called when mode === 'edit' and item is not null.
   */
  getInitialValues: (item: TItem) => DefaultValues<TFormValues>;
  /**
   * Build the fetch request for create/update.
   * Must return a Promise<Response>.
   */
  buildRequest: (
    values: TFormValues,
    mode: 'create' | 'edit',
    item: TItem | null,
  ) => Promise<Response>;
  /** Called after a successful save. */
  onSuccess: () => void;
}

export interface UseCrudFormReturn<TFormValues extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<TFormValues, any, any>;
  /** Pass as onSubmit to <form> */
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

/**
 * Encapsulates the repeated create/edit form pattern:
 *  - useForm with zod resolver
 *  - reset on open/mode/item change
 *  - submit handler with standardised error handling (errors.root)
 *
 * Usage:
 *   const { form, onSubmit } = useCrudForm({
 *     schema: tagSchema,
 *     defaultValues: { name: '' },
 *     mode: sidebarMode,
 *     item: selectedTag,
 *     open: sidebarOpen,
 *     getInitialValues: (tag) => ({ name: tag.name }),
 *     onSuccess: () => { close(); mutate() },
 *     buildRequest: (values, mode, item) => fetch(
 *       mode === 'create' ? '/api/admin/.../tags' : `/api/admin/.../tags/${item!.id}`,
 *       { method: mode === 'create' ? 'POST' : 'PATCH', ... }
 *     ),
 *   })
 */
export function useCrudForm<TItem, TFormValues extends FieldValues>({
  schema,
  defaultValues,
  mode,
  item,
  open,
  getInitialValues,
  onSuccess,
  buildRequest,
}: UseCrudFormOptions<TItem, TFormValues>): UseCrudFormReturn<TFormValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<TFormValues, any, any>({
    // @ts-expect-error — zod v4 minor version literal mismatch with @hookform/resolvers types
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && item) {
        form.reset(getInitialValues(item));
      } else {
        form.reset(defaultValues);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, mode]);

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await buildRequest(values as TFormValues, mode, item);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      form.setError('root', { message: err?.message ?? 'Failed to save' });
      return;
    }
    onSuccess();
  });

  return { form, onSubmit };
}
