'use client';

import { useApi } from '@/lib/swr';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { FormRow, Label, CheckboxRow, SectionTitle } from '../form-primitives';

const FILETYPES = [
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'text_documents', label: 'Text-Documents' },
];

export function AssetOptions({
  def,
  onChange,
  spaceId,
}: {
  def: any;
  onChange: (patch: any) => void;
  spaceId?: string;
}) {
  const filetypes: string[] = def.filetypes ?? [];
  const isAny = filetypes.length === 0;

  const { data: foldersData, isLoading: loadingFolders } = useApi<{
    asset_folders?: Array<{ id: number; name: string }>;
    folders?: Array<{ id: number; name: string }>;
  }>(spaceId ? `/api/admin/spaces/${spaceId}/assets/folders` : null);

  const folders = foldersData?.asset_folders ?? foldersData?.folders ?? [];

  function toggleFiletype(value: string) {
    if (filetypes.includes(value)) {
      onChange({ filetypes: filetypes.filter((f: string) => f !== value) });
    } else {
      onChange({ filetypes: [...filetypes, value] });
    }
  }

  return (
    <>
      <SectionTitle>Asset Field Options</SectionTitle>
      <CheckboxRow
        label="Allow external URL"
        checked={!!def.allow_external_url}
        onChange={(v) => onChange({ allow_external_url: v })}
      />
      <FormRow>
        <Label>Filetypes</Label>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <label
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${isAny ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
          >
            <input
              type="checkbox"
              checked={isAny}
              onChange={() => onChange({ filetypes: [] })}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Any filetype</span>
          </label>
          {FILETYPES.map((ft) => (
            <label
              key={ft.value}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer border-t border-gray-100 dark:border-gray-800"
            >
              <input
                type="checkbox"
                checked={filetypes.includes(ft.value)}
                onChange={() => toggleFiletype(ft.value)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{ft.label}</span>
            </label>
          ))}
        </div>
      </FormRow>
      <FormRow>
        <Label>Default assets folder</Label>
        <SelectDropdown
          value={def.asset_folder_id != null ? String(def.asset_folder_id) : null}
          onChange={(v) => onChange({ asset_folder_id: v != null ? Number(v) : null })}
          options={folders.map((f) => ({ value: String(f.id), label: f.name }))}
          placeholder="Choose..."
          loading={loadingFolders}
        />
      </FormRow>
    </>
  );
}
