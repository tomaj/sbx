'use client';

import { useEffect, useRef, useState } from 'react';
import type { CustomFieldDef } from '@/components/block-library/edit-block-modal/types';
import { fieldLabel } from '../field-label';
import { FieldLabel } from '../FieldLabel';

interface Props {
  fieldKey: string;
  def: CustomFieldDef;
  value: any;
  onChange: (v: any) => void;
  spaceId: string;
}

export function CustomPluginField({ fieldKey, def, value, onChange }: Props) {
  const [iframeHeight, setIframeHeight] = useState(80);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pluginName = def.field_type;
  const uid = useRef(`${fieldKey}-${Math.random().toString(36).slice(2)}`);

  const theme =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';

  const valueRef = useRef(value);
  valueRef.current = value;
  const defRef = useRef(def);
  defRef.current = def;

  const sendContext = (callbackId?: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        action: 'loaded',
        uid: uid.current,
        ...(callbackId ? { callbackId } : {}),
        schema: { ...(defRef.current as any) },
        model: valueRef.current ?? null,
        content: valueRef.current ?? null,
        token: null,
        spaceId: null,
        storyId: null,
        userId: null,
        blockId: null,
        story: { content: {} },
        language: 'default',
        isModalOpen: false,
      },
      window.location.origin,
    );
  };

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;

      const { action, event: evt, model, height, callbackId } = e.data ?? {};

      if (action === 'plugin-changed') {
        if (evt === 'loaded') {
          sendContext(callbackId);
        } else if (evt === 'heightChange' && typeof height === 'number') {
          setIframeHeight(Math.max(40, height + 16));
        } else if (evt === 'update' && model !== undefined) {
          onChange(model);
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onChange, sendContext]);

  // Sync external value changes into iframe
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { uid: uid.current, model: value ?? null },
      window.location.origin,
    );
  }, [value]);

  if (!pluginName) {
    return (
      <div>
        <FieldLabel
          label={fieldLabel(def.display_name, fieldKey)}
          description={(def as any).description}
        />
        <div className="px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          No plugin name specified
        </div>
      </div>
    );
  }

  // Pass host+protocol so fieldtype-wrapper.js uses our origin for postMessage
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3001';
  const src = `/api/admin/field-types/plugin-html/${encodeURIComponent(pluginName)}?theme=${theme}&uid=${uid.current}&protocol=${encodeURIComponent(protocol)}&host=${encodeURIComponent(host)}`;

  return (
    <div>
      <FieldLabel
        label={fieldLabel(def.display_name, fieldKey)}
        description={(def as any).description}
      />
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#1e1e2e]">
        <iframe
          ref={iframeRef}
          src={src}
          onLoad={() => sendContext()}
          style={{
            width: '100%',
            height: iframeHeight,
            border: 'none',
            display: 'block',
            colorScheme: 'normal',
          }}
          title={`Plugin: ${pluginName}`}
        />
      </div>
    </div>
  );
}
