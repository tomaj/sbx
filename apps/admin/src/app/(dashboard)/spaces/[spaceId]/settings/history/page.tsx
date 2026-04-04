import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'History' };

export default function Page() {
  return (
    <div className="max-w-3xl px-10 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">History</h1>
      <p className="text-sm text-gray-400">Coming soon.</p>
    </div>
  );
}
