'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { Asset } from './asset-grid';
import type { SavedImageData } from './image-editor-inner';
import { env } from '@/env';

const CDN_URL = env.NEXT_PUBLIC_CDN_URL;

// Lazy-load the heavy editor (~1 MB) — only when the user actually opens it
const ImageEditorInner = dynamic(() => import('./image-editor-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      <p className="text-gray-500 text-sm">Loading image editor...</p>
    </div>
  ),
});

function assetCdnUrl(filename: string): string {
  const spaceMatch = filename.match(/\/f\/(\d+)\//);
  const pathMatch = filename.match(/\/f\/\d+\/(.+)$/);
  if (!spaceMatch || !pathMatch) return filename;
  return `${CDN_URL}/f/${spaceMatch[1]}/${pathMatch[1]}`;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const [, data] = base64.split(',');
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

interface ImageEditorModalProps {
  asset: Asset;
  spaceId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ImageEditorModal({ asset, spaceId, onClose, onSaved }: ImageEditorModalProps) {
  const [pending, setPending] = useState<SavedImageData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = assetCdnUrl(asset.filename);
  const ext = asset.filename.split('.').pop() ?? 'jpg';
  const baseName = (asset.short_filename || (asset.filename.split('/').pop() ?? 'edited')).replace(
    /\.[^.]+$/,
    '',
  );

  const handleSave = useCallback((data: SavedImageData) => {
    setPending(data);
    setError(null);
  }, []);

  const doUpload = useCallback(
    async (saveAsNew: boolean) => {
      if (!pending) return;
      setSaving(true);
      setError(null);

      try {
        let blob: Blob;
        if (pending.imageBase64) {
          blob = base64ToBlob(pending.imageBase64, pending.mimeType);
        } else if (pending.imageCanvas) {
          blob = await new Promise<Blob>((resolve, reject) => {
            pending.imageCanvas!.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
              pending.mimeType,
              0.95,
            );
          });
        } else {
          throw new Error('No image data available');
        }

        const outputExt = pending.extension || ext;
        const filename = saveAsNew ? `${baseName}-copy.${outputExt}` : `${baseName}.${outputExt}`;

        if (saveAsNew) {
          // 3-step MAPI flow for new asset
          const signRes = await fetch(`/api/admin/spaces/${spaceId}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, size: blob.size, content_type: pending.mimeType }),
          });
          if (!signRes.ok) throw new Error('Sign failed');
          const { id, post_url } = await signRes.json();

          const fd = new FormData();
          fd.append('file', blob, filename);
          const uploadRes = await fetch(`/api/admin${post_url}`, { method: 'POST', body: fd });
          if (!uploadRes.ok) throw new Error('Upload failed');

          const finishRes = await fetch(`/api/admin/spaces/${spaceId}/assets/${id}/finish_upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          });
          if (!finishRes.ok) throw new Error('Finish upload failed');
        } else {
          // Replace existing asset (admin endpoint — no MAPI equivalent)
          const fd = new FormData();
          fd.append('file', blob, filename);
          const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}/replace`, {
            method: 'POST',
            body: fd,
          });
          if (!res.ok) {
            const text = await res.text().catch(() => res.statusText);
            throw new Error(text || 'Replace failed');
          }
        }

        setPending(null);
        onSaved();
        if (!saveAsNew) onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [pending, asset, spaceId, ext, baseName, onSaved, onClose],
  );

  return (
    // z-[60] so it sits above the AssetDetailModal (z-50)
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <ImageEditorInner imageUrl={imageUrl} onSave={handleSave} onClose={onClose} />

      {/* Save choice overlay — appears when Filerobot fires onSave */}
      {pending && (
        <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Save image</h2>
              <p className="text-sm text-gray-500 mt-1">
                Overwrite the original file, or save as a new separate asset?
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => doUpload(false)}
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Overwrite original
              </button>
              <button
                onClick={() => doUpload(true)}
                disabled={saving}
                className="w-full py-2.5 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-colors"
              >
                Save as new asset
              </button>
              <button
                onClick={() => {
                  setPending(null);
                  setError(null);
                }}
                disabled={saving}
                className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm transition-colors"
              >
                Continue editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
