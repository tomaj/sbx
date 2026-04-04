'use client';

import { useState } from 'react';
import type { ReactNode, BaseSyntheticEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { RightSidebar } from '@/components/ui/right-sidebar';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal';

interface CrudSidebarFormProps {
  open: boolean;
  /** Called when the sidebar should close. If isDirty, UnsavedChangesModal is shown first. */
  onClose: () => void;
  title: string;
  /** form.formState.isSubmitting */
  isSubmitting?: boolean;
  /** form.formState.isDirty — if true, closing shows UnsavedChangesModal */
  isDirty?: boolean;
  /**
   * Form submit handler. For useCrudForm users: pass the `onSubmit` returned by useCrudForm.
   * For noForm=true users: pass a click handler.
   */
  onSubmit: (e?: BaseSyntheticEvent) => void;
  /** If provided, a Delete button appears on the left of the footer */
  onDelete?: () => Promise<void> | void;
  deleteTitle?: string;
  deleteMessage?: string;
  children: ReactNode;
  width?: string;
  /**
   * When true, children are NOT wrapped in a <form> tag.
   * Use this when the form uses manual state (not react-hook-form),
   * or when the children already manage their own submission.
   */
  noForm?: boolean;
}

/**
 * Standard CRUD sidebar form wrapper.
 *
 * Wraps RightSidebar with:
 * - Standardized footer: [Delete?] [Cancel] [Save]
 * - UnsavedChangesModal when closing with dirty form
 * - ConfirmModal for delete (when onDelete is provided)
 *
 * Usage (with useCrudForm):
 *   <CrudSidebarForm
 *     open={sidebarOpen}
 *     onClose={closeSidebar}
 *     title={mode === 'create' ? 'New Tag' : 'Edit Tag'}
 *     isSubmitting={form.formState.isSubmitting}
 *     isDirty={form.formState.isDirty}
 *     onSubmit={onSubmit}
 *     onDelete={selected ? handleDelete : undefined}
 *     deleteTitle="Delete Tag"
 *     deleteMessage={`Delete "${selected?.name}"?`}
 *   >
 *     <Controller name="name" ... />
 *   </CrudSidebarForm>
 */
export function CrudSidebarForm({
  open,
  onClose,
  title,
  isSubmitting = false,
  isDirty = false,
  onSubmit,
  onDelete,
  deleteTitle = 'Delete',
  deleteMessage = 'Are you sure you want to delete this item?',
  children,
  width = 'w-[420px]',
  noForm = false,
}: CrudSidebarFormProps) {
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleClose() {
    if (isDirty) {
      setShowUnsaved(true);
    } else {
      onClose();
    }
  }

  async function handleDeleteConfirm() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div>
        {onDelete && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type={noForm ? 'button' : 'submit'}
          form={noForm ? undefined : 'crud-sidebar-form'}
          onClick={noForm ? onSubmit : undefined}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <RightSidebar
        open={open}
        onClose={handleClose}
        width={width}
        header={
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        }
        footer={footer}
      >
        {noForm ? (
          children
        ) : (
          <form id="crud-sidebar-form" onSubmit={onSubmit}>
            {children}
          </form>
        )}
      </RightSidebar>

      {onDelete && (
        <ConfirmModal
          open={showDeleteConfirm}
          title={deleteTitle}
          message={deleteMessage}
          confirmLabel="Delete"
          dangerous
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <UnsavedChangesModal
        open={showUnsaved}
        onConfirm={() => {
          setShowUnsaved(false);
          onClose();
        }}
        onCancel={() => setShowUnsaved(false)}
      />
    </>
  );
}
