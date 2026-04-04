import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { ResultGuard } from '../shared/result-guard.util';
import { and, eq, ilike, asc } from 'drizzle-orm';
import { escapeLike } from '../shared/query-parser.util';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { fieldTypes } from '../db/schema';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env.schema';

@Injectable()
export class FieldTypesService {
  constructor(
    @Inject(DB) private db: DbType,
    @Inject(ENV) private env: Env,
  ) {}

  async list(opts: { search?: string; onlyMine?: boolean; page?: number; perPage?: number } = {}) {
    const conditions: any[] = [];
    if (opts.search?.trim()) {
      conditions.push(ilike(fieldTypes.name, `%${escapeLike(opts.search.trim())}%`));
    }

    const query = this.db
      .select()
      .from(fieldTypes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(fieldTypes.name));

    const page = opts.page ?? 1;
    const perPage = Math.min(opts.perPage ?? 25, 100);
    const rows = await query.limit(perPage).offset((page - 1) * perPage);

    return {
      field_types: rows.map((r) => this.format(r)),
    };
  }

  async getOne(id: number) {
    const [row] = await this.db.select().from(fieldTypes).where(eq(fieldTypes.id, id)).limit(1);
    ResultGuard.throwIfNotFound(row, 'Field type not found');
    return { field_type: this.format(row) };
  }

  async create(data: { name: string; body?: string; compiled_body?: string }) {
    const [existing] = await this.db
      .select({ id: fieldTypes.id })
      .from(fieldTypes)
      .where(eq(fieldTypes.name, data.name))
      .limit(1);
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

  async update(
    id: number,
    data: {
      name?: string;
      body?: string;
      compiled_body?: string;
      space_ids?: number[];
      options?: any[];
    },
    _opts?: { publish?: boolean },
  ) {
    const [existing] = await this.db
      .select({ id: fieldTypes.id })
      .from(fieldTypes)
      .where(eq(fieldTypes.id, id))
      .limit(1);
    ResultGuard.throwIfNotFound(existing, 'Field type not found');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.compiled_body !== undefined) updateData.compiledBody = data.compiled_body;
    if (data.space_ids !== undefined) updateData.spaceIds = data.space_ids;
    if (data.options !== undefined) updateData.options = data.options;

    const [row] = await this.db
      .update(fieldTypes)
      .set(updateData)
      .where(eq(fieldTypes.id, id))
      .returning();
    return { field_type: this.format(row) };
  }

  async remove(id: number) {
    const [existing] = await this.db
      .select({ id: fieldTypes.id })
      .from(fieldTypes)
      .where(eq(fieldTypes.id, id))
      .limit(1);
    ResultGuard.throwIfNotFound(existing, 'Field type not found');
    await this.db.delete(fieldTypes).where(eq(fieldTypes.id, id));
    return {};
  }

  async getHtml(
    name: string,
    theme = 'light',
    extraParams: Record<string, string> = {},
    parentOrigin?: string,
  ): Promise<string> {
    // Default to ADMIN_URL for postMessage origin validation — never use '*'
    if (!parentOrigin || parentOrigin === '*') {
      parentOrigin = this.env.ADMIN_URL;
    }
    const [row] = await this.db
      .select({ compiledBody: fieldTypes.compiledBody })
      .from(fieldTypes)
      .where(eq(fieldTypes.name, name))
      .limit(1);

    const compiledBody = row?.compiledBody?.trim() ?? '';

    if (!compiledBody) {
      // Proxy from Storyblok CDN — forward theme + safe params (strip protocol/host — server derives admin origin from env)
      try {
        // Remove client-supplied origin hints — we use server-side ADMIN_URL instead
        const { protocol: _p, host: _h, ...safeParams } = extraParams;
        const params = new URLSearchParams({ theme, ...safeParams });
        const sbUrl = `https://plugins.storyblok.com/v1/field_types/${encodeURIComponent(name)}/get_html?${params.toString()}`;
        const sbRes = await fetch(sbUrl);
        if (sbRes.ok) {
          let html = await sbRes.text();
          // Patch hardcoded Storyblok origin so plugin communicates with our admin
          const adminOrigin = this.env.ADMIN_URL;
          html = html.replace(/https?:\/\/app\.storyblok\.com/g, adminOrigin);
          // Inject transparent background so our dark wrapper shows through
          html = html.replace(
            '</head>',
            '<style>html,body{background:transparent!important}</style></head>',
          );
          return html;
        }
      } catch {
        // ignore, fall through to empty placeholder
      }
      const safeName = name.replace(
        /[&<>"']/g,
        (c: string) =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
      );
      return `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;padding:8px;font-family:sans-serif;font-size:12px;color:#9ca3af">Plugin "${safeName}" has no compiled body.</body></html>`;
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
  var parentOrigin = ${JSON.stringify(parentOrigin)};
  window.__sbxPlugin = null;

  function sendToParent(data) {
    try { window.parent.postMessage(data, parentOrigin); } catch (_) {}
  }

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
            sendToParent({ action: 'change', value: v, uid: uid });
            setTimeout(notifyHeight, 50);
          },
          deep: true
        }
      }
    },
    init: function (component) { window.__sbxPlugin = component; }
  };

  function notifyHeight() {
    sendToParent({ action: 'height', height: document.documentElement.scrollHeight, uid: uid });
  }

  window.addEventListener('message', function (e) {
    if (!e.data) return;
    // Verify origin when parentOrigin is set
    if (parentOrigin !== '*' && e.origin !== parentOrigin) return;
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
</script>
<script src="https://cdn.jsdelivr.net/npm/vue@2.7.16/dist/vue.min.js"></script>
<script>
${compiledBody}
</script>
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
    sendToParent({ action: 'height', height: 32 });
    return;
  }

  window.__sbxVueApp = new Vue({
    el: '#app',
    components: { 'sbx-plugin': component },
    template: '<sbx-plugin :schema="schema" :model="model" />',
    data: function () { return { schema: {}, model: null }; }
  });

  // Tell parent we're ready (Storyblok protocol: plugin sends 'loaded', parent responds with value)
  sendToParent({ action: 'loaded' });
  setTimeout(function () {
    sendToParent({ action: 'height', height: document.documentElement.scrollHeight });
  }, 200);
})();
</script>
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
