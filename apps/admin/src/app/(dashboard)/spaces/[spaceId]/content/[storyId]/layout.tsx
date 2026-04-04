import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Story Editor' };

// Story detail uses its own full-screen layout (no dashboard sidebar wrapper)
export default function StoryDetailLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">{children}</div>;
}
