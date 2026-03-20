import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { eq, and } from 'drizzle-orm';
import * as schema from './schema';
import {
  spaces,
  users,
  spaceMembers,
  apiTokens,
  datasources,
  datasourceEntries,
  tags,
  componentGroups,
  components,
  spaceRoles,
  webhookEndpoints,
  presets,
} from './schema';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://tomaj@localhost:5432/sbx',
});
const db = drizzle(pool, { schema });

const GOLDEN = path.join(__dirname, '../../../../golden');
const SPACE_IDS = [285923, 285922, 293665, 327730];

async function seedSpaces() {
  console.log('Seeding spaces...');
  for (const spaceId of SPACE_IDS) {
    const raw = JSON.parse(
      fs.readFileSync(path.join(GOLDEN, String(spaceId), 'space.json'), 'utf-8'),
    );
    const s = raw.space;

    // Get version from CDN space/me golden file
    const cdnSpaceFile = path.join(GOLDEN, String(spaceId), 'cdn_space_me.json');
    let version = 0;
    if (fs.existsSync(cdnSpaceFile)) {
      const cdnRaw = JSON.parse(fs.readFileSync(cdnSpaceFile, 'utf-8'));
      version = cdnRaw.space?.version ?? 0;
    }

    const languageCodes = (s.languages ?? []).map((l: any) => l.code);

    await db
      .insert(spaces)
      .values({
        id: s.id,
        uuid: randomUUID(),
        name: s.name,
        domain: s.domain ?? null,
        version,
        languageCodes,
        firstToken: s.first_token,
      })
      .onConflictDoUpdate({
        target: spaces.id,
        set: { name: s.name, domain: s.domain ?? null, version, languageCodes, firstToken: s.first_token },
      });

    console.log(`  ✓ ${s.id}: ${s.name}`);
  }
}

async function seedUsers() {
  console.log('Seeding users from collaborators...');

  // Collect unique users across all spaces
  const userMap = new Map<string, { sbId: bigint; email: string; firstname: string; lastname: string; avatar: string | null; disabled: boolean }>();

  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'collaborators.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const c of raw.collaborators ?? []) {
      const u = c.user;
      if (!u?.real_email) continue;
      if (!userMap.has(u.real_email)) {
        userMap.set(u.real_email, {
          sbId: BigInt(u.id),
          email: u.real_email,
          firstname: u.firstname ?? '',
          lastname: u.lastname ?? '',
          avatar: u.avatar ?? null,
          disabled: u.disabled ?? false,
        });
      }
    }
  }

  for (const userData of userMap.values()) {
    await db
      .insert(users)
      .values({ uuid: randomUUID(), ...userData })
      .onConflictDoUpdate({
        target: users.email,
        set: { firstname: userData.firstname, lastname: userData.lastname, disabled: userData.disabled },
      });
  }

  console.log(`  ✓ ${userMap.size} unique users imported`);
}

async function seedCollaborators() {
  console.log('Seeding collaborators (space members)...');

  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'collaborators.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let count = 0;

    for (const c of raw.collaborators ?? []) {
      const u = c.user;
      if (!u?.real_email) continue;

      const [user] = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, u.real_email))
        .limit(1);

      if (!user) continue;

      await db
        .insert(spaceMembers)
        .values({
          sbId: BigInt(c.id),
          spaceId,
          userId: user.id,
          role: String(c.role),
          spaceRoleId: c.space_role_id ? BigInt(c.space_role_id) : null,
          permissions: c.permissions ?? [],
          allowedPath: c.allowed_path ?? '',
        })
        .onConflictDoUpdate({
          target: spaceMembers.sbId,
          set: { role: String(c.role) },
        });

      count++;
    }
    console.log(`  ✓ Space ${spaceId}: ${count} collaborators`);
  }
}

async function seedDatasources() {
  console.log('Seeding datasources...');
  for (const spaceId of SPACE_IDS) {
    const raw = JSON.parse(
      fs.readFileSync(path.join(GOLDEN, String(spaceId), 'datasources.json'), 'utf-8'),
    );
    const dsList = raw.datasources ?? [];

    for (const ds of dsList) {
      await db
        .insert(datasources)
        .values({ id: BigInt(ds.id), uuid: randomUUID(), spaceId, name: ds.name, slug: ds.slug })
        .onConflictDoUpdate({ target: datasources.id, set: { name: ds.name, slug: ds.slug } });
    }
    console.log(`  ✓ Space ${spaceId}: ${dsList.length} datasources`);
  }
}

async function seedDatasourceEntries() {
  console.log('Seeding datasource entries (golden sample)...');
  for (const spaceId of SPACE_IDS) {
    const entriesPath = path.join(GOLDEN, String(spaceId), 'cdn_datasource_entries.json');
    if (!fs.existsSync(entriesPath)) continue;

    const raw = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
    const entries = raw.datasource_entries ?? [];
    if (!entries.length) continue;

    const dsRaw = JSON.parse(
      fs.readFileSync(path.join(GOLDEN, String(spaceId), 'datasources.json'), 'utf-8'),
    );
    const firstDs = dsRaw.datasources?.[0];
    if (!firstDs) continue;

    const [ds] = await db
      .select()
      .from(datasources)
      .where(and(eq(datasources.spaceId, spaceId), eq(datasources.slug, firstDs.slug)))
      .limit(1);

    if (!ds) continue;

    for (const e of entries) {
      await db
        .insert(datasourceEntries)
        .values({ id: BigInt(e.id), datasourceId: ds.id, name: e.name, value: e.value })
        .onConflictDoUpdate({ target: datasourceEntries.id, set: { name: e.name, value: e.value } });
    }
    console.log(`  ✓ Space ${spaceId}: ${entries.length} entries for "${firstDs.name}"`);
  }
}

async function seedTags() {
  console.log('Seeding tags...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'cdn_tags.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const tagList = raw.tags ?? [];

    for (const t of tagList) {
      await db
        .insert(tags)
        .values({ spaceId, name: t.name, taggingsCount: t.taggings_count })
        .onConflictDoUpdate({
          target: [tags.spaceId, tags.name],
          set: { taggingsCount: t.taggings_count },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${tagList.length} tags`);
  }
}

async function seedComponentGroups() {
  console.log('Seeding component groups...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'component_groups.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const groups = raw.component_groups ?? [];

    for (const g of groups) {
      await db
        .insert(componentGroups)
        .values({
          id: BigInt(g.id),
          uuid: g.uuid,
          spaceId,
          name: g.name,
          parentId: g.parent_id ? BigInt(g.parent_id) : null,
          parentUuid: g.parent_uuid ?? null,
        })
        .onConflictDoUpdate({
          target: componentGroups.id,
          set: { name: g.name, parentId: g.parent_id ? BigInt(g.parent_id) : null, parentUuid: g.parent_uuid ?? null },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${groups.length} component groups`);
  }
}

async function seedComponents() {
  console.log('Seeding components...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'components.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const comps = raw.components ?? [];

    for (const c of comps) {
      await db
        .insert(components)
        .values({
          id: BigInt(c.id),
          spaceId,
          componentGroupUuid: c.component_group_uuid ?? null,
          name: c.name,
          displayName: c.display_name ?? null,
          schema: c.schema ?? {},
          image: c.image ?? null,
          previewField: c.preview_field ?? null,
          previewTmpl: c.preview_tmpl ?? null,
          isRoot: c.is_root ?? false,
          isNestable: c.is_nestable ?? true,
          color: c.color ?? null,
          icon: c.icon ?? null,
          description: c.description ?? null,
          allPresets: c.all_presets ?? [],
          internalTagsList: c.internal_tags_list ?? [],
          internalTagIds: c.internal_tag_ids ?? [],
          contentTypeAssetPreview: c.content_type_asset_preview ?? null,
          createdAt: c.created_at ? new Date(c.created_at) : undefined,
          updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
        })
        .onConflictDoUpdate({
          target: components.id,
          set: {
            name: c.name,
            displayName: c.display_name ?? null,
            schema: c.schema ?? {},
            isRoot: c.is_root ?? false,
            isNestable: c.is_nestable ?? true,
            allPresets: c.all_presets ?? [],
            internalTagsList: c.internal_tags_list ?? [],
            internalTagIds: c.internal_tag_ids ?? [],
          },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${comps.length} components`);
  }
}

async function seedAccessTokens() {
  console.log('Seeding access tokens...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'access_tokens.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const keys = raw.api_keys ?? [];

    for (const k of keys) {
      await db
        .insert(apiTokens)
        .values({
          id: k.id,
          spaceId,
          name: k.name,
          token: k.token,
          tokenType: k.access === 'public' ? 'public' : 'private',
          branchId: k.branch_id ?? null,
          storyIds: k.story_ids ?? [],
          minCache: k.min_cache ?? 0,
          releaseIds: k.release_ids ?? [],
        })
        .onConflictDoUpdate({
          target: apiTokens.id,
          set: {
            name: k.name,
            branchId: k.branch_id ?? null,
            storyIds: k.story_ids ?? [],
            minCache: k.min_cache ?? 0,
            releaseIds: k.release_ids ?? [],
          },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${keys.length} tokens`);
  }
}

async function seedPresets() {
  console.log('Seeding presets...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'presets.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const items = raw.presets ?? [];

    for (const p of items) {
      await db
        .insert(presets)
        .values({
          id: BigInt(p.id),
          spaceId,
          componentId: BigInt(p.component_id),
          name: p.name,
          preset: p.preset ?? {},
          image: p.image || null,
          color: p.color || null,
          icon: p.icon || null,
          description: p.description || null,
          createdAt: p.created_at ? new Date(p.created_at) : undefined,
          updatedAt: p.updated_at ? new Date(p.updated_at) : undefined,
        })
        .onConflictDoUpdate({
          target: presets.id,
          set: { name: p.name, preset: p.preset ?? {}, image: p.image || null, icon: p.icon || null },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${items.length} presets`);
  }
}

async function seedSpaceRoles() {
  console.log('Seeding space roles...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'space_roles.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const roles = raw.space_roles ?? [];

    for (const r of roles) {
      await db
        .insert(spaceRoles)
        .values({
          id: BigInt(r.id),
          spaceId,
          role: r.role,
          subtitle: r.subtitle ?? null,
          extId: r.ext_id ?? null,
          permissions: r.permissions ?? [],
          allowedPaths: r.allowed_paths ?? [],
          blockedPaths: r.blocked_paths ?? [],
          fieldPermissions: r.field_permissions ?? [],
          allowedFieldPermissions: r.allowed_field_permissions ?? [],
          readonlyFieldPermissions: r.readonly_field_permissions ?? [],
          datasourceIds: r.datasource_ids ?? [],
          blockedDatasourceIds: r.blocked_datasource_ids ?? [],
          componentIds: r.component_ids ?? [],
          allowedComponentIds: r.allowed_component_ids ?? [],
          branchIds: r.branch_ids ?? [],
          blockedBranchIds: r.blocked_branch_ids ?? [],
          allowedLanguages: r.allowed_languages ?? [],
          blockedLanguages: r.blocked_languages ?? [],
          assetFolderIds: r.asset_folder_ids ?? [],
          blockedAssetFolderIds: r.blocked_asset_folder_ids ?? [],
          managedComponentIds: r.managed_component_ids ?? [],
          blockedManageComponentIds: r.blocked_manage_component_ids ?? [],
          managedComponentGroupUuids: r.managed_component_group_uuids ?? [],
          blockedManageComponentGroupUuids: r.blocked_manage_component_group_uuids ?? [],
          componentGroupUuids: r.component_group_uuids ?? [],
          blockedComponentGroupUuids: r.blocked_component_group_uuids ?? [],
        })
        .onConflictDoUpdate({
          target: spaceRoles.id,
          set: { role: r.role, subtitle: r.subtitle ?? null, permissions: r.permissions ?? [] },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${roles.length} space roles`);
  }
}

async function seedWebhooks() {
  console.log('Seeding webhooks...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'webhooks.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const hooks = raw.webhook_endpoints ?? [];

    for (const h of hooks) {
      await db
        .insert(webhookEndpoints)
        .values({
          id: h.id,
          spaceId,
          name: h.name,
          description: h.description ?? null,
          endpoint: h.endpoint,
          secret: h.secret ?? null,
          actions: h.actions ?? [],
          activated: h.activated ?? true,
          deletedAt: h.deleted_at ? new Date(h.deleted_at) : null,
          createdAt: h.created_at ? new Date(h.created_at) : undefined,
          updatedAt: h.updated_at ? new Date(h.updated_at) : undefined,
        })
        .onConflictDoUpdate({
          target: webhookEndpoints.id,
          set: { name: h.name, endpoint: h.endpoint, actions: h.actions ?? [], activated: h.activated ?? true },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${hooks.length} webhooks`);
  }
}

async function seedAdminUser() {
  console.log('Seeding admin user...');
  const [user] = await db
    .insert(users)
    .values({
      uuid: randomUUID(),
      email: 'admin@sbx.local',
      firstname: 'Admin',
      lastname: 'SBX',
      passwordHash: createHash('sha256').update('admin').digest('hex'),
    })
    .onConflictDoUpdate({ target: users.email, set: { firstname: 'Admin' } })
    .returning();

  for (const spaceId of SPACE_IDS) {
    await db
      .insert(spaceMembers)
      .values({ spaceId, userId: user.id, role: 'admin' })
      .onConflictDoNothing();
  }
  console.log(`  ✓ admin@sbx.local (id=${user.id})`);
}

async function main() {
  await seedSpaces();
  await seedAccessTokens();
  await seedUsers();
  await seedCollaborators();
  await seedTags();
  await seedDatasources();
  await seedDatasourceEntries();
  await seedComponentGroups();
  await seedComponents();
  await seedPresets();
  await seedSpaceRoles();
  await seedWebhooks();
  await seedAdminUser();
  console.log('\nDone ✓');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
