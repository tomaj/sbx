/**
 * import.ts — Import locally downloaded assets into SBX (MinIO + DB).
 *
 * Reads all .meta.json files from the local assets directory, uploads the
 * binary to MinIO (bucket: assets, key: {spaceId}/relative/path), and
 * upserts the asset record into the database.
 *
 * Idempotent: safe to re-run after wiping the local DB/MinIO.
 *
 * Usage:
 *   pnpm --filter migrate-assets import
 *
 * Env vars (defaults match docker-compose.yml):
 *   ASSETS_DIR        — local assets directory (default: <repo-root>/assets)
 *   MINIO_ENDPOINT    — http://localhost:9000
 *   MINIO_ACCESS_KEY  — minioadmin
 *   MINIO_SECRET_KEY  — minioadmin
 *   MINIO_BUCKET      — assets
 *   DATABASE_URL      — postgresql://sbx:sbx@localhost:5432/sbx
 *   SPACE_IDS         — comma-separated, default all four spaces
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import {
  collectMetaFiles,
  readMeta,
  binaryPath,
  fileExists,
  relativePathFromUrl,
  foldersPath,
} from './lib/disk.js';
import type { StoryblokAsset, AssetFolder } from './lib/types.js';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const OUT_DIR = process.env.ASSETS_DIR ?? path.join(REPO_ROOT, 'assets');
const SPACE_IDS = (process.env.SPACE_IDS ?? '285923,285922,293665,327730')
  .split(',')
  .map((s) => parseInt(s.trim(), 10));

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? 'assets';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://sbx:sbx@localhost:5432/sbx';

// MinIO concurrency: 3 parallel uploads max
const MAX_UPLOAD_CONCURRENT = 3;

function _sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  private release(): void {
    this.running--;
    const next = this.queue.shift();
    next?.();
  }
}

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: 'us-east-1', // MinIO ignores this but AWS SDK requires it
  credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY },
  forcePathStyle: true, // required for MinIO
});

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const uploadLimiter = new ConcurrencyLimiter(MAX_UPLOAD_CONCURRENT);

async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadAsset(
  asset: StoryblokAsset,
  spaceId: number,
): Promise<'uploaded' | 'skipped' | 'no_binary'> {
  // External assets have no local binary
  if (asset.is_external_url || !asset.filename.includes('a.storyblok.com')) {
    return 'no_binary';
  }

  const binPath = binaryPath(OUT_DIR, spaceId, asset);
  if (!(await fileExists(binPath))) {
    return 'no_binary';
  }

  const relativePath = relativePathFromUrl(asset);
  const key = `${spaceId}/${relativePath}`;

  // Skip if already in MinIO
  if (await objectExists(key)) {
    return 'skipped';
  }

  const body = await fs.readFile(binPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: body,
      ContentType: asset.content_type || 'application/octet-stream',
      ContentLength: body.length,
    }),
  );
  return 'uploaded';
}

async function upsertFolders(spaceId: number, folders: AssetFolder[]): Promise<void> {
  if (folders.length === 0) return;
  for (const folder of folders) {
    await db.execute(sql`
      INSERT INTO asset_folders (id, space_id, name, parent_id, uuid, created_at, updated_at)
      VALUES (
        ${folder.id},
        ${spaceId},
        ${folder.name},
        ${folder.parent_id ?? null},
        ${folder.uuid},
        ${new Date(folder.created_at)},
        ${new Date(folder.updated_at)}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        parent_id = EXCLUDED.parent_id,
        updated_at = EXCLUDED.updated_at
    `);
  }
}

async function upsertAsset(asset: StoryblokAsset, spaceId: number): Promise<void> {
  await db.execute(sql`
    INSERT INTO assets (
      id, space_id, filename, content_type, content_length,
      alt, title, copyright, focus, folder_id, locked,
      expire_at, is_external_url, meta_data, short_filename,
      created_at, updated_at
    )
    VALUES (
      ${asset.id},
      ${spaceId},
      ${asset.filename},
      ${asset.content_type ?? ''},
      ${asset.content_length ?? 0},
      ${asset.alt ?? null},
      ${asset.title ?? null},
      ${asset.copyright ?? null},
      ${asset.focus ?? null},
      ${asset.folder_id ?? null},
      ${asset.locked ?? false},
      ${asset.expire_at ? new Date(asset.expire_at) : null},
      ${asset.is_external_url ?? false},
      ${JSON.stringify(asset.meta_data ?? {})},
      ${asset.short_filename ?? ''},
      ${new Date(asset.created_at)},
      ${new Date(asset.updated_at)}
    )
    ON CONFLICT (id) DO UPDATE SET
      filename = EXCLUDED.filename,
      content_type = EXCLUDED.content_type,
      content_length = EXCLUDED.content_length,
      alt = EXCLUDED.alt,
      title = EXCLUDED.title,
      copyright = EXCLUDED.copyright,
      focus = EXCLUDED.focus,
      folder_id = EXCLUDED.folder_id,
      locked = EXCLUDED.locked,
      expire_at = EXCLUDED.expire_at,
      is_external_url = EXCLUDED.is_external_url,
      meta_data = EXCLUDED.meta_data,
      short_filename = EXCLUDED.short_filename,
      updated_at = EXCLUDED.updated_at
  `);
}

async function importSpace(spaceId: number): Promise<void> {
  console.log(`\n=== Space ${spaceId} ===`);

  const spaceDir = path.join(OUT_DIR, String(spaceId));
  let metaFiles: string[];
  try {
    metaFiles = await collectMetaFiles(spaceDir);
  } catch {
    console.error(`  No local data for space ${spaceId}. Run export.ts first.`);
    return;
  }

  // ─── Upsert folders ─────────────────────────────────────────────────────────
  const fPath = foldersPath(OUT_DIR, spaceId);
  try {
    const raw = await fs.readFile(fPath, 'utf8');
    const folders: AssetFolder[] = JSON.parse(raw);
    await upsertFolders(spaceId, folders);
    console.log(`  Upserted ${folders.length} folders into DB.`);
  } catch {
    console.log(`  No _folders.json found, skipping folder import.`);
  }

  // Filter out _manifest.json and _folders.json
  const assetMetas = metaFiles.filter((f) => !path.basename(f).startsWith('_'));
  console.log(`  Found ${assetMetas.length} assets locally.`);

  let uploaded = 0;
  let skipped = 0;
  let noBinary = 0;
  let failed = 0;
  let dbUpserted = 0;

  const tasks = assetMetas.map((metaFile) =>
    uploadLimiter.run(async () => {
      try {
        const asset = await readMeta(metaFile);

        // MinIO upload
        const result = await uploadAsset(asset, spaceId);
        if (result === 'uploaded') uploaded++;
        else if (result === 'skipped') skipped++;
        else noBinary++;

        // DB upsert
        await upsertAsset(asset, spaceId);
        dbUpserted++;
      } catch (err) {
        failed++;
        console.error(`\n  ERROR ${metaFile}: ${err}`);
      }

      const done = uploaded + skipped + noBinary + failed;
      process.stdout.write(
        `  Importing [${done}/${assetMetas.length}] ↑${uploaded} ⏭${skipped} ext${noBinary} db${dbUpserted} ✗${failed}\r`,
      );
    }),
  );

  await Promise.all(tasks);

  console.log(
    `\n  Done. ↑${uploaded} uploaded, ⏭${skipped} already in MinIO, ext${noBinary} external, db${dbUpserted} DB upserted, ✗${failed} failed.`,
  );
}

async function main() {
  console.log(`Output directory: ${OUT_DIR}`);
  console.log(`MinIO endpoint:   ${MINIO_ENDPOINT}`);
  console.log(`MinIO bucket:     ${MINIO_BUCKET}`);
  console.log(`Database:         ${DATABASE_URL}`);
  console.log();

  for (const spaceId of SPACE_IDS) {
    await importSpace(spaceId);
  }

  console.log('\nAll done.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
