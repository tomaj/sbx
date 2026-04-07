/**
 * Rate-limited Storyblok Management API client.
 *
 * Conservative limits to avoid impacting the production API:
 *   - Minimum 1 000 ms gap between every MAPI request
 *   - On 429: honour Retry-After header (default 60 s) and retry
 *   - Up to MAX_RETRIES attempts per call before hard-failing
 */

import type { StoryblokAsset, AssetFolder } from './types.js';

const BASE_URL = 'https://mapi.storyblok.com';
const REQUEST_DELAY_MS = 1_000; // 1 s between MAPI calls
const MAX_RETRIES = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastRequestAt = 0;

async function mapiRequest<T>(path: string, token: string): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Enforce minimum gap between requests
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < REQUEST_DELAY_MS) {
      await sleep(REQUEST_DELAY_MS - elapsed);
    }

    lastRequestAt = Date.now();

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        headers: { Authorization: token },
      });
    } catch (err) {
      // Network error — wait and retry
      const wait = 2_000 * (attempt + 1);
      console.warn(
        `  Network error (attempt ${attempt + 1}): ${err}. Retrying in ${wait / 1000}s…`,
      );
      await sleep(wait);
      continue;
    }

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10);
      console.warn(`  Rate limited. Waiting ${retryAfter}s before retrying…`);
      await sleep(retryAfter * 1_000);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`MAPI ${path} → HTTP ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  throw new Error(`Max retries (${MAX_RETRIES}) exceeded for ${path}`);
}

export async function fetchAssetsPage(
  spaceId: number,
  page: number,
  token: string,
  perPage = 100,
): Promise<{ assets: StoryblokAsset[]; total: string }> {
  return mapiRequest<{ assets: StoryblokAsset[]; total: string }>(
    `/v1/spaces/${spaceId}/assets?per_page=${perPage}&page=${page}&sort_by=created_at:asc`,
    token,
  );
}

export async function fetchAssetFolders(
  spaceId: number,
  token: string,
): Promise<{ asset_folders: AssetFolder[] }> {
  return mapiRequest<{ asset_folders: AssetFolder[] }>(
    `/v1/spaces/${spaceId}/asset_folders`,
    token,
  );
}
