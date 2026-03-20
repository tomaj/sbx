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

    if (s.first_token) {
      await db
        .insert(apiTokens)
        .values({ spaceId: s.id, name: 'Public token', token: s.first_token, tokenType: 'public' })
        .onConflictDoNothing();
    }

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
  await seedUsers();
  await seedCollaborators();
  await seedTags();
  await seedDatasources();
  await seedDatasourceEntries();
  await seedAdminUser();
  console.log('\nDone ✓');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
