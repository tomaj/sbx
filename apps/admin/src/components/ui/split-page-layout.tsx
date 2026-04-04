import type { ReactNode } from 'react';

interface SplitPageLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarWidth?: string;
}

export function SplitPageLayout({
  sidebar,
  children,
  sidebarWidth = 'w-60',
}: SplitPageLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div
        className={`${sidebarWidth} shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto py-4 px-3 gap-1`}
      >
        {sidebar}
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}
