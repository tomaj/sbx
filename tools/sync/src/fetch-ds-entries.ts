/**
 * One-off script: download all datasource entries for all spaces from MAPI.
 * Usage: npx ts-node src/fetch-ds-entries.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { apiFetch, sleep, MAPI_BASE, GOLDEN, REQUEST_DELAY_MS } from './utils';

const SPACES = [285923, 285922, 293665, 327730];

function loadToken(): string {
  if (process.env.STORYBLOK_TOKEN) return process.env.STORYBLOK_TOKEN;
  const envFile = path.join(__dirname, '../../../.env.local');
  if (fs.existsSync(envFile)) {
    const match = fs.readFileSync(envFile, 'utf-8').match(/STORYBLOK_TOKEN=(.+)/);
    if (match) return match[1].trim();
  }
  throw new Error('STORYBLOK_TOKEN not found');
}

async function fetchEntriesForSpace(spaceId: number, token: string) {
  const dir = path.join(GOLDEN, String(spaceId));
  const dsFile = path.join(dir, 'datasources.json');
  if (!fs.existsSync(dsFile)) {
    console.log(`  Space ${spaceId}: no datasources.json, skipping`);
    return;
  }

  const dsList: any[] = JSON.parse(fs.readFileSync(dsFile, 'utf-8')).datasources ?? [];
  console.log(`  Space ${spaceId}: fetching entries for ${dsList.length} datasources...`);

  const allEntries: any[] = [];

  for (const ds of dsList) {
    const entries: any[] = [];
    let page = 1;
    while (true) {
      const url = `${MAPI_BASE}/v1/spaces/${spaceId}/datasource_entries?datasource_id=${ds.id}&per_page=500&page=${page}`;
      const { data, headers } = await apiFetch(url, token);
      const batch: any[] = data.datasource_entries ?? [];
      entries.push(...batch);
      const total = parseInt(headers['total'] ?? '0', 10);
      process.stdout.write(`\r    ${ds.slug}: ${entries.length}/${total}   `);
      if (entries.length >= total || batch.length < 500) break;
      page++;
      await sleep(REQUEST_DELAY_MS);
    }
    if (entries.length > 0) process.stdout.write('\n');
    // MAPI doesn't include datasource_id in the response — add it ourselves
    allEntries.push(...entries.map((e: any) => ({ ...e, datasource_id: ds.id })));
    await sleep(REQUEST_DELAY_MS);
  }

  fs.writeFileSync(
    path.join(dir, 'datasource_entries.json'),
    JSON.stringify({ datasource_entries: allEntries }, null, 2),
  );
  console.log(`  ✓ Space ${spaceId}: ${allEntries.length} entries saved`);
}

async function main() {
  const token = loadToken();
  for (const spaceId of SPACES) {
    await fetchEntriesForSpace(spaceId, token);
  }
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
