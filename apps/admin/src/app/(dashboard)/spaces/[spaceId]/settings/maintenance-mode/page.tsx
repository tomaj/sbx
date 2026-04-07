import type { Metadata } from 'next';
import MaintenanceModePage from './page.client';

export const metadata: Metadata = { title: 'Maintenance Mode' };

export default function Page({ params }: { params: Promise<{ spaceId: string }> }) {
  return <MaintenanceModePage params={params} />;
}
