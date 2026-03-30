/**
 * Story Versions: per-story history, fetched via /story_versions?by_story_id=X
 *
 * Strategy:
 *   Full sync:        fetch versions for ALL non-folder stories
 *   Incremental sync: fetch versions only for stories updated since lastSyncAt
 *
 * Versions are stored as a flat list sorted by (story_id ASC, version_id ASC),
 * split into CHUNK_SIZE chunk files.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  apiFetch, sleep, chunkDir, ensureDir, readChunks, writeChunks,
  readState, writeState, MAPI_BASE, REQUEST_DELAY_MS, CHUNK_SIZE, GOLDEN,
} from '../utils';

const PER_PAGE = 100;
const RESOURCE = 'story_versions';
const STORIES_RESOURCE = 'stories';

/** Read all story objects from golden story chunks for a given space */
function readGoldenStories(spaceId: number): any[] {
  const dir = path.join(GOLDEN, String(spaceId), STORIES_RESOURCE);
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

/** Fetch all versions for a single story (handles pagination) */
async function fetchStoryVersions(spaceId: number, storyId: number, token: string): Promise<any[]> {
  const versions: any[] = [];
  let page = 1;

  while (true) {
    const url = `${MAPI_BASE}/v1/spaces/${spaceId}/story_versions?by_story_id=${storyId}&per_page=${PER_PAGE}&page=${page}&by_release_id=0&show_content=true`;
    const { data } = await apiFetch(url, token);
    const batch: any[] = data.story_versions ?? [];
    versions.push(...batch);
    if (batch.length < PER_PAGE) break;
    page++;
    await sleep(REQUEST_DELAY_MS);
  }

  return versions;
}

export async function syncStoryVersions(spaceId: number, token: string, full = false): Promise<void> {
  const state = readState(spaceId);
  const prevState = state[RESOURCE] as any;
  const dir = chunkDir(spaceId, RESOURCE);

  // All stories from golden data
  const allStories = readGoldenStories(spaceId);
  if (allStories.length === 0) {
    console.log(`    story_versions: no stories in golden data — run stories sync first`);
    return;
  }

  // Non-folder stories only
  const contentStories = allStories.filter((s: any) => !s.is_folder);
  console.log(`    story_versions: ${contentStories.length} content stories total`);

  // Determine which stories to (re-)fetch
  let storiesToFetch: any[];
  const lastSyncAt: string | null = full ? null : (prevState?.lastSyncAt ?? null);

  if (lastSyncAt === null) {
    // Full sync — fetch all
    storiesToFetch = contentStories;
  } else {
    // Incremental — only stories updated after lastSyncAt
    storiesToFetch = contentStories.filter((s: any) => s.updated_at > lastSyncAt);
    if (storiesToFetch.length === 0) {
      console.log(`    story_versions: nothing new`);
      return;
    }
  }

  console.log(`    story_versions: fetching for ${storiesToFetch.length} stories...`);

  ensureDir(dir);
  // Clear old chunks upfront for full sync
  if (lastSyncAt === null) {
    fs.readdirSync(dir).filter((f) => f.startsWith('chunk_')).forEach((f) =>
      fs.unlinkSync(path.join(dir, f)));
  }

  // Write incrementally: accumulate a buffer, flush every FLUSH_EVERY versions
  const FLUSH_EVERY = 500;
  let buffer: any[] = [];
  let chunkIndex = 1;
  let totalVersions = 0;
  let lastChunkSize = 0;
  let newestUpdatedAt = '';

  function flushBuffer(force = false) {
    if (buffer.length === 0) return;
    if (!force && buffer.length < FLUSH_EVERY) return;

    // Write as many full chunks as possible
    while (buffer.length >= CHUNK_SIZE || (force && buffer.length > 0)) {
      const chunk = buffer.splice(0, CHUNK_SIZE);
      const fileName = `chunk_${String(chunkIndex).padStart(4, '0')}.json`;
      fs.writeFileSync(path.join(dir, fileName), JSON.stringify(chunk, null, 2));
      lastChunkSize = chunk.length;
      chunkIndex++;
    }
  }

  let fetched = 0;
  for (const story of storiesToFetch) {
    try {
      const versions = await fetchStoryVersions(spaceId, story.id, token);
      buffer.push(...versions.sort((a, b) => a.id - b.id));
      totalVersions += versions.length;
      flushBuffer();
    } catch (e: any) {
      console.warn(`\n    story_versions: failed for story ${story.id}: ${e.message}`);
    }

    if (story.updated_at > newestUpdatedAt) newestUpdatedAt = story.updated_at;

    fetched++;
    if (fetched % 20 === 0) {
      process.stdout.write(`\r    story_versions: fetched ${fetched}/${storiesToFetch.length} (${totalVersions} versions)...`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
  // Flush remaining
  flushBuffer(true);
  process.stdout.write('\n');

  const finalChunkCount = chunkIndex - 1;
  state[RESOURCE] = {
    lastSyncAt: newestUpdatedAt || storiesToFetch[0]?.updated_at,
    totalItems: totalVersions,
    chunkCount: finalChunkCount,
    lastChunkSize,
  };
  writeState(spaceId, state);
  console.log(`    story_versions: ${totalVersions} versions across ${storiesToFetch.length} stories, chunks: ${finalChunkCount}`);
}
