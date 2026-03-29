'use client'

import { useEffect, useRef, useState } from 'react'
import type { CustomFieldDef } from '@/components/block-library/edit-block-modal/types'
import { fieldLabel } from '../field-label'
import { FieldLabel } from '../FieldLabel'

interface Props {
  fieldKey: string
  def: CustomFieldDef
  value: any
  onChange: (v: any) => void
  spaceId: string
}

interface FieldType {
  id: number
  name: string
  compiled_body: string
  options: any[]
}

function buildPluginHtml(compiledBody: string, initialValue: any, schema: any): string {
  const valueJson = JSON.stringify(initialValue ?? null)
  const schemaJson = JSON.stringify(schema ?? {})

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1f2937; }
</style>
</head>
<body>
<div id="app"></div>
<script>
(function() {
  window.__sbxPlugin = null;
  window.__sbxInitialValue = ${valueJson};
  window.__sbxSchema = ${schemaJson};

  function notifyHeight() {
    window.parent.postMessage({ action: 'height', height: document.documentElement.scrollHeight }, '*');
  }

  window.Storyblok = {
    plugin: {
      props: {
        schema: { type: Object, default: function() { return {}; } },
        model: { default: null }
      },
      created: function() {
        if ((this.model === null || this.model === undefined) && this.initWith) {
          var init = this.initWith();
          if (init !== null && init !== undefined) {
            this.model = init;
          }
        }
      },
      methods: {
        initWith: function() { return null; }
      },
      watch: {
        model: {
          handler: function(v) {
            window.parent.postMessage({ action: 'change', value: v }, '*');
            setTimeout(notifyHeight, 50);
          },
          deep: true
        }
      }
    },
    init: function(component) {
      window.__sbxPlugin = component;
    }
  };

  window.addEventListener('message', function(e) {
    if (!e.data || e.data.action !== 'update') return;
    var app = window.__sbxVueApp;
    if (app && app.$children && app.$children[0]) {
      app.$children[0].model = e.data.value;
    }
  });
})();
<\/script>
<script src="https://cdn.jsdelivr.net/npm/vue@2.7.16/dist/vue.min.js"><\/script>
<script>
${compiledBody}
<\/script>
<script>
(function() {
  var component = window.__sbxPlugin;

  // Fallback: find first globally registered Vue component (excluding built-ins)
  if (!component && window.Vue && Vue.options && Vue.options.components) {
    var builtins = ['transition', 'transition-group', 'keep-alive'];
    var names = Object.keys(Vue.options.components).filter(function(n) {
      return builtins.indexOf(n) === -1;
    });
    if (names.length > 0) {
      component = Vue.options.components[names[0]];
    }
  }

  if (!component) {
    document.getElementById('app').innerHTML = '<div style="color:#9ca3af;padding:4px;font-size:12px;font-style:italic">Plugin could not initialize</div>';
    window.parent.postMessage({ action: 'loaded' }, '*');
    window.parent.postMessage({ action: 'height', height: 32 }, '*');
    return;
  }

  window.__sbxVueApp = new Vue({
    el: '#app',
    components: { 'sbx-plugin': component },
    template: '<sbx-plugin :schema="schema" :model="model" />',
    data: function() {
      return {
        schema: window.__sbxSchema || {},
        model: window.__sbxInitialValue
      };
    }
  });

  window.parent.postMessage({ action: 'loaded' }, '*');
  setTimeout(function() {
    window.parent.postMessage({ action: 'height', height: document.documentElement.scrollHeight }, '*');
  }, 200);
})();
<\/script>
</body>
</html>`
}

export function CustomPluginField({ fieldKey, def, value, onChange, spaceId: _spaceId }: Props) {
  const [fieldType, setFieldType] = useState<FieldType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [iframeHeight, setIframeHeight] = useState(80)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pluginName = def.field_type

  useEffect(() => {
    if (!pluginName) {
      setLoading(false)
      setError('No plugin name specified')
      return
    }

    fetch(`/api/admin/field-types?search=${encodeURIComponent(pluginName)}`)
      .then((r) => r.json())
      .then((data) => {
        const match = (data.field_types ?? []).find((ft: { id: number; name: string }) => ft.name === pluginName)
        if (!match) throw new Error(`Plugin "${pluginName}" not found`)
        return fetch(`/api/admin/field-types/${match.id}`)
      })
      .then((r) => r.json())
      .then((data) => {
        if (data.field_type) {
          setFieldType(data.field_type)
        } else {
          setError(`Plugin "${pluginName}" not found`)
        }
      })
      .catch((e: Error) => setError(e.message ?? 'Failed to load plugin'))
      .finally(() => setLoading(false))
  }, [pluginName])

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!iframeRef.current) return
      if (e.source !== iframeRef.current.contentWindow) return

      if (e.data?.action === 'change') {
        onChange(e.data.value)
      } else if (e.data?.action === 'height' && typeof e.data.height === 'number') {
        setIframeHeight(Math.max(40, e.data.height + 16))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onChange])

  // Sync external value changes into iframe
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ action: 'update', value }, '*')
  }, [value])

  if (loading) {
    return (
      <div>
        <FieldLabel label={fieldLabel(def.display_name, fieldKey)} description={(def as any).description} />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
      </div>
    )
  }

  if (error || !fieldType) {
    return (
      <div>
        <FieldLabel label={fieldLabel(def.display_name, fieldKey)} description={(def as any).description} />
        <div className="px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          {error ?? `Plugin "${pluginName}" unavailable`}
        </div>
      </div>
    )
  }

  const schema = {
    ...(def as any),
    options: fieldType.options?.length ? fieldType.options : (def.options ?? []),
  }

  if (!fieldType.compiled_body?.trim()) {
    return (
      <div>
        <FieldLabel label={fieldLabel(def.display_name, fieldKey)} description={(def as any).description} />
        <div className="px-3 py-2 text-sm text-amber-500 border border-dashed border-amber-300 dark:border-amber-700 rounded-lg">
          Plugin <code className="font-mono">{pluginName}</code> exists but has no compiled code. Upload the plugin body in Organization → Field Types.
        </div>
      </div>
    )
  }

  const srcdoc = buildPluginHtml(fieldType.compiled_body, value, schema)

  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} description={(def as any).description} />
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          sandbox="allow-scripts"
          style={{ width: '100%', height: iframeHeight, border: 'none', display: 'block' }}
          title={`Plugin: ${pluginName}`}
        />
      </div>
    </div>
  )
}
