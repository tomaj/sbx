import type { Metadata } from 'next';
import { OrgSpacesClient } from './client';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Spaces' };

async function getSpaces() {
  const res = await apiFetch('/v1/admin/spaces', { cache: 'no-store' } as RequestInit);
  if (!res.ok) return [];
  const data = await res.json();
  return data.spaces ?? [];
}

export default async function OrgSpacesPage() {
  const spaces = await getSpaces();
  return <OrgSpacesClient spaces={spaces} />;
}
