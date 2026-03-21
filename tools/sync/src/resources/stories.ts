/**
 * Stories: sorted by updated_at:desc, stop when we hit already-known items.
 * Chunk files contain full story objects (with content).
 * On incremental sync: new/updated stories are fetched and upserted into chunks by ID.
 */
import * as fs from 'fs';
import * as path from 'path';
import { apiFetch, sleep, chunkDir, ensureDir, readChunks, writeChunks, readState, writeState, MAPI_BASE, REQUEST_DELAY_MS, CHUNK_SIZE } from '../utils';

const PER_PAGE = 100;
const RESOURCE = 'stories';

export async function syncStories(spaceId: number, token: string, full = false): Promise<void> {
  const state = readState(spaceId);
  const prevState = state[RESOURCE];
  const knownNewestAt = full ? null : (prevState?.lastSyncAt ?? null);
  const dir = chunkDir(spaceId, RESOURCE);

  console.log(`    stories: lastSyncAt=${knownNewestAt ?? 'none (full sync)'}`);

  // Collect new/updated items
  const updatedItems: any[] = [];
  let page = 1;
  let done = false;
  let totalOnServer = 0;

  while (!done) {
    const url = `${MAPI_BASE}/v1/spaces/${spaceId}/stories?per_page=${PER_PAGE}&page=${page}&sort_by=updated_at:desc&with_content=1`;
    const { data, headers } = await apiFetch(url, token);
    totalOnServer = parseInt(headers['total'] ?? '0', 10);
    const batch: any[] = data.stories ?? [];

    if (batch.length === 0) break;

    for (const story of batch) {
      if (knownNewestAt && story.updated_at <= knownNewestAt) {
        done = true;
        break;
      }
      updatedItems.push(story);
    }

    if (!done && batch.length < PER_PAGE) done = true;
    if (!done) {
      page++;
      process.stdout.write(`\r    stories: page ${page}, collected ${updatedItems.length}...`);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  process.stdout.write('\n');

  if (updatedItems.length === 0) {
    console.log(`    stories: nothing new`);
    return;
  }

  if (knownNewestAt === null) {
    // Full sync: write all items into fresh chunks (oldest-first)
    updatedItems.reverse(); // sort oldest-first
    ensureDir(dir);
    // Clear existing chunks
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).filter(f => f.startsWith('chunk_')).forEach(f => fs.unlinkSync(path.join(dir, f)));
    }
    const { chunkNum, lastChunkSize } = writeChunks(dir, updatedItems, 1, 0);
    const newestStory = updatedItems[updatedItems.length - 1];

    state[RESOURCE] = {
      lastSyncAt: newestStory.updated_at,
      totalItems: updatedItems.length,
      chunkCount: chunkNum,
      lastChunkSize,
    };
  } else {
    // Incremental: upsert updated items into existing chunks by ID
    const existing = readChunks(dir);
    const byId = new Map(existing.map((s: any) => [s.id, s]));
    let newCount = 0;

    for (const story of updatedItems) {
      if (!byId.has(story.id)) newCount++;
      byId.set(story.id, story);
    }

    // Re-sort by id ascending (stable order) and rewrite chunks
    const all = Array.from(byId.values()).sort((a, b) => (a.id > b.id ? 1 : -1));
    ensureDir(dir);
    fs.readdirSync(dir).filter(f => f.startsWith('chunk_')).forEach(f => fs.unlinkSync(path.join(dir, f)));
    const { chunkNum, lastChunkSize } = writeChunks(dir, all, 1, 0);
    const newestStory = updatedItems[0]; // still newest-first order

    state[RESOURCE] = {
      lastSyncAt: newestStory.updated_at,
      totalItems: all.length,
      chunkCount: chunkNum,
      lastChunkSize,
    };

    console.log(`    stories: ${updatedItems.length} updated (${newCount} new), total ${all.length}`);
  }

  writeState(spaceId, state);

  if (knownNewestAt === null) {
    console.log(`    stories: full sync ${updatedItems.length} (server: ${totalOnServer}), chunks: ${state[RESOURCE].chunkCount}`);
  }
}
