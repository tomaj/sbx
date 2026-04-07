'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type {
  LinkFieldDef,
  MultilinkFieldDef,
} from '@/components/block-library/edit-block-modal/types';
import { fieldLabel } from '../../field-label';
import { FieldLabel } from '../../FieldLabel';
import type { LinkValue, LinkType, StoryItem } from './types';
import { LINK_TYPES } from './types';
import { UrlLinkTab } from './url-link-tab';
import { EmailLinkTab } from './email-link-tab';
import { StoryLinkInline, StoryLinkWarning, StoryLinkPanel } from './story-link-tab';
import { AssetLinkInline, AssetLinkCard } from './asset-link-tab';

interface Props {
  fieldKey: string;
  def: LinkFieldDef | MultilinkFieldDef;
  value: LinkValue | undefined;
  onChange: (v: LinkValue) => void;
  spaceId: string;
}

function getAvailableTypes(def: LinkFieldDef | MultilinkFieldDef): LinkType[] {
  return LINK_TYPES.filter((t) => {
    if (t.type === 'asset') return def.asset_link_type !== false;
    if (t.type === 'email') return def.email_link_type !== false;
    return true;
  }).map((t) => t.type);
}

export function LinkField({ fieldKey, def, value, onChange, spaceId }: Props) {
  const available = getAvailableTypes(def);
  const linktype: LinkType = (value?.linktype as LinkType | undefined) ?? 'url';
  const allowTarget = def.allow_target_blank ?? false;

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [storyPanelOpen, setStoryPanelOpen] = useState(false);
  const [selectedStoryName, setSelectedStoryName] = useState<string>('');
  const [selectedStoryPublished, setSelectedStoryPublished] = useState<boolean | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);

  const typeDropdownRef = useRef<HTMLDivElement>(null);

  function update(patch: Partial<LinkValue>) {
    onChange({ ...(value ?? {}), ...patch });
  }

  function selectType(t: LinkType) {
    setTypeDropdownOpen(false);
    setStoryPanelOpen(false);
    setSelectedStoryName('');
    setSelectedStoryPublished(null);
    setSelectedStoryId(null);
    onChange({ linktype: t, url: '', href: '', cached_url: '', id: '', target: value?.target });
  }

  function clearStory() {
    setSelectedStoryName('');
    setSelectedStoryPublished(null);
    setSelectedStoryId(null);
    onChange({
      linktype: 'story',
      url: '',
      href: '',
      cached_url: '',
      id: '',
      target: value?.target,
    });
  }

  function handleStorySelect(story: StoryItem) {
    update({
      linktype: 'story',
      id: story.uuid,
      url: story.full_slug,
      href: story.full_slug,
      cached_url: story.full_slug,
    });
    setSelectedStoryName(story.name);
    setSelectedStoryPublished(story.published);
    setSelectedStoryId(story.id);
    setStoryPanelOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false);
      }
    }
    if (typeDropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [typeDropdownOpen]);

  const currentType = LINK_TYPES.find((t) => t.type === linktype);
  const CurrentIcon = currentType?.Icon ?? LINK_TYPES[3].Icon;

  const displayUrl = value?.cached_url || value?.url || value?.href || '';

  const storyPanelToggle = () => setStoryPanelOpen((v) => !v);

  return (
    <div>
      <FieldLabel
        label={fieldLabel(def.display_name, fieldKey)}
        required={def.required}
        description={def.description}
      />

      {/* Main input row */}
      <div className="group/input flex items-stretch border border-gray-300 dark:border-gray-600 rounded-lg overflow-visible bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
        {/* Type selector */}
        <div className="relative flex-shrink-0" ref={typeDropdownRef}>
          <button
            type="button"
            onClick={() => setTypeDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 h-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-r border-gray-200 dark:border-gray-700 transition-colors"
          >
            <CurrentIcon className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>

          {typeDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[160px]">
              {LINK_TYPES.filter((t) => available.includes(t.type)).map(({ type, label, Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectType(type)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    type === linktype
                      ? 'text-teal-600 dark:text-teal-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {linktype === 'url' && <UrlLinkTab displayUrl={displayUrl} onUpdate={update} />}

        {linktype === 'email' && <EmailLinkTab displayUrl={displayUrl} onUpdate={update} />}

        {linktype === 'asset' && <AssetLinkInline displayUrl={displayUrl} />}

        {linktype === 'story' && (
          <StoryLinkInline
            value={value}
            def={def}
            spaceId={spaceId}
            displayUrl={displayUrl}
            selectedStoryName={selectedStoryName}
            selectedStoryPublished={selectedStoryPublished}
            selectedStoryId={selectedStoryId}
            storyPanelOpen={storyPanelOpen}
            onStoryPanelToggle={storyPanelToggle}
            onStorySelect={handleStorySelect}
            onClearStory={clearStory}
          />
        )}
      </div>

      {linktype === 'story' && (
        <StoryLinkWarning displayUrl={displayUrl} selectedStoryPublished={selectedStoryPublished} />
      )}

      {linktype === 'asset' && (
        <AssetLinkCard
          displayUrl={displayUrl}
          spaceId={spaceId}
          assetPickerOpen={assetPickerOpen}
          onAssetPickerToggle={setAssetPickerOpen}
          onUpdate={update}
        />
      )}

      {allowTarget && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Open in new window</span>
          <button
            type="button"
            role="switch"
            aria-checked={value?.target === '_blank'}
            onClick={() => update({ target: value?.target === '_blank' ? '_self' : '_blank' })}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
              value?.target === '_blank' ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                value?.target === '_blank' ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      {def.show_anchor && (linktype === 'story' || linktype === 'url') && (
        <div className="mt-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Anchor</label>
          <input
            type="text"
            value={value?.anchor ?? ''}
            onChange={(e) => update({ anchor: e.target.value })}
            placeholder="section-id"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )}

      {def.allow_custom_attributes && (
        <CustomAttributesEditor
          value={value?.custom_attributes ?? {}}
          onChange={(attrs) => update({ custom_attributes: attrs })}
        />
      )}

      {linktype === 'story' && (
        <StoryLinkPanel
          value={value}
          def={def}
          spaceId={spaceId}
          storyPanelOpen={storyPanelOpen}
          onStoryPanelToggle={storyPanelToggle}
          onStorySelect={handleStorySelect}
        />
      )}
    </div>
  );
}

function CustomAttributesEditor({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const entries = Object.entries(value);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  function addAttr() {
    const k = newKey.trim();
    if (!k) return;
    onChange({ ...value, [k]: newVal });
    setNewKey('');
    setNewVal('');
  }
  function removeAttr(k: string) {
    const next = { ...value };
    delete next[k];
    onChange(next);
  }

  return (
    <div className="mt-2">
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
        Custom attributes
      </label>
      <div className="space-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={k}
              className="w-32 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
            <input
              type="text"
              value={v}
              onChange={(e) => onChange({ ...value, [k]: e.target.value })}
              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => removeAttr(k)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="attribute"
            className="w-32 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <input
            type="text"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            placeholder="value"
            onKeyDown={(e) => e.key === 'Enter' && addAttr()}
            className="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={addAttr}
            className="px-2 py-1.5 text-xs text-teal-600 dark:text-teal-400 hover:underline"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
