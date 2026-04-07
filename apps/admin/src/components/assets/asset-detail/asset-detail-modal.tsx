'use client';

import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Folder, RefreshCcw, Trash2, X, ImageIcon } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { AssetThumb } from '../asset-thumb';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { MoveFolderModal } from '../move-folder-modal';
import { ImageEditorModal } from '../image-editor-modal';
import type { Asset } from '../asset-grid';
import type { AssetFolder } from '../folder-tree';
import { env } from '@/env';
import { useApi } from '@/lib/swr';
import { formatBytes, formatExt, assetPublicUrl, contentTypeToFiletype } from './utils';
import type { CustomMetadataField } from './utils';
import { useAssetForm } from './use-asset-form';
import { OverviewTab } from './overview-tab';
import { ReferencesTab } from './references-tab';

const API_URL = env.NEXT_PUBLIC_API_URL;

interface AssetDetailModalProps {
  asset: Asset;
  spaceId: string;
  folders?: AssetFolder[];
  onClose: () => void;
  onDeleted: (asset: Asset) => void;
  onSaved: (asset: Asset) => void;
}

export function AssetDetailModal({
  asset: initialAsset,
  spaceId,
  folders = [],
  onClose,
  onDeleted,
  onSaved,
}: AssetDetailModalProps) {
  const [tab, setTab] = useState<'overview' | 'references'>('overview');

  const { data: assetData } = useApi<{ asset: Asset }>(
    `/api/admin/spaces/${spaceId}/assets/${initialAsset.id}`,
  );
  const asset: Asset = assetData?.asset ?? initialAsset;

  const { data: spaceData } = useApi<{
    space: { asset_library_settings?: { customMetadataFields?: CustomMetadataField[] } };
  }>(`/api/admin/spaces/${spaceId}/space`);

  const assetFiletype = contentTypeToFiletype(asset.content_type);
  const customFields: CustomMetadataField[] = (
    spaceData?.space?.asset_library_settings?.customMetadataFields ?? []
  ).filter(
    (f) =>
      !f.filetypes?.length || f.filetypes.includes('any') || f.filetypes.includes(assetFiletype),
  );

  const form = useAssetForm({
    initialAsset,
    freshAsset: assetData?.asset,
    customMetadataFields: spaceData?.space?.asset_library_settings?.customMetadataFields ?? [],
  });

  const referencesQs = new URLSearchParams();
  referencesQs.set('reference_search[]', asset.filename);
  referencesQs.set('per_page', '25');
  const { data: referencesData, isLoading: referencesLoading } = useApi<{
    stories: any[];
    total: number;
  }>(tab === 'references' ? `/api/admin/spaces/${spaceId}/stories?${referencesQs}` : null);
  const referenceStories = referencesData?.stories ?? [];
  const referencesTotal = referencesData?.total ?? 0;

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; alt?: string }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [generatingAlt, setGeneratingAlt] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const [focusMode, setFocusMode] = useState(false);

  function parseFocus(focusStr: string): { left: number; top: number } | null {
    if (!focusStr) return null;
    const match = focusStr.match(/^(\d+)x(\d+):/);
    if (!match) return null;
    const px = parseInt(match[1], 10);
    const py = parseInt(match[2], 10);
    const imgW = (asset as any).meta_data?.width;
    const imgH = (asset as any).meta_data?.height;
    if (!imgW || !imgH) return null;
    return { left: (px / imgW) * 100, top: (py / imgH) * 100 };
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!focusMode) return;
    const container = imageContainerRef.current;
    if (!container) return;
    const imgEl = container.querySelector('img');
    if (!imgEl) return;
    const rect = imgEl.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const imgW = (asset as any).meta_data?.width ?? 1000;
    const imgH = (asset as any).meta_data?.height ?? 1000;
    const px = Math.round(relX * imgW);
    const py = Math.round(relY * imgH);
    form.setFocus(`${px}x${py}:${px + 1}x${py + 1}`);
    setFocusMode(false);
  }

  const width = (asset as any).meta_data?.width;
  const height = (asset as any).meta_data?.height;

  const isImage = asset.content_type.startsWith('image/');

  const folderLabel = asset.asset_folder_id ? `Folder ${asset.asset_folder_id}` : null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleGenerateAltText() {
    setGeneratingAlt(true);
    setErrors((prev) => ({ ...prev, alt: undefined }));
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}/ai/alt-text`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.alt_text) form.setAlt(data.alt_text);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrors((prev) => ({ ...prev, alt: data.message ?? 'Failed to generate alt text' }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, alt: 'Failed to generate alt text' }));
    } finally {
      setGeneratingAlt(false);
    }
  }

  async function handleSave() {
    const newErrors: { title?: string; alt?: string } = {};
    if (!form.title.trim()) newErrors.title = 'Title/Caption is required';
    if (!form.alt.trim()) newErrors.alt = 'Alt text is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.getPayload(asset)),
      });
      if (res.ok) {
        const updated = await res.json();
        onSaved({ ...asset, ...updated });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      onDeleted(asset);
      onClose();
    }
  }

  async function handleReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}/replace`, {
      method: 'POST',
      body: fd,
    });
    if (res.ok) {
      const updated = await res.json();
      onSaved({ ...asset, ...updated });
    }
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  }

  function openInNewWindow() {
    const url = form.locked
      ? `${API_URL}/v1/spaces/${spaceId}/assets/${asset.id}/content`
      : assetPublicUrl(asset.filename);
    window.open(url, '_blank');
  }

  async function handleMove(folderId: number | null) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setShowMoveModal(false);
      onSaved({ ...asset, ...updated });
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              {folderLabel && <p className="text-xs text-gray-400 mb-0.5">in {folderLabel}/</p>}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                    {asset.short_filename || asset.filename.split('/').pop()}
                  </h2>
                  <p className="text-sm text-gray-400">{formatExt(asset.content_type)}</p>
                </div>
                {isImage && (
                  <div className="flex items-center gap-2">
                    <div className="relative group/fp">
                      <button
                        onClick={() => setFocusMode((v) => !v)}
                        title="Set focus point"
                        className={`p-2 rounded-lg border transition-colors ${
                          focusMode
                            ? 'bg-teal-50 dark:bg-teal-950 border-teal-400 text-teal-600 dark:text-teal-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <circle cx="8" cy="8" r="3" />
                          <path d="M8 1v3M8 12v3M1 8h3M12 8h3" />
                        </svg>
                      </button>
                      {focusMode && (
                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                          Click on image to add focus point
                        </div>
                      )}
                      {!focusMode && form.focus && (
                        <button
                          onClick={() => form.setFocus('')}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center hover:bg-red-600"
                          title="Remove focus point"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setShowImageEditor(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Open image editor
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div
              className="flex-1 flex items-center justify-center overflow-hidden bg-[length:20px_20px] bg-[position:0_0,10px_10px]"
              style={{
                backgroundImage: isImage
                  ? 'linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(135deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(135deg,transparent 75%,#e5e7eb 75%)'
                  : undefined,
                backgroundColor: isImage ? '#f9fafb' : '#f3f4f6',
                cursor: focusMode ? 'crosshair' : 'default',
              }}
              onClick={handleImageClick}
            >
              <div
                ref={imageContainerRef}
                className="relative flex items-center justify-center w-full h-full p-6"
              >
                <AssetThumb
                  filename={asset.filename}
                  contentType={asset.content_type}
                  spaceId={spaceId}
                  alt={asset.alt}
                  size={1200}
                  imgClassName="max-w-full max-h-full w-auto h-auto object-contain"
                  iconClassName="w-24 h-24 text-gray-400"
                />
                {isImage &&
                  (() => {
                    const fp = parseFocus(form.focus);
                    if (!fp) return null;
                    const imgEl = imageContainerRef.current?.querySelector('img');
                    if (!imgEl) return null;
                    const rect = imgEl.getBoundingClientRect();
                    const containerRect = imageContainerRef.current!.getBoundingClientRect();
                    const dotLeft = rect.left - containerRect.left + rect.width * (fp.left / 100);
                    const dotTop = rect.top - containerRect.top + rect.height * (fp.top / 100);
                    return (
                      <div
                        key={form.focus}
                        className="absolute w-4 h-4 rounded-full bg-teal-500 border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
                        style={{ left: dotLeft, top: dotTop }}
                      />
                    );
                  })()}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-8 text-sm">
              <div>
                <span className="text-gray-400 text-xs block">Width &amp; Height</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {width && height ? `${width} x ${height}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Size</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {formatBytes(asset.content_length)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Format</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {formatExt(asset.content_type)}
                </span>
              </div>
            </div>
          </div>

          <div className="w-96 shrink-0 flex flex-col">
            <div className="flex items-center justify-end gap-1 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <input
                ref={replaceInputRef}
                type="file"
                className="hidden"
                onChange={handleReplace}
              />
              <CopyButton
                text={
                  form.locked
                    ? `${API_URL}/v1/spaces/${spaceId}/assets/${asset.id}/content`
                    : assetPublicUrl(asset.filename)
                }
              />
              <button
                title="Open in new window"
                onClick={openInNewWindow}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                title="Move to folder"
                onClick={() => setShowMoveModal(true)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Folder className="w-4 h-4" />
              </button>
              <button
                title="Replace asset"
                onClick={() => replaceInputRef.current?.click()}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
              <button
                title="Delete"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                title="Close"
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
              {(['overview', 'references'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-3 px-1 mr-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {tab === 'overview' ? (
                <OverviewTab
                  asset={asset}
                  spaceId={spaceId}
                  isImage={isImage}
                  customFields={customFields}
                  title={form.title}
                  setTitle={form.setTitle}
                  alt={form.alt}
                  setAlt={form.setAlt}
                  copyright={form.copyright}
                  setCopyright={form.setCopyright}
                  source={form.source}
                  setSource={form.setSource}
                  expireAt={form.expireAt}
                  setExpireAt={form.setExpireAt}
                  locked={form.locked}
                  setLocked={form.setLocked}
                  internalTags={form.internalTags}
                  setInternalTags={form.setInternalTags}
                  customFieldValues={form.customFieldValues}
                  setCustomFieldValues={form.setCustomFieldValues}
                  errors={errors}
                  setErrors={setErrors}
                  generatingAlt={generatingAlt}
                  onGenerateAltText={handleGenerateAltText}
                />
              ) : (
                <ReferencesTab
                  spaceId={spaceId}
                  referencesLoading={referencesLoading}
                  referencesTotal={referencesTotal}
                  referenceStories={referenceStories}
                />
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save & Close'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Asset"
        message={`Are you sure you want to delete "${asset.short_filename || asset.filename.split('/').pop()}"?`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showImageEditor && (
        <ImageEditorModal
          asset={asset}
          spaceId={spaceId}
          onClose={() => setShowImageEditor(false)}
          onSaved={() => {
            setShowImageEditor(false);
            onSaved(asset);
          }}
        />
      )}

      <MoveFolderModal
        open={showMoveModal}
        count={1}
        folders={folders}
        onConfirm={handleMove}
        onCancel={() => setShowMoveModal(false)}
      />
    </>
  );
}
