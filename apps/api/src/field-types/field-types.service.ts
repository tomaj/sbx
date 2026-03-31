import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, ilike, asc } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { fieldTypes } from '../db/schema';

@Injectable()
export class FieldTypesService {
  constructor(@Inject(DB) private db: DbType) {}

  async list(opts: { search?: string; onlyMine?: boolean } = {}) {
    const rows = await this.db
      .select({ id: fieldTypes.id, name: fieldTypes.name, approvedVersion: fieldTypes.approvedVersion })
      .from(fieldTypes)
      .orderBy(asc(fieldTypes.name));

    const filtered = opts.search?.trim()
      ? rows.filter((r) => r.name.toLowerCase().includes(opts.search!.trim().toLowerCase()))
      : rows;

    return {
      field_types: filtered.map((r) => ({
        id: r.id,
        name: r.name,
        approved_version: r.approvedVersion ?? null,
      })),
    };
  }

  async getOne(id: number) {
    const [row] = await this.db.select().from(fieldTypes).where(eq(fieldTypes.id, id)).limit(1);
    if (!row) throw new NotFoundException('Field type not found');
    return { field_type: this.format(row) };
  }

  async create(data: { name: string; body?: string; compiled_body?: string }) {
    const [existing] = await this.db.select({ id: fieldTypes.id }).from(fieldTypes).where(eq(fieldTypes.name, data.name)).limit(1);
    if (existing) throw new ConflictException(`Field type "${data.name}" already exists`);

    const [row] = await this.db
      .insert(fieldTypes)
      .values({
        name: data.name,
        body: data.body ?? '',
        compiledBody: data.compiled_body ?? '',
        belongsToOrg: true,
      })
      .returning();

    return { field_type: this.format(row) };
  }

  async update(id: number, data: { name?: string; body?: string; compiled_body?: string; space_ids?: number[]; options?: any[] }) {
    const [existing] = await this.db.select({ id: fieldTypes.id }).from(fieldTypes).where(eq(fieldTypes.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Field type not found');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.compiled_body !== undefined) updateData.compiledBody = data.compiled_body;
    if (data.space_ids !== undefined) updateData.spaceIds = data.space_ids;
    if (data.options !== undefined) updateData.options = data.options;

    const [row] = await this.db.update(fieldTypes).set(updateData).where(eq(fieldTypes.id, id)).returning();
    return { field_type: this.format(row) };
  }

  async remove(id: number) {
    const [existing] = await this.db.select({ id: fieldTypes.id }).from(fieldTypes).where(eq(fieldTypes.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Field type not found');
    await this.db.delete(fieldTypes).where(eq(fieldTypes.id, id));
    return {};
  }

  async getHtml(name: string, theme = 'light', extraParams: Record<string, string> = {}): Promise<string> {
    const [row] = await this.db
      .select({ compiledBody: fieldTypes.compiledBody })
      .from(fieldTypes)
      .where(eq(fieldTypes.name, name))
      .limit(1);

    const compiledBody = row?.compiledBody?.trim() ?? '';

    if (!compiledBody) {
      // Proxy from Storyblok CDN — forward all params so host/protocol/uid are passed through
      try {
        const params = new URLSearchParams({ theme, ...extraParams });
        const sbUrl = `https://plugins.storyblok.com/v1/field_types/${encodeURIComponent(name)}/get_html?${params.toString()}`;
        const sbRes = await fetch(sbUrl);
        if (sbRes.ok) {
          let html = await sbRes.text();
          // Patch hardcoded Storyblok origin so plugin communicates with our admin
          const adminOrigin = `${extraParams.protocol ?? 'http:'}\/\/${extraParams.host ?? 'localhost:3001'}`;
          html = html.replace(/https?:\/\/app\.storyblok\.com/g, adminOrigin);
          // Inject transparent background so our dark wrapper shows through
          html = html.replace('</head>', '<style>html,body{background:transparent!important}</style></head>');
          return html;
        }
      } catch {
        // ignore, fall through to empty placeholder
      }
      return `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;padding:8px;font-family:sans-serif;font-size:12px;color:#9ca3af">Plugin "${name}" has no compiled body.</body></html>`;
    }

    const isDark = theme === 'dark';
    const bg = isDark ? '#0f172a' : '#ffffff';
    const fg = isDark ? '#e2e8f0' : '#1f2937';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 8px; background: ${bg}; color: ${fg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; }
</style>
</head>
<body>
<div id="app"></div>
<script>
(function () {
  var uid = null;
  window.__sbxPlugin = null;

  window.Storyblok = {
    plugin: {
      props: {
        schema: { type: Object, default: function () { return {}; } },
        model: { default: null }
      },
      created: function () {
        if ((this.model === null || this.model === undefined) && this.initWith) {
          var init = this.initWith();
          if (init !== null && init !== undefined) this.model = init;
        }
      },
      methods: { initWith: function () { return null; } },
      watch: {
        model: {
          handler: function (v) {
            window.parent.postMessage({ action: 'change', value: v, uid: uid }, '*');
            setTimeout(notifyHeight, 50);
          },
          deep: true
        }
      }
    },
    init: function (component) { window.__sbxPlugin = component; }
  };

  function notifyHeight() {
    window.parent.postMessage({ action: 'height', height: document.documentElement.scrollHeight, uid: uid }, '*');
  }

  window.addEventListener('message', function (e) {
    if (!e.data) return;
    // Storyblok protocol: parent sends { action: 'loaded', value, schema, uid }
    if (e.data.action === 'loaded') {
      uid = e.data.uid || null;
      if (window.__sbxVueApp && window.__sbxVueApp.$children[0]) {
        window.__sbxVueApp.$children[0].model = e.data.value;
        window.__sbxVueApp.$children[0].schema = e.data.schema || {};
      }
    }
    // Legacy update
    if (e.data.action === 'update' && window.__sbxVueApp && window.__sbxVueApp.$children[0]) {
      window.__sbxVueApp.$children[0].model = e.data.value;
    }
  });
})();
<\/script>
<script src="https://cdn.jsdelivr.net/npm/vue@2.7.16/dist/vue.min.js"><\/script>
<script>
${compiledBody}
<\/script>
<script>
(function () {
  var component = window.__sbxPlugin;
  var builtins = ['transition', 'transition-group', 'keep-alive'];
  if (!component && window.Vue && Vue.options && Vue.options.components) {
    var names = Object.keys(Vue.options.components).filter(function (n) { return builtins.indexOf(n) === -1; });
    if (names.length > 0) component = Vue.options.components[names[0]];
  }

  if (!component) {
    document.getElementById('app').innerHTML = '<div style="color:#9ca3af;padding:4px;font-size:12px;font-style:italic">Plugin could not initialize</div>';
    window.parent.postMessage({ action: 'height', height: 32 }, '*');
    return;
  }

  window.__sbxVueApp = new Vue({
    el: '#app',
    components: { 'sbx-plugin': component },
    template: '<sbx-plugin :schema="schema" :model="model" />',
    data: function () { return { schema: {}, model: null }; }
  });

  // Tell parent we're ready (Storyblok protocol: plugin sends 'loaded', parent responds with value)
  window.parent.postMessage({ action: 'loaded' }, '*');
  setTimeout(function () {
    window.parent.postMessage({ action: 'height', height: document.documentElement.scrollHeight }, '*');
  }, 200);
})();
<\/script>
</body>
</html>`;
  }

  private format(row: typeof fieldTypes.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      body: row.body,
      compiled_body: row.compiledBody,
      space_ids: (row.spaceIds as number[]) ?? [],
      options: (row.options as any[]) ?? [],
      belongs_to_org: row.belongsToOrg,
      belongs_to_partner: false,
      approved_version: row.approvedVersion ?? null,
      last_versions: [],
      user: null,
    };
  }
}
