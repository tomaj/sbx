/**
 * assets.ts — Sync Storyblok assets (metadata + binaries) to golden data.
 *
 * Golden data: golden/{spaceId}/assets/
 *   folder/image.jpg            — binary file
 *   folder/image.jpg.meta.json  — asset metadata sidecar
 *   _manifest.json              — state: last_synced_at, asset_ids (for deletion detection)
 *   _folders.json               — asset folder hierarchy
 *
 * Full (--full or no manifest): download all binaries.
 * Incremental (manifest exists): only download new/updated binaries.
 */
import * as fs from 'fs';
import * as path from 'path';
import { GOLDEN, sleep } from '../utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssetMeta {
  id: number;
  filename: string;
  content_type: string;
  content_length: number;
  alt: string | null;
  title: string | null;
  copyright: string | null;
  focus: string | null;
  folder_id: number | null;
  locked: boolean;
  updated_at: string;
  created_at: string;
  expire_at: string | null;
  is_external_url: boolean;
  meta_data: Record<string, unknown>;
  short_filename: string;
}

interface Manifest {
  space_id: number;
  last_synced_at: string;
  total_count: number;
  downloaded_count: number;
  asset_ids: number[];
}

// ── Paths ─────────────────────────────────────────────────────────────────────

function assetsDir(spaceId: number): string {
  return path.join(GOLDEN, String(spaceId), 'assets');
}

function relPathFromUrl(asset: AssetMeta): string {
  const match = asset.filename.match(/\/f\/\d+\/(.+)$/);
  if (!match) throw new Error(`Unexpected asset filename: ${asset.filename}`);
  return match[1];
}

function binPath(spaceId: number, asset: AssetMeta): string {
  return path.join(assetsDir(spaceId), relPathFromUrl(asset));
}

function metaFilePath(spaceId: number, asset: AssetMeta): string {
  return binPath(spaceId, asset) + '.meta.json';
}

function manifestFilePath(spaceId: number): string {
  return path.join(assetsDir(spaceId), '_manifest.json');
}

function foldersFilePath(spaceId: number): string {
  return path.join(assetsDir(spaceId), '_folders.json');
}

// ── MAPI client ───────────────────────────────────────────────────────────────

const MAPI_BASE = 'https://mapi.storyblok.com';
const MAPI_DELAY_MS = 1000; // 1 req/s for asset metadata (heavier than other resources)

let lastMapiAt = 0;

async function mapiGet<T>(urlPath: string, token: string): Promise<{ data: T; total: number }> {
  for (let attempt = 0; attempt <= 5; attempt++) {
    const elapsed = Date.now() - lastMapiAt;
    if (elapsed < MAPI_DELAY_MS) await sleep(MAPI_DELAY_MS - elapsed);
    lastMapiAt = Date.now();

    const res = await fetch(`${MAPI_BASE}${urlPath}`, {
      headers: { Authorization: token },
    });

    if (res.status === 429) {
      const wait = parseInt(res.headers.get('Retry-After') ?? '60', 10) * 1000;
      console.warn(`    Rate limited, waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`MAPI ${urlPath} → ${res.status}: ${body}`);
    }
    // Storyblok returns total count in the 'total' response header
    const total = parseInt(res.headers.get('total') ?? '0', 10);
    const data = await res.json() as T;
    return { data, total };
  }
  throw new Error(`Max retries exceeded for ${urlPath}`);
}

async function fetchAllAssets(spaceId: number, token: string): Promise<AssetMeta[]> {
  const { data: first, total } = await mapiGet<{ assets: AssetMeta[] }>(
    `/v1/spaces/${spaceId}/assets?per_page=100&page=1&sort_by=created_at:asc`,
    token,
  );
  const totalPages = Math.ceil(total / 100);
  const all: AssetMeta[] = [...first.assets];

  for (let page = 2; page <= totalPages; page++) {
    process.stdout.write(`    Fetching metadata page ${page}/${totalPages}...\r`);
    const { data } = await mapiGet<{ assets: AssetMeta[] }>(
      `/v1/spaces/${spaceId}/assets?per_page=100&page=${page}&sort_by=created_at:asc`,
      token,
    );
    all.push(...data.assets);
  }
  if (totalPages > 1) process.stdout.write('\n');
  return all;
}

async function fetchFolders(spaceId: number, token: string): Promise<unknown[]> {
  const { data } = await mapiGet<{ asset_folders: unknown[] }>(
    `/v1/spaces/${spaceId}/asset_folders`,
    token,
  );
  return data.asset_folders;
}

// ── Binary downloader ─────────────────────────────────────────────────────────

const MAX_CONCURRENT = 2;
const DOWNLOAD_STAGGER_MS = 500;

class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.queue.push(() => { this.running++; resolve(); });
    });
  }

  private release() {
    this.running--;
    this.queue.shift()?.();
  }
}

const downloadLimiter = new ConcurrencyLimiter(MAX_CONCURRENT);
let lastDownloadAt = 0;

async function downloadBinary(url: string): Promise<Buffer> {
  return downloadLimiter.run(async () => {
    const elapsed = Date.now() - lastDownloadAt;
    if (elapsed < DOWNLOAD_STAGGER_MS) await sleep(DOWNLOAD_STAGGER_MS - elapsed);
    lastDownloadAt = Date.now();

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return Buffer.from(await res.arrayBuffer());
      } catch (err) {
        if (attempt === 3) throw err;
        await sleep(3000 * (attempt + 1));
      }
    }
    throw new Error('unreachable');
  });
}

// ── File helpers ──────────────────────────────────────────────────────────────

function writeFileSafe(filePath: string, data: Buffer | string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
}

function readManifest(spaceId: number): Manifest | null {
  try {
    return JSON.parse(fs.readFileSync(manifestFilePath(spaceId), 'utf-8')) as Manifest;
  } catch {
    return null;
  }
}

function readLocalMeta(filePath: string): AssetMeta | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as AssetMeta;
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function syncAssets(spaceId: number, token: string, full: boolean): Promise<void> {
  const manifest = readManifest(spaceId);
  const isIncremental = !full && manifest !== null;

  console.log(`  assets (${isIncremental ? 'incremental' : 'full'}):`);
  if (isIncremental) {
    console.log(`    last synced: ${manifest!.last_synced_at}`);
  }

  // Fetch asset folders
  const folders = await fetchFolders(spaceId, token);
  writeFileSafe(foldersFilePath(spaceId), JSON.stringify(folders, null, 2));

  // Fetch all asset metadata
  const assets = await fetchAllAssets(spaceId, token);
  console.log(`    ${assets.length} assets found remotely`);

  // Deletion detection
  if (isIncremental && manifest!.asset_ids.length > 0) {
    const remoteIds = new Set(assets.map(a => a.id));
    const deleted = manifest!.asset_ids.filter(id => !remoteIds.has(id));
    if (deleted.length > 0) {
      console.log(`    ${deleted.length} deleted assets detected (not auto-removed)`);
    }
  }

  let downloaded = 0;
  let skipped = 0;
  let external = 0;
  let failed = 0;
  const total = assets.length;

  const tasks = assets.map(asset => (async () => {
    try {
      // External URLs: just save/update meta, no binary
      if (asset.is_external_url || !asset.filename.includes('a.storyblok.com')) {
        writeFileSafe(metaFilePath(spaceId, asset), JSON.stringify(asset, null, 2));
        external++;
        return;
      }

      const mPath = metaFilePath(spaceId, asset);

      if (isIncremental) {
        const localMeta = readLocalMeta(mPath);
        if (localMeta && new Date(asset.updated_at) <= new Date(localMeta.updated_at)) {
          skipped++;
          return;
        }
      } else {
        // Full sync: skip if already downloaded (resume-safe)
        if (fs.existsSync(mPath)) {
          skipped++;
          return;
        }
      }

      const buffer = await downloadBinary(asset.filename);
      writeFileSafe(binPath(spaceId, asset), buffer);
      writeFileSafe(mPath, JSON.stringify(asset, null, 2));
      downloaded++;
    } catch (err) {
      failed++;
      console.error(`\n    ERROR asset ${asset.id}: ${err}`);
    }

    const done = downloaded + skipped + external + failed;
    process.stdout.write(
      `    [${done}/${total}] ↓${downloaded} ⏭${skipped} ext${external} ✗${failed}\r`,
    );
  })());

  await Promise.all(tasks);
  process.stdout.write('\n');
  console.log(`    ↓${downloaded} downloaded, ⏭${skipped} skipped, ext${external} external, ✗${failed} failed`);

  const newManifest: Manifest = {
    space_id: spaceId,
    last_synced_at: new Date().toISOString(),
    total_count: assets.length,
    downloaded_count: downloaded + skipped + external,
    asset_ids: assets.map(a => a.id),
  };
  writeFileSafe(manifestFilePath(spaceId), JSON.stringify(newManifest, null, 2));
}
