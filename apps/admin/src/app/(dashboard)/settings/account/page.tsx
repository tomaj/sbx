import type { Metadata } from 'next';
import PageContent from './page.client';

export const metadata: Metadata = { title: 'Account' };

export const dynamic = 'force-dynamic';

export default function AccountPage() {
  return <PageContent />;
}
