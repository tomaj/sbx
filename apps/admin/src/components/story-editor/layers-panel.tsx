'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Search, File, Box } from 'lucide-react';

function formatName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getSubtitle(block: Record<string, any>): string {
  for (const key of ['label', 'title', 'name', 'headline']) {
    const val = block[key];
    if (typeof val === 'string' && val.trim()) {
      const t = val.trim();
      return t.length > 60 ? `${t.slice(0, 60)}...` : t;
    }
  }
  for (const [key, val] of Object.entries(block)) {
    if (key === '_uid' || key === 'component') continue;
    if (typeof val === 'string' && val.trim()) {
      const t = val.trim();
      if (t.length < 200) return t.length > 60 ? `${t.slice(0, 60)}...` : t;
    }
  }
  return '';
}

function getChildArrays(
  block: Record<string, any>,
): Array<{ fieldName: string; items: Record<string, any>[] }> {
  return Object.entries(block)
    .filter(([key]) => key !== '_uid' && key !== 'component')
    .filter(([, val]) => Array.isArray(val))
    .map(([key, val]) => ({
      fieldName: key,
      items: (val as any[]).filter(
        (item): item is Record<string, any> =>
          item != null && typeof item === 'object' && typeof item.component === 'string',
      ),
    }))
    .filter(({ items }) => items.length > 0);
}

function blockMatchesSearch(block: Record<string, any>, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const name = formatName(block.component || '').toLowerCase();
  const subtitle = getSubtitle(block).toLowerCase();
  if (name.includes(q) || subtitle.includes(q)) return true;
  return getChildArrays(block).some(({ items }) =>
    items.some((item) => blockMatchesSearch(item, q)),
  );
}

interface FieldGroupProps {
  fieldName: string;
  items: Record<string, any>[];
  searchQuery: string;
  collapseKey: number;
}

function FieldGroup({ fieldName, items, searchQuery, collapseKey }: FieldGroupProps) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (collapseKey > 0) setExpanded(false);
  }, [collapseKey]);

  const forceExpand = !!searchQuery;
  const filteredItems = searchQuery
    ? items.filter((item) => blockMatchesSearch(item, searchQuery))
    : items;

  if (filteredItems.length === 0) return null;

  const isExpanded = forceExpand || expanded;

  return (
    <div>
      <button
        type="button"
        onClick={() => !forceExpand && setExpanded((e) => !e)}
        className="flex items-center gap-1 py-1 px-2 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        )}
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          {formatName(fieldName)}
        </span>
      </button>
      {isExpanded && (
        <div className="ml-3">
          {filteredItems.map((item) => (
            <LayerNode
              key={item._uid ?? item.component}
              block={item}
              searchQuery={searchQuery}
              collapseKey={collapseKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LayerNodeProps {
  block: Record<string, any>;
  searchQuery: string;
  collapseKey: number;
}

function LayerNode({ block, searchQuery, collapseKey }: LayerNodeProps) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (collapseKey > 0) setExpanded(false);
  }, [collapseKey]);

  const name = formatName(block.component || 'Unknown');
  const subtitle = getSubtitle(block);
  const childArrays = getChildArrays(block);
  const hasChildren = childArrays.length > 0;
  const forceExpand = !!searchQuery;
  const isExpanded = forceExpand || expanded;

  return (
    <div>
      <div
        className="flex items-start gap-1.5 py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md cursor-pointer select-none"
        onClick={() => hasChildren && !forceExpand && setExpanded((e) => !e)}
      >
        <div className="flex-shrink-0 mt-0.5">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            )
          ) : (
            <span className="w-3.5 h-3.5 block" />
          )}
        </div>
        <Box className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
            {name}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-400 truncate leading-tight">{subtitle}</div>
          )}
        </div>
      </div>
      {isExpanded && hasChildren && (
        <div className="ml-4 border-l border-gray-100 dark:border-gray-800 pl-1">
          {childArrays.map(({ fieldName, items }) => (
            <FieldGroup
              key={fieldName}
              fieldName={fieldName}
              items={items}
              searchQuery={searchQuery}
              collapseKey={collapseKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LayersPanelProps {
  content: Record<string, any>;
  onClose: () => void;
}

export function LayersPanel({ content, onClose }: LayersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapseKey, setCollapseKey] = useState(0);

  const rootArrays = getChildArrays(content);
  const rootName = formatName(content.component || 'Page');

  const filteredRootArrays = searchQuery
    ? rootArrays
        .map(({ fieldName, items }) => ({
          fieldName,
          items: items.filter((item) => blockMatchesSearch(item, searchQuery)),
        }))
        .filter(({ items }) => items.length > 0)
    : rootArrays;

  return (
    <div className="w-72 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden flex-shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Components layers
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Search blocks</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1.5 mb-0.5">
            <div className="flex items-center gap-1.5">
              <File className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                {rootName}
              </span>
            </div>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setCollapseKey((k) => k + 1)}
                className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline"
              >
                Collapse all
              </button>
            )}
          </div>

          {filteredRootArrays.map(({ fieldName, items }) => (
            <FieldGroup
              key={fieldName}
              fieldName={fieldName}
              items={items}
              searchQuery={searchQuery}
              collapseKey={collapseKey}
            />
          ))}

          {filteredRootArrays.length === 0 && searchQuery && (
            <p className="text-xs text-gray-400 text-center py-4">
              No blocks match &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
