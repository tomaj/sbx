/**
 * Compares our API responses vs live Storyblok for spaces and users.
 * Run: npx ts-node --transpile-only src/db/compare.ts
 */

import * as https from 'https';
import * as http from 'http';

const MAPI_TOKEN = 'tN53d8vfG7VnXy596bgQZwtt-233927-7MxD9F_q4AHMddMv4p1y';
const OUR_BASE = 'http://localhost:3000';
const SB_CDN_BASE = 'https://api.storyblok.com';
const SB_MAPI_BASE = 'https://mapi.storyblok.com';

const SPACES = [
  { id: 285923, cdnToken: '1yIe1SmoT7RUDvQMzNlkGgtt', name: 'Live' },
  { id: 285922, cdnToken: 'bWXPANeJ1q1X8fHLrw0o3Qtt', name: 'Development' },
  { id: 293665, cdnToken: 'NLjjpZKtPrKfh8tHAhAdegtt', name: 'Magenta' },
  { id: 327730, cdnToken: '9qgIKrXquXTWf9pvXxOvPgtt', name: 'Telekom Apps' },
];

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
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
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
    console.log(`    ${vOurs && vLive ? '✅' : '❌'} version is number: ours=${ours.space?.version}  live=${live.space?.version}`);
  }
}

async function compareCollaborators() {
  console.log('\n=== MAPI /v1/spaces/:id/collaborators ===');

  for (const sp of SPACES) {
    console.log(`\n  [${sp.id}] ${sp.name}`);

    const [ours, live] = await Promise.all([
      fetch(`${OUR_BASE}/v1/spaces/${sp.id}/collaborators?token=${sp.cdnToken}`),
      fetch(`${SB_MAPI_BASE}/v1/spaces/${sp.id}/collaborators`, { Authorization: MAPI_TOKEN }),
    ]);

    const ourCollabs = ours.collaborators ?? [];
    const liveCollabs = live.collaborators ?? [];

    console.log(`    count: ours=${ourCollabs.length}  live=${liveCollabs.length} ${ourCollabs.length === liveCollabs.length ? '✅' : '❌'}`);

    // Compare by email (sbId as anchor)
    const liveByEmail = new Map(liveCollabs.map((c: any) => [c.user.real_email, c]));
    const ourByEmail = new Map(ourCollabs.map((c: any) => [c.user.real_email, c]));

    let emailMismatches = 0;
    for (const [email, liveC] of liveByEmail) {
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
        diff('user fields', ourC.user, liveC.user, ['firstname', 'lastname', 'real_email', 'disabled']);
      }
    }
  }
}

async function main() {
  await compareSpacesMe();
  await compareCollaborators();
  console.log('\n=== Done ===');
}

main().catch(console.error);
