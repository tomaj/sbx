import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

export const MAPI_TOKEN = process.env.STORYBLOK_TOKEN ?? '';
export const MAPI_BASE = 'https://mapi.storyblok.com';
export const GOLDEN = path.join(__dirname, '../../../golden');
export const CHUNK_SIZE = 1000;
export const REQUEST_DELAY_MS = 350; // ~3 req/s, conservative

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Simple HTTPS fetch returning parsed JSON + response headers
export function apiFetch(url: string, token: string): Promise<{ data: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: token } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({ data: JSON.parse(body), headers: res.headers as Record<string, string> });
        } catch {
          reject(new Error(`JSON parse error for ${url}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
  });
}

// ── Chunk helpers ──────────────────────────────────────────────────────────────

export function chunkDir(spaceId: number, resource: string): string {
  return path.join(GOLDEN, String(spaceId), resource);
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Read all items from chunk files, sorted by chunk filename (oldest first). */
export function readChunks(dir: string): any[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('chunk_') && f.endsWith('.json')).sort();
  const items: any[] = [];
  for (const f of files) {
    const chunk = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
    items.push(...chunk);
  }
  return items;
}

/** Write items into chunk files starting from chunkOffset (1-based). Fills CHUNK_SIZE per file. */
export function writeChunks(dir: string, newItems: any[], startChunkNum: number, startOffset: number) {
  ensureDir(dir);
  let chunkNum = startChunkNum;
  let offset = startOffset; // how many items are already in the current last chunk

  for (let i = 0; i < newItems.length; ) {
    const chunkFile = path.join(dir, `chunk_${String(chunkNum).padStart(4, '0')}.json`);
    const existing: any[] = fs.existsSync(chunkFile) ? JSON.parse(fs.readFileSync(chunkFile, 'utf-8')) : [];
    const room = CHUNK_SIZE - offset;
    const toAdd = newItems.slice(i, i + room);
    const updated = [...existing, ...toAdd];
    fs.writeFileSync(chunkFile, JSON.stringify(updated));
    i += toAdd.length;
    offset = updated.length;
    if (offset >= CHUNK_SIZE) {
      chunkNum++;
      offset = 0;
    }
  }

  return { chunkNum, lastChunkSize: offset === 0 ? CHUNK_SIZE : offset };
}

// ── State helpers ──────────────────────────────────────────────────────────────

export interface ResourceState {
  lastSyncAt: string;       // ISO timestamp of newest item we have
  totalItems: number;
  chunkCount: number;
  lastChunkSize: number;
}

export type SyncState = Record<string, ResourceState>;

export function readState(spaceId: number): SyncState {
  const p = path.join(GOLDEN, String(spaceId), '.sync-state.json');
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export function writeState(spaceId: number, state: SyncState) {
  const p = path.join(GOLDEN, String(spaceId), '.sync-state.json');
  fs.writeFileSync(p, JSON.stringify(state, null, 2));
}
