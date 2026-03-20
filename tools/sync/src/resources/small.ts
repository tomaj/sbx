/**
 * Small resources: full refresh every sync (fast enough, no chunking needed).
 */
import * as fs from 'fs';
import * as path from 'path';
import { apiFetch, sleep, MAPI_BASE, GOLDEN, REQUEST_DELAY_MS } from '../utils';

interface SmallResource {
  name: string;       // output filename (without .json)
  endpoint: string;   // relative to /v1/spaces/:spaceId/
  key: string;        // top-level key in response
  perPage?: number;
}

const SMALL_RESOURCES: SmallResource[] = [
  { name: 'collaborators',     endpoint: 'collaborators',     key: 'collaborators'     },
  { name: 'access_tokens',     endpoint: 'api_keys',          key: 'api_keys'          },
  { name: 'space_roles',       endpoint: 'space_roles',       key: 'space_roles'       },
  { name: 'webhooks',          endpoint: 'webhook_endpoints', key: 'webhook_endpoints' },
  { name: 'components',        endpoint: 'components',        key: 'components'        },
  { name: 'component_groups',  endpoint: 'component_groups',  key: 'component_groups'  },
  { name: 'presets',           endpoint: 'presets',           key: 'presets'           },
  { name: 'datasources',       endpoint: 'datasources',       key: 'datasources'       },
];

/** Fetch all pages of a resource (handles pagination automatically). */
async function fetchAll(spaceId: number, res: SmallResource, token: string): Promise<any[]> {
  const items: any[] = [];
  let page = 1;
  while (true) {
    const url = `${MAPI_BASE}/v1/spaces/${spaceId}/${res.endpoint}?per_page=${res.perPage ?? 200}&page=${page}`;
    const { data, headers } = await apiFetch(url, token);
    const batch: any[] = data[res.key] ?? [];
    items.push(...batch);
    const total = parseInt(headers['total'] ?? '0', 10);
    const perPage = parseInt(headers['per-page'] ?? '200', 10);
    if (items.length >= total || batch.length < perPage) break;
    page++;
    await sleep(REQUEST_DELAY_MS);
  }
  return items;
}

export async function syncSmall(spaceId: number, token: string): Promise<void> {
  const dir = path.join(GOLDEN, String(spaceId));
  fs.mkdirSync(dir, { recursive: true });

  for (const res of SMALL_RESOURCES) {
    const items = await fetchAll(spaceId, res, token);
    fs.writeFileSync(path.join(dir, `${res.name}.json`), JSON.stringify({ [res.key]: items }, null, 2));
    console.log(`    ${res.name}: ${items.length}`);
    await sleep(REQUEST_DELAY_MS);
  }
}
