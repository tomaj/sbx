'use client';

import { useState, useEffect } from 'react';
import type { Asset } from '../asset-grid';
import type { CustomMetadataField } from './utils';

interface UseAssetFormOptions {
  initialAsset: Asset;
  freshAsset: Asset | undefined;
  customMetadataFields: CustomMetadataField[];
}

export function useAssetForm({
  initialAsset,
  freshAsset,
  customMetadataFields,
}: UseAssetFormOptions) {
  const [title, setTitle] = useState(initialAsset.title ?? '');
  const [alt, setAlt] = useState(initialAsset.alt ?? '');
  const [copyright, setCopyright] = useState((initialAsset as any).copyright ?? '');
  const [source, setSource] = useState((initialAsset as any).meta_data?.source ?? '');
  const [expireAt, setExpireAt] = useState(
    (initialAsset as any).expire_at
      ? new Date((initialAsset as any).expire_at).toISOString().slice(0, 10)
      : '',
  );
  const [locked, setLocked] = useState((initialAsset as any).locked ?? false);
  const [internalTags, setInternalTags] = useState<{ id: number; name: string }[]>(
    (initialAsset as any).internal_tags_list ?? [],
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(() => {
    const md = (initialAsset as any).meta_data ?? {};
    return Object.fromEntries(customMetadataFields.map((f) => [f.key, String(md[f.key] ?? '')]));
  });
  const [focus, setFocus] = useState<string>((initialAsset as any).focus ?? '');

  useEffect(() => {
    if (!freshAsset) return;
    const a = freshAsset;
    setTitle(a.title ?? '');
    setAlt(a.alt ?? '');
    setCopyright((a as any).copyright ?? '');
    setSource((a as any).meta_data?.source ?? '');
    setExpireAt(
      (a as any).expire_at ? new Date((a as any).expire_at).toISOString().slice(0, 10) : '',
    );
    setLocked((a as any).locked ?? false);
    setFocus((a as any).focus ?? '');
    setInternalTags((a as any).internal_tags_list ?? []);
    const md = (a as any).meta_data ?? {};
    setCustomFieldValues((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = String(md[key] ?? '');
      }
      return next;
    });
  }, [freshAsset]);

  useEffect(() => {
    if (!customMetadataFields.length) return;
    const md = ((freshAsset ?? initialAsset) as any).meta_data ?? {};
    setCustomFieldValues(
      Object.fromEntries(customMetadataFields.map((f) => [f.key, String(md[f.key] ?? '')])),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customMetadataFields, initialAsset, freshAsset]);

  function getPayload(asset: Asset) {
    const meta_data = {
      ...((asset as any).meta_data ?? {}),
      source: source || undefined,
      ...Object.fromEntries(Object.entries(customFieldValues).map(([k, v]) => [k, v || undefined])),
    };
    return {
      title: title || null,
      alt: alt || null,
      copyright: copyright || null,
      expire_at: expireAt || null,
      locked,
      focus: focus || null,
      meta_data,
      internal_tag_ids: internalTags.map((t) => t.id),
    };
  }

  return {
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
    focus,
    setFocus,
    getPayload,
  };
}
