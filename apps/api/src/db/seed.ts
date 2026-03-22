import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { eq, and, sql } from 'drizzle-orm';
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
  activities,
  stories,
  branches,
  releases,
  tasks,
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
    const previewUrls = (s.environments ?? []).map((e: any) => ({ name: e.name, location: e.location }));
    const encodeUrl = s.options?.encode_preview_urls ?? false;
    const mobileWidth = s.options?.mobile_size ?? 360;

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
        previewUrls,
        encodeUrl,
        mobileWidth,
      })
      .onConflictDoUpdate({
        target: spaces.id,
        set: {
          name: s.name,
          domain: s.domain ?? null,
          version,
          languageCodes,
          firstToken: s.first_token,
          previewUrls,
          encodeUrl,
          mobileWidth,
        },
      });

    console.log(`  ✓ ${s.id}: ${s.name}`);
  }
}

async function seedUsers() {
  console.log('Seeding users from collaborators...');

  // Collect unique users across all spaces
  const userMap = new Map<string, { id: number; email: string; firstname: string; lastname: string; avatar: string | null; disabled: boolean }>();

  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'collaborators.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const c of raw.collaborators ?? []) {
      const u = c.user;
      if (!u?.real_email) continue;
      if (!userMap.has(u.real_email)) {
        userMap.set(u.real_email, {
          id: Number(u.id),
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
        target: users.id,
        set: { firstname: userData.firstname, lastname: userData.lastname, avatar: userData.avatar, disabled: userData.disabled },
      });
  }

  // Reset sequence so locally-created users get IDs above all imported IDs
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 0))`);

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
          id: Number(c.id),
          spaceId,
          userId: user.id,
          role: String(c.role),
          spaceRoleId: c.space_role_id ? BigInt(c.space_role_id) : null,
          permissions: c.permissions ?? [],
          allowedPath: c.allowed_path ?? '',
        })
        .onConflictDoUpdate({
          target: spaceMembers.id,
          set: { role: String(c.role), userId: user.id },
        });

      count++;
    }
    console.log(`  ✓ Space ${spaceId}: ${count} collaborators`);
  }

  // Reset sequence so locally-created members get IDs above all imported IDs
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('space_members', 'id'), COALESCE((SELECT MAX(id) FROM space_members), 0))`);
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
  console.log('Seeding datasource entries...');
  for (const spaceId of SPACE_IDS) {
    const entriesPath = path.join(GOLDEN, String(spaceId), 'datasource_entries.json');
    if (!fs.existsSync(entriesPath)) continue;

    const raw = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
    const entries = raw.datasource_entries ?? [];
    if (!entries.length) continue;

    for (const e of entries) {
      await db
        .insert(datasourceEntries)
        .values({
          id: BigInt(e.id),
          datasourceId: BigInt(e.datasource_id),
          name: e.name,
          value: e.value,
          dimensionValue: e.dimension_value ?? {},
          position: e.position ?? 0,
          createdAt: e.created_at ? new Date(e.created_at) : undefined,
          updatedAt: e.updated_at ? new Date(e.updated_at) : undefined,
        })
        .onConflictDoUpdate({
          target: datasourceEntries.id,
          set: { name: e.name, value: e.value, dimensionValue: e.dimension_value ?? {}, position: e.position ?? 0 },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${entries.length} entries`);
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

/** Read all items from chunk files in golden/{spaceId}/{resource}/ directory. */
function readChunks(spaceId: number, resource: string): any[] {
  const dir = path.join(GOLDEN, String(spaceId), resource);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('chunk_') && f.endsWith('.json'))
    .sort();
  const items: any[] = [];
  for (const f of files) {
    const chunk = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
    items.push(...chunk);
  }
  return items;
}

async function seedActivities() {
  console.log('Seeding activities from chunks...');
  for (const spaceId of SPACE_IDS) {
    const items = readChunks(spaceId, 'activities');
    if (!items.length) {
      console.log(`  ✓ Space ${spaceId}: 0 activities`);
      continue;
    }

    const BATCH = 500;
    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH).map((item: any) => {
        const a = item.activity;
        return {
          id: BigInt(a.id),
          spaceId,
          trackableId: a.trackable_id ? BigInt(a.trackable_id) : null,
          trackableType: a.trackable_type ?? null,
          ownerId: a.owner_id ? BigInt(a.owner_id) : null,
          ownerType: a.owner_type ?? null,
          key: a.key,
          parameters: a.parameters ?? {},
          recipientId: a.recipient_id ? BigInt(a.recipient_id) : null,
          recipientType: a.recipient_type ?? null,
          trackable: item.trackable ?? {},
          user: item.user ?? {},
          createdAt: new Date(a.created_at),
          updatedAt: new Date(a.updated_at),
        };
      });
      await db.insert(activities).values(batch).onConflictDoNothing();
      process.stdout.write(`\r  Space ${spaceId}: ${Math.min(i + BATCH, items.length)}/${items.length} activities...`);
    }
    process.stdout.write('\n');
    console.log(`  ✓ Space ${spaceId}: ${items.length} activities`);
  }
}

async function seedStories() {
  console.log('Seeding stories from chunks...');
  for (const spaceId of SPACE_IDS) {
    const items = readChunks(spaceId, 'stories');
    if (!items.length) {
      console.log(`  ✓ Space ${spaceId}: 0 stories`);
      continue;
    }

    const BATCH = 200;
    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH).map((s: any) => ({
        id: BigInt(s.id),
        spaceId,
        uuid: s.uuid,
        name: s.name,
        slug: s.slug,
        fullSlug: s.full_slug,
        path: s.path || null,
        parentId: s.parent_id ? BigInt(s.parent_id) : null,
        groupId: s.group_id ?? null,
        contentType: s.content_type ?? null,
        isFolder: s.is_folder ?? false,
        isStartpage: s.is_startpage ?? false,
        published: s.published ?? false,
        unpublishedChanges: s.unpublished_changes ?? false,
        position: s.position ?? 0,
        tagList: s.tag_list ?? [],
        content: s.content ?? {},
        sortByDate: s.sort_by_date ? new Date(s.sort_by_date) : null,
        publishAt: s.publish_at ? new Date(s.publish_at) : null,
        expireAt: s.expire_at ? new Date(s.expire_at) : null,
        publishedAt: s.published_at ? new Date(s.published_at) : null,
        firstPublishedAt: s.first_published_at ? new Date(s.first_published_at) : null,
        deletedAt: s.deleted_at ? new Date(s.deleted_at) : null,
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at),
        lastAuthorId: s.last_author_id ?? null,
      }));
      await db.insert(stories).values(batch).onConflictDoUpdate({
        target: stories.id,
        set: {
          name: sql`excluded.name`,
          slug: sql`excluded.slug`,
          fullSlug: sql`excluded.full_slug`,
          published: sql`excluded.published`,
          unpublishedChanges: sql`excluded.unpublished_changes`,
          updatedAt: sql`excluded.updated_at`,
          publishedAt: sql`excluded.published_at`,
          tagList: sql`excluded.tag_list`,
          content: sql`excluded.content`,
          position: sql`excluded.position`,
        },
      });
      process.stdout.write(`\r  Space ${spaceId}: ${Math.min(i + BATCH, items.length)}/${items.length} stories...`);
    }
    process.stdout.write('\n');
    console.log(`  ✓ Space ${spaceId}: ${items.length} stories`);
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

async function seedBranches() {
  console.log('Seeding branches...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'branches.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const items = raw.branches ?? [];

    for (const b of items) {
      await db
        .insert(branches)
        .values({
          id: b.id,
          spaceId,
          name: b.name,
          sourceId: b.source_id ?? null,
          url: b.url ?? null,
          position: b.position ?? 1,
          deployedAt: b.deployed_at ? new Date(b.deployed_at) : null,
          deletedAt: b.deleted_at ? new Date(b.deleted_at) : null,
          createdAt: b.created_at ? new Date(b.created_at) : undefined,
          updatedAt: b.updated_at ? new Date(b.updated_at) : undefined,
        })
        .onConflictDoUpdate({
          target: branches.id,
          set: { name: b.name, url: b.url ?? null, deployedAt: b.deployed_at ? new Date(b.deployed_at) : null },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${items.length} branches`);
  }
}

async function seedReleases() {
  console.log('Seeding releases...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'releases.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const items = raw.releases ?? [];

    for (const r of items) {
      await db
        .insert(releases)
        .values({
          id: r.id,
          spaceId,
          name: r.name,
          uuid: r.uuid,
          releaseAt: r.release_at ? new Date(r.release_at) : null,
          released: r.released ?? false,
          timezone: r.timezone ?? null,
          branchesToDeploy: r.branches_to_deploy ?? [],
          ownerId: r.owner_id ?? null,
          usersToNotifyIds: r.users_to_notify_ids ?? [],
          public: r.public ?? true,
          allowedUserIds: r.allowed_user_ids ?? [],
          allowedSpaceRoleIds: r.allowed_space_role_ids ?? [],
          allowedApiKeyIds: r.allowed_api_key_ids ?? [],
          createdAt: r.created_at ? new Date(r.created_at) : undefined,
          updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
        })
        .onConflictDoUpdate({
          target: releases.id,
          set: { name: r.name, released: r.released ?? false, releaseAt: r.release_at ? new Date(r.release_at) : null },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${items.length} releases`);
  }
}

async function seedTasks() {
  console.log('Seeding tasks...');
  for (const spaceId of SPACE_IDS) {
    const filePath = path.join(GOLDEN, String(spaceId), 'tasks.json');
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const items = raw.tasks ?? [];

    for (const t of items) {
      await db
        .insert(tasks)
        .values({
          id: t.id,
          spaceId,
          name: t.name,
          description: t.description ?? null,
          taskType: t.task_type ?? 'webhook',
          lastExecution: t.last_execution ? new Date(t.last_execution) : null,
          running: t.running ?? false,
          lastResponse: t.last_response ?? null,
          webhookUrl: t.webhook_url ?? null,
          userDialog: t.user_dialog ?? {},
        })
        .onConflictDoUpdate({
          target: tasks.id,
          set: {
            name: t.name,
            description: t.description ?? null,
            webhookUrl: t.webhook_url ?? null,
            userDialog: t.user_dialog ?? {},
            lastExecution: t.last_execution ? new Date(t.last_execution) : null,
          },
        });
    }
    console.log(`  ✓ Space ${spaceId}: ${items.length} tasks`);
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
  await seedActivities();
  await seedStories();
  await seedSpaceRoles();
  await seedWebhooks();
  await seedBranches();
  await seedReleases();
  await seedTasks();
  await seedAdminUser();
  console.log('\nDone ✓');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
