/**
 * Activities: append-only, newest-first from API.
 * Strategy: fetch pages from newest until we hit an item we already have,
 * then append only the new items to chunk files.
 */
import {
  apiFetch,
  sleep,
  chunkDir,
  writeChunks,
  readState,
  writeState,
  MAPI_BASE,
  REQUEST_DELAY_MS,
} from '../utils';

const PER_PAGE = 1000;
const RESOURCE = 'activities';

export async function syncActivities(spaceId: number, token: string, full = false): Promise<void> {
  const state = readState(spaceId);
  const prevState = state[RESOURCE];
  const knownNewestAt = full ? null : (prevState?.lastSyncAt ?? null);
  const dir = chunkDir(spaceId, RESOURCE);

  console.log(`    activities: lastSyncAt=${knownNewestAt ?? 'none (full sync)'}`);

  // Collect new items (newest first from API)
  const newItems: any[] = [];
  let page = 1;
  let done = false;
  let totalOnServer = 0;

  while (!done) {
    const url = `${MAPI_BASE}/v1/spaces/${spaceId}/activities?per_page=${PER_PAGE}&page=${page}`;
    const { data, headers } = await apiFetch(url, token);
    totalOnServer = parseInt(headers.total ?? '0', 10);
    const batch: any[] = data.activities ?? [];

    if (batch.length === 0) break;

    for (const item of batch) {
      const itemAt = item.activity.created_at;
      if (knownNewestAt && itemAt <= knownNewestAt) {
        done = true;
        break;
      }
      newItems.push(item);
    }

    if (!done && batch.length < PER_PAGE) done = true;
    if (!done) {
      page++;
      process.stdout.write(`\r    activities: page ${page}, collected ${newItems.length} new...`);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  process.stdout.write('\n');

  if (newItems.length === 0) {
    console.log(`    activities: nothing new`);
    return;
  }

  // Items are newest-first — reverse so chunks are oldest-first (consistent read order)
  newItems.reverse();

  // Determine where to start writing (append to last chunk)
  const startChunkNum = prevState?.chunkCount ?? 1;
  const startOffset = prevState?.lastChunkSize ?? 0;

  const { chunkNum, lastChunkSize } = writeChunks(
    dir,
    newItems,
    startChunkNum,
    startOffset === 1000 ? 1000 : startOffset,
  );

  const totalItems = (prevState?.totalItems ?? 0) + newItems.length;
  const newestItem = newItems[newItems.length - 1]; // after reverse, last = newest

  state[RESOURCE] = {
    lastSyncAt: newestItem.activity.created_at,
    totalItems,
    chunkCount: chunkNum,
    lastChunkSize,
  };
  writeState(spaceId, state);

  console.log(
    `    activities: +${newItems.length} new → total ${totalItems} (server: ${totalOnServer}), chunks: ${chunkNum}`,
  );
}
