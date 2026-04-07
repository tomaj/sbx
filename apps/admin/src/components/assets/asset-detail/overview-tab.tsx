'use client';

import { Wand2 } from 'lucide-react';
import { TagsMultiselect } from '@/components/ui/tags-multiselect';
import { DateField } from '@/components/ui/date-field';
import { env } from '@/env';
import type { Asset } from '../asset-grid';
import type { CustomMetadataField } from './utils';

const API_URL = env.NEXT_PUBLIC_API_URL;

interface OverviewTabProps {
  asset: Asset;
  spaceId: string;
  isImage: boolean;
  customFields: CustomMetadataField[];
  title: string;
  setTitle: (v: string) => void;
  alt: string;
  setAlt: (v: string) => void;
  copyright: string;
  setCopyright: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  expireAt: string;
  setExpireAt: (v: string) => void;
  locked: boolean;
  setLocked: (v: boolean) => void;
  internalTags: { id: number; name: string }[];
  setInternalTags: (v: { id: number; name: string }[]) => void;
  customFieldValues: Record<string, string>;
  setCustomFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  errors: { title?: string; alt?: string };
  setErrors: React.Dispatch<React.SetStateAction<{ title?: string; alt?: string }>>;
  generatingAlt: boolean;
  onGenerateAltText: () => void;
}

export function OverviewTab({
  asset,
  spaceId,
  isImage,
  customFields,
  title,
  setTitle,
  alt,
  setAlt,
  copyright,
  setCopyright,
  source,
  setSource,
  expireAt,
  setExpireAt,
  locked,
  setLocked,
  internalTags,
  setInternalTags,
  customFieldValues,
  setCustomFieldValues,
  errors,
  setErrors,
  generatingAlt,
  onGenerateAltText,
}: OverviewTabProps) {
  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title/Caption <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 ${errors.title ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-teal-500 focus:border-teal-500'}`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Alt text <span className="text-red-500">*</span>
          </label>
          {isImage && (
            <button
              onClick={onGenerateAltText}
              disabled={generatingAlt}
              className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-3 h-3" />
              {generatingAlt ? 'Generating...' : 'Generate Alt Text'}
            </button>
          )}
        </div>
        <input
          type="text"
          value={alt}
          disabled={generatingAlt}
          onChange={(e) => {
            setAlt(e.target.value);
            setErrors((prev) => ({ ...prev, alt: undefined }));
          }}
          className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${errors.alt ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-teal-500 focus:border-teal-500'}`}
        />
        {errors.alt ? (
          <p className="mt-1 text-xs text-red-500">{errors.alt}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">Review AI-generated text for accuracy.</p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset ID</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 select-all">{asset.id}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tags
        </label>
        <TagsMultiselect
          spaceId={spaceId}
          objectType="asset"
          value={internalTags}
          onChange={setInternalTags}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Private asset</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Private assets are not available to the public and can only be accessed via an access
              token (Bearer or <code className="font-mono">?token=</code>).
            </p>
          </div>
          <button
            onClick={() => setLocked(!locked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${locked ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${locked ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
        {locked && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400 mb-1">Private URL (requires auth)</p>
            <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all select-all">
              {API_URL}/v1/spaces/{spaceId}/assets/{asset.id}/content
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Expiration date
        </label>
        <DateField
          value={expireAt}
          onChange={setExpireAt}
          placeholder="Expiration date (YYYY-MM-DD)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Copyright
        </label>
        <input
          type="text"
          value={copyright}
          onChange={(e) => setCopyright(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Source
        </label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      {customFields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.key}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input
            type="text"
            value={customFieldValues[field.key] ?? ''}
            onChange={(e) =>
              setCustomFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      ))}
    </div>
  );
}
