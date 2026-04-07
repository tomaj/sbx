'use client';

import { useRef, useEffect } from 'react';
import {
  FileText,
  Monitor,
  Layers,
  LayoutList,
  Blocks,
  MoreHorizontal,
  Image,
  Database,
  Tag,
  AppWindow,
  Settings,
} from 'lucide-react';

type LeftPanel = null | 'layers' | 'content';

interface LeftSidebarProps {
  spaceId: string;
  isFormOnly: boolean;
  showPreview: boolean;
  activeLeftPanel: LeftPanel;
  showMoreMenu: boolean;
  onTogglePreview: () => void;
  onToggleLeftPanel: (panel: LeftPanel) => void;
  onToggleMoreMenu: () => void;
  onCloseMoreMenu: () => void;
  onOpenBlockLibrary: () => void;
}

export function LeftSidebar({
  spaceId,
  isFormOnly,
  showPreview,
  activeLeftPanel,
  showMoreMenu,
  onTogglePreview,
  onToggleLeftPanel,
  onToggleMoreMenu,
  onCloseMoreMenu,
  onOpenBlockLibrary,
}: LeftSidebarProps) {
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    function handler(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        onCloseMoreMenu();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu, onCloseMoreMenu]);

  const MORE_LINKS = [
    { href: `/spaces/${spaceId}/assets`, icon: Image, label: 'Assets' },
    { href: `/spaces/${spaceId}/datasources`, icon: Database, label: 'Datasources' },
    { href: `/spaces/${spaceId}/tags`, icon: Tag, label: 'Tags' },
    { href: `/spaces/${spaceId}/block-library`, icon: AppWindow, label: 'App Directory' },
    { href: `/spaces/${spaceId}/settings`, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-14 flex flex-col items-center py-3 gap-1 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
      {!isFormOnly && (
        <SidebarButton
          onClick={onTogglePreview}
          title={showPreview ? 'Switch to Form' : 'Switch to Visual'}
          active={false}
        >
          {showPreview ? <FileText className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          <span className="text-[10px] font-medium">{showPreview ? 'Form' : 'Visual'}</span>
        </SidebarButton>
      )}

      <SidebarButton
        onClick={() => onToggleLeftPanel('layers')}
        title="Layers"
        active={activeLeftPanel === 'layers'}
      >
        <Layers className="w-4 h-4" />
        <span className="text-[10px] font-medium">Layers</span>
      </SidebarButton>

      <SidebarButton
        onClick={() => onToggleLeftPanel('content')}
        title="Content"
        active={activeLeftPanel === 'content'}
      >
        <LayoutList className="w-4 h-4" />
        <span className="text-[10px] font-medium">Content</span>
      </SidebarButton>

      <SidebarButton onClick={onOpenBlockLibrary} title="Blocks" active={false}>
        <Blocks className="w-4 h-4" />
        <span className="text-[10px] font-medium">Blocks</span>
      </SidebarButton>

      <div ref={moreMenuRef} className="relative">
        <SidebarButton onClick={onToggleMoreMenu} title="More" active={showMoreMenu}>
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-[10px] font-medium">More</span>
        </SidebarButton>

        {showMoreMenu && (
          <div className="absolute left-full top-0 ml-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
            {MORE_LINKS.map(({ href, icon: Icon, label }) => (
              <a
                key={href}
                href={href}
                onClick={onCloseMoreMenu}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                {label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-lg transition-colors ${
        active
          ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400'
          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      {children}
    </button>
  );
}
