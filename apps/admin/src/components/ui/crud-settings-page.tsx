'use client';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';

interface CrudSettingsPageProps {
  title: string;
  description?: string;
  addLabel?: string;
  onAdd?: () => void;
  children: ReactNode;
  sidebar?: ReactNode;
  extras?: ReactNode;
}

export function CrudSettingsPage({
  title,
  description,
  addLabel,
  onAdd,
  children,
  sidebar,
  extras,
}: CrudSettingsPageProps) {
  const action =
    addLabel && onAdd ? (
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        {addLabel}
      </button>
    ) : undefined;

  return (
    <>
      <PageLayout title={title} description={description} action={action}>
        {children}
      </PageLayout>
      {sidebar}
      {extras}
    </>
  );
}
