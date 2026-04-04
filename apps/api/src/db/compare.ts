/**
 * Compares our API responses vs live Storyblok for spaces and users.
 * Run: npx ts-node --transpile-only src/db/compare.ts
 */

import * as https from 'https';
import * as http from 'http';

const MAPI_TOKEN = process.env.STORYBLOK_MAPI_TOKEN;
if (!MAPI_TOKEN) {
  console.error('Missing STORYBLOK_MAPI_TOKEN env variable');
  process.exit(1);
}
const OUR_BASE = 'http://localhost:3000';
const SB_CDN_BASE = 'https://api.storyblok.com';
const SB_MAPI_BASE = 'https://mapi.storyblok.com';

const CDN_TOKENS = (process.env.STORYBLOK_CDN_TOKENS ?? '').split(',');
const SPACES = [
  { id: 285923, cdnToken: CDN_TOKENS[0] ?? '', name: 'Live' },
  { id: 285922, cdnToken: CDN_TOKENS[1] ?? '', name: 'Development' },
  { id: 293665, cdnToken: CDN_TOKENS[2] ?? '', name: 'Magenta' },
  { id: 327730, cdnToken: CDN_TOKENS[3] ?? '', name: 'Telekom Apps' },
];
if (SPACES.some((s) => !s.cdnToken)) {
  console.error(
    'Missing STORYBLOK_CDN_TOKENS env variable (comma-separated: Live,Dev,Magenta,TelekomApps)',
  );
  process.exit(1);
}

function fetch(url: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location!, headers).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
  });
}

function diff(label: string, ours: any, live: any, keys: string[]) {
  let ok = true;
  for (const key of keys) {
    const o = JSON.stringify(ours[key]);
    const l = JSON.stringify(live[key]);
    if (o !== l) {
      console.log(`    ❌ ${key}: ours=${o}  live=${l}`);
      ok = false;
    }
  }
  if (ok) console.log(`    ✅ ${label} - all fields match`);
  return ok;
}

async function compareSpacesMe() {
  console.log('\n=== CDN /v2/cdn/spaces/me ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);
    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v2/cdn/spaces/me?token=${sp.cdnToken}`),
      fetch(`${SB_CDN_BASE}/v2/cdn/spaces/me?token=${sp.cdnToken}`),
    ]);
    diff('space', ours.space, live.space, ['id', 'name', 'domain', 'language_codes']);

    // version changes over time - just check it's a number
    const vOurs = typeof ours.space?.version === 'number';
    const vLive = typeof live.space?.version === 'number';
    console.log(
      `    ${vOurs && vLive ? '✅' : '❌'} version is number: ours=${ours.space?.version}  live=${live.space?.version}`,
    );
  }
}

async function compareCollaborators() {
  console.log('\n=== MAPI /v1/spaces/:id/collaborators ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v1/spaces/${sp.id}/collaborators?token=${sp.cdnToken}`),
      fetch(`${SB_MAPI_BASE}/v1/spaces/${sp.id}/collaborators`, { Authorization: MAPI_TOKEN! }),
    ]);

    const ourCollabs = ours.collaborators ?? [];
    const liveCollabs = live.collaborators ?? [];

    console.log(
      `    count: ours=${ourCollabs.length}  live=${liveCollabs.length} ${ourCollabs.length === liveCollabs.length ? '✅' : '❌'}`,
    );

    // Compare by email (sbId as anchor)
    const liveByEmail = new Map(liveCollabs.map((c: any) => [c.user.real_email, c]));
    const ourByEmail = new Map(ourCollabs.map((c: any) => [c.user.real_email, c]));

    let emailMismatches = 0;
    for (const [email, _liveC] of liveByEmail) {
      if (!ourByEmail.has(email)) {
        console.log(`    ❌ missing user: ${email}`);
        emailMismatches++;
      }
    }

    if (emailMismatches === 0) {
      console.log(`    ✅ all users present`);
    }

    // Compare user fields for first collaborator
    if (ourCollabs.length > 0 && liveCollabs.length > 0) {
      const firstEmail = liveCollabs[0].user.real_email;
      const ourC = ourByEmail.get(firstEmail) as any;
      const liveC = liveByEmail.get(firstEmail) as any;
      if (ourC && liveC) {
        diff('user fields', ourC.user, liveC.user, [
          'firstname',
          'lastname',
          'real_email',
          'disabled',
        ]);
      }
    }
  }
}

async function compareComponents() {
  console.log('\n=== MAPI /v1/spaces/:id/components ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v1/spaces/${sp.id}/components?token=${sp.cdnToken}`),
      fetch(`${SB_MAPI_BASE}/v1/spaces/${sp.id}/components`, { Authorization: MAPI_TOKEN! }),
    ]);

    const ourComps = ours.components ?? [];
    const liveComps = live.components ?? [];

    console.log(
      `    count: ours=${ourComps.length}  live=${liveComps.length} ${ourComps.length === liveComps.length ? '✅' : '❌'}`,
    );

    const liveById = new Map(liveComps.map((c: any) => [c.id, c]));
    const ourById = new Map(ourComps.map((c: any) => [c.id, c]));

    let mismatches = 0;
    for (const [id, liveC] of liveById as Map<any, any>) {
      if (!ourById.has(id)) {
        console.log(`    ❌ missing component id=${id} name=${liveC.name}`);
        mismatches++;
      }
    }

    // Compare key fields for first component
    if (ourComps.length > 0 && liveComps.length > 0) {
      const firstId = liveComps[0].id;
      const ourC = ourById.get(firstId) as any;
      const liveC = liveById.get(firstId) as any;
      if (ourC && liveC) {
        diff('first component', ourC, liveC, [
          'id',
          'name',
          'is_root',
          'is_nestable',
          'color',
          'icon',
          'component_group_uuid',
        ]);
      }
    }

    if (mismatches === 0 && ourComps.length === liveComps.length) {
      console.log(`    ✅ all components present`);
    }
  }
}

async function compareComponentGroups() {
  console.log('\n=== MAPI /v1/spaces/:id/component_groups ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v1/spaces/${sp.id}/component_groups?token=${sp.cdnToken}`),
      fetch(`${SB_MAPI_BASE}/v1/spaces/${sp.id}/component_groups`, { Authorization: MAPI_TOKEN! }),
    ]);

    const ourGroups = ours.component_groups ?? [];
    const liveGroups = live.component_groups ?? [];

    console.log(
      `    count: ours=${ourGroups.length}  live=${liveGroups.length} ${ourGroups.length === liveGroups.length ? '✅' : '❌'}`,
    );

    if (ourGroups.length > 0 && liveGroups.length > 0) {
      const liveFirst = liveGroups[0];
      const ourFirst = ourGroups.find((g: any) => g.id === liveFirst.id);
      if (ourFirst) {
        diff('first group', ourFirst, liveFirst, [
          'id',
          'uuid',
          'name',
          'parent_id',
          'parent_uuid',
        ]);
      }
    }
  }
}

async function compareAccessTokens() {
  console.log('\n=== MAPI /v1/spaces/:id/api_keys ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v1/spaces/${sp.id}/api_keys?token=${sp.cdnToken}`),
      fetch(`${SB_MAPI_BASE}/v1/spaces/${sp.id}/api_keys/`, { Authorization: MAPI_TOKEN! }),
    ]);

    const ourKeys: any[] = ours.api_keys ?? [];
    const liveKeys: any[] = live.api_keys ?? [];

    console.log(
      `    count: ours=${ourKeys.length}  live=${liveKeys.length} ${ourKeys.length === liveKeys.length ? '✅' : '❌'}`,
    );

    const liveById = new Map(liveKeys.map((k) => [k.id, k]));
    const ourById = new Map(ourKeys.map((k) => [k.id, k]));

    for (const [id, liveK] of liveById) {
      const ourK = ourById.get(id) as any;
      if (!ourK) {
        console.log(`    ❌ missing token id=${id} name="${liveK.name}"`);
        continue;
      }
      diff(`token ${id} (${liveK.name})`, ourK, liveK, [
        'id',
        'access',
        'branch_id',
        'name',
        'space_id',
        'token',
        'min_cache',
      ]);
    }
  }
}

async function compareSpaceRoles() {
  console.log('\n=== MAPI /v1/spaces/:id/space_roles ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v1/spaces/${sp.id}/space_roles?token=${sp.cdnToken}`),
      fetch(`${SB_MAPI_BASE}/v1/spaces/${sp.id}/space_roles`, { Authorization: MAPI_TOKEN! }),
    ]);

    const ourRoles: any[] = ours.space_roles ?? [];
    const liveRoles: any[] = live.space_roles ?? [];

    console.log(
      `    count: ours=${ourRoles.length}  live=${liveRoles.length} ${ourRoles.length === liveRoles.length ? '✅' : '❌'}`,
    );

    const liveById = new Map(liveRoles.map((r: any) => [r.id, r]));
    const ourById = new Map(ourRoles.map((r: any) => [r.id, r]));

    for (const [id, liveR] of liveById as Map<any, any>) {
      const ourR = ourById.get(id) as any;
      if (!ourR) {
        console.log(`    ❌ missing role id=${id} name="${liveR.role}"`);
        continue;
      }
      diff(`role "${liveR.role}"`, ourR, liveR, [
        'id',
        'role',
        'subtitle',
        'permissions',
        'allowed_paths',
        'blocked_paths',
      ]);
    }
  }
}

async function compareWebhooks() {
  console.log('\n=== MAPI /v1/spaces/:id/webhook_endpoints ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v1/spaces/${sp.id}/webhook_endpoints?token=${sp.cdnToken}`),
      fetch(`${SB_MAPI_BASE}/v1/spaces/${sp.id}/webhook_endpoints`, { Authorization: MAPI_TOKEN! }),
    ]);

    const ourHooks: any[] = ours.webhook_endpoints ?? [];
    const liveHooks: any[] = live.webhook_endpoints ?? [];

    console.log(
      `    count: ours=${ourHooks.length}  live=${liveHooks.length} ${ourHooks.length === liveHooks.length ? '✅' : '❌'}`,
    );

    const liveById = new Map(liveHooks.map((h: any) => [h.id, h]));
    const ourById = new Map(ourHooks.map((h: any) => [h.id, h]));

    for (const [id, liveH] of liveById as Map<any, any>) {
      const ourH = ourById.get(id) as any;
      if (!ourH) {
        console.log(`    ❌ missing webhook id=${id} name="${liveH.name}"`);
        continue;
      }
      diff(`webhook "${liveH.name}"`, ourH, liveH, [
        'id',
        'name',
        'endpoint',
        'actions',
        'activated',
        'space_id',
      ]);
    }
  }
}

async function comparePresets() {
  console.log('\n=== MAPI /v1/spaces/:id/presets ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v1/spaces/${sp.id}/presets?token=${sp.cdnToken}`),
      fetch(`${SB_MAPI_BASE}/v1/spaces/${sp.id}/presets`, { Authorization: MAPI_TOKEN! }),
    ]);

    const ourItems: any[] = ours.presets ?? [];
    const liveItems: any[] = live.presets ?? [];

    console.log(
      `    count: ours=${ourItems.length}  live=${liveItems.length} ${ourItems.length === liveItems.length ? '✅' : '❌'}`,
    );

    if (ourItems.length > 0 && liveItems.length > 0) {
      const liveFirst = liveItems[0];
      const ourFirst = ourItems.find((p: any) => p.id === liveFirst.id);
      if (ourFirst) {
        diff('first preset', ourFirst, liveFirst, [
          'id',
          'name',
          'component_id',
          'space_id',
          'icon',
          'color',
          'description',
        ]);
      }
    }
  }
}

const CDN_STORY_FIELDS = [
  'id',
  'uuid',
  'name',
  'slug',
  'full_slug',
  'path',
  'position',
  'parent_id',
  'group_id',
  'is_startpage',
  'sort_by_date',
  'tag_list',
  'published_at',
  'first_published_at',
  'lang',
  'alternates',
  'translated_slugs',
  'release_id',
  'default_full_slug',
];

async function compareCdnStoriesList() {
  console.log('\n=== CDN /v2/cdn/stories (list) ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    const qs = `token=${sp.cdnToken}&per_page=5&sort_by=position:asc&version=published`;
    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v2/cdn/stories?${qs}`),
      fetch(`${SB_CDN_BASE}/v2/cdn/stories?${qs}`),
    ]);

    const ourStories: any[] = ours.stories ?? [];
    const liveStories: any[] = live.stories ?? [];

    console.log(
      `    count (page 1): ours=${ourStories.length}  live=${liveStories.length} ${ourStories.length === liveStories.length ? '✅' : '❌'}`,
    );

    // Check cv is a number
    const cvOk = typeof ours.cv === 'number' && typeof live.cv === 'number';
    console.log(
      `    cv: ours=${ours.cv}  live=${live.cv} ${cvOk ? '✅' : '❌'} (values differ by design — just checking type)`,
    );

    // Spot-check first story
    if (ourStories.length > 0 && liveStories.length > 0) {
      const liveFirst = liveStories[0];
      const ourFirst = ourStories.find((s: any) => s.uuid === liveFirst.uuid);
      if (ourFirst) {
        diff(`story[0] uuid=${liveFirst.uuid}`, ourFirst, liveFirst, CDN_STORY_FIELDS);
        // content: just check it's an object with same component
        const contentOk = ourFirst.content?.component === liveFirst.content?.component;
        console.log(
          `    content.component: ours=${ourFirst.content?.component}  live=${liveFirst.content?.component} ${contentOk ? '✅' : '❌'}`,
        );
      } else {
        console.log(`    ❌ first live story uuid=${liveFirst.uuid} not found in our response`);
      }
    }

    // Check rels/links arrays exist
    const structOk = Array.isArray(ours.rels) && Array.isArray(ours.links);
    console.log(`    rels/links arrays: ${structOk ? '✅' : '❌'}`);
  }
}

async function compareCdnStory() {
  console.log('\n=== CDN /v2/cdn/stories/:slug (single) ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    // Fetch first story from list to get a known slug
    const listQs = `token=${sp.cdnToken}&per_page=1&sort_by=position:asc&version=published`;
    const listRes = await fetch(`${OUR_BASE}/v2/cdn/stories?${listQs}`);
    const firstStory = listRes.stories?.[0];

    if (!firstStory) {
      console.log(`    ⚠️  no published stories to test`);
      continue;
    }

    const slug = firstStory.full_slug;
    const qs = `token=${sp.cdnToken}&version=published`;
    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v2/cdn/stories/${slug}?${qs}`),
      fetch(`${SB_CDN_BASE}/v2/cdn/stories/${slug}?${qs}`),
    ]);

    if (!ours.story || !live.story) {
      console.log(
        `    ❌ slug="${slug}" ours=${JSON.stringify(ours).slice(0, 80)}  live=${JSON.stringify(live).slice(0, 80)}`,
      );
      continue;
    }

    diff(`story "${slug}"`, ours.story, live.story, CDN_STORY_FIELDS);
    const contentOk = ours.story.content?.component === live.story.content?.component;
    console.log(
      `    content.component: ours=${ours.story.content?.component}  live=${live.story.content?.component} ${contentOk ? '✅' : '❌'}`,
    );
  }
}

async function main() {
  await compareSpacesMe();
  await compareCollaborators();
  await compareComponents();
  await compareComponentGroups();
  await compareAccessTokens();
  await compareSpaceRoles();
  await compareWebhooks();
  await comparePresets();
  await compareCdnStoriesList();
  await compareCdnStory();
  console.log('\n=== Done ===');
}

main().catch(console.error);
