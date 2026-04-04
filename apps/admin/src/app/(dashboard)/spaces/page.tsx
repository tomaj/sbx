import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SpacesGrid } from '@/components/spaces/spaces-grid';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Spaces' };

async function getSpaces() {
  const res = await apiFetch('/v1/admin/spaces', { cache: 'no-store' } as RequestInit);
  if (res.status === 401) return null;
  if (!res.ok) return [];
  const data = await res.json();
  return data.spaces ?? [];
}

export default async function SpacesPage() {
  const spaces = await getSpaces();

  if (spaces === null) redirect('/login');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Spaces</h1>
      <SpacesGrid spaces={spaces} />
    </div>
  );
}
