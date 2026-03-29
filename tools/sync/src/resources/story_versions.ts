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

  // Fetch versions for each story
  const newVersionsByStoryId = new Map<number, any[]>();
  let fetched = 0;

  for (const story of storiesToFetch) {
    try {
      const versions = await fetchStoryVersions(spaceId, story.id, token);
      newVersionsByStoryId.set(story.id, versions);
    } catch (e: any) {
      console.warn(`\n    story_versions: failed for story ${story.id}: ${e.message}`);
    }
    fetched++;
    if (fetched % 10 === 0) {
      process.stdout.write(`\r    story_versions: fetched ${fetched}/${storiesToFetch.length}...`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
  process.stdout.write('\n');

  const totalNewVersions = [...newVersionsByStoryId.values()].reduce((s, v) => s + v.length, 0);

  if (totalNewVersions === 0) {
    console.log(`    story_versions: no versions found`);
    // Still update lastSyncAt
    const newestStory = storiesToFetch.reduce((a: any, b: any) =>
      a.updated_at > b.updated_at ? a : b, storiesToFetch[0]);
    state[RESOURCE] = { ...prevState, lastSyncAt: newestStory.updated_at };
    writeState(spaceId, state);
    return;
  }

  if (lastSyncAt === null) {
    // Full sync: write fresh chunks
    const allVersions = [...newVersionsByStoryId.entries()]
      .sort(([a], [b]) => a - b)
      .flatMap(([, versions]) => versions.sort((a, b) => a.id - b.id));

    ensureDir(dir);
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).filter((f) => f.startsWith('chunk_')).forEach((f) =>
        fs.unlinkSync(path.join(dir, f)));
    }
    const { chunkNum, lastChunkSize } = writeChunks(dir, allVersions, 1, 0);
    const newestStory = storiesToFetch.reduce((a: any, b: any) =>
      a.updated_at > b.updated_at ? a : b, storiesToFetch[0]);

    state[RESOURCE] = {
      lastSyncAt: newestStory.updated_at,
      totalItems: allVersions.length,
      chunkCount: chunkNum,
      lastChunkSize,
    };
    console.log(`    story_versions: full sync ${allVersions.length} versions across ${storiesToFetch.length} stories, chunks: ${chunkNum}`);
  } else {
    // Incremental: merge into existing chunks, replacing versions for updated stories
    const existing = readChunks(dir);
    // Remove old versions for re-fetched stories
    const updatedStoryIds = new Set(storiesToFetch.map((s: any) => s.id));
    const filtered = existing.filter((v: any) => !updatedStoryIds.has(v.story_id));

    // Merge new versions
    const newVersionsFlat = [...newVersionsByStoryId.entries()]
      .sort(([a], [b]) => a - b)
      .flatMap(([, versions]) => versions.sort((a, b) => a.id - b.id));

    const all = [...filtered, ...newVersionsFlat].sort((a: any, b: any) =>
      a.story_id !== b.story_id ? a.story_id - b.story_id : a.id - b.id);

    ensureDir(dir);
    fs.readdirSync(dir).filter((f) => f.startsWith('chunk_')).forEach((f) =>
      fs.unlinkSync(path.join(dir, f)));
    const { chunkNum, lastChunkSize } = writeChunks(dir, all, 1, 0);
    const newestStory = storiesToFetch.reduce((a: any, b: any) =>
      a.updated_at > b.updated_at ? a : b, storiesToFetch[0]);

    state[RESOURCE] = {
      lastSyncAt: newestStory.updated_at,
      totalItems: all.length,
      chunkCount: chunkNum,
      lastChunkSize,
    };
    console.log(`    story_versions: +${totalNewVersions} versions for ${storiesToFetch.length} stories → total ${all.length}, chunks: ${chunkNum}`);
  }

  writeState(spaceId, state);
}
