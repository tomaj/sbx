/**
 * seed-from-golden.ts — Seed DB + MinIO from golden data directory.
 *
 * Reads assets from golden/{spaceId}/assets/, uploads binaries to MinIO,
 * and upserts asset_folders + assets into PostgreSQL.
 *
 * Usage:
 *   SPACE_IDS=285923 pnpm --filter migrate-assets seed-from-golden
 *
 * Env vars (defaults match docker-compose.yml):
 *   GOLDEN_DIR        — path to golden directory (default: <repo-root>/golden)
 *   MINIO_ENDPOINT    — http://localhost:9000
 *   MINIO_ACCESS_KEY  — minioadmin
 *   MINIO_SECRET_KEY  — minioadmin
 *   MINIO_BUCKET      — assets
 *   DATABASE_URL      — postgresql://sbx:sbx@localhost:5432/sbx
 *   SPACE_IDS         — comma-separated space IDs to seed (default: 285923)
 *   SKIP_MINIO        — set to "true" to skip MinIO uploads (DB only)
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const GOLDEN_DIR = process.env.GOLDEN_DIR ?? path.join(REPO_ROOT, 'golden');
const SPACE_IDS = (process.env.SPACE_IDS ?? '285923').split(',').map((s) => parseInt(s.trim(), 10));
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? 'assets';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://sbx:sbx@localhost:5432/sbx';
const SKIP_MINIO = process.env.SKIP_MINIO === 'true';

const MAX_CONCURRENT = 5;

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY },
  forcePathStyle: true,
});

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

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

  private release() {
    this.running--;
    this.queue.shift()?.();
  }
}

const limiter = new ConcurrencyLimiter(MAX_CONCURRENT);

async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Recursively collect all files in a directory. */
async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        results.push(full);
      }
    }
  }
  await walk(dir);
  return results;
}

async function seedSpace(spaceId: number): Promise<void> {
  console.log(`\n=== Space ${spaceId} ===`);
  const assetsDir = path.join(GOLDEN_DIR, String(spaceId), 'assets');

  try {
    await fs.access(assetsDir);
  } catch {
    console.error(`  No assets directory found at ${assetsDir}`);
    return;
  }

  // ─── Seed folders ────────────────────────────────────────────────────────────
  const foldersFile = path.join(assetsDir, '_folders.json');
  try {
    const raw = await fs.readFile(foldersFile, 'utf8');
    const folders = JSON.parse(raw) as any[];
    let folderCount = 0;
    for (const folder of folders) {
      try {
        await db.execute(sql`
          INSERT INTO asset_folders (id, space_id, name, parent_id, uuid, created_at, updated_at)
          VALUES (
            ${folder.id},
            ${spaceId},
            ${folder.name},
            ${folder.parent_id ?? null},
            ${folder.uuid},
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            parent_id = EXCLUDED.parent_id,
            updated_at = NOW()
        `);
        folderCount++;
      } catch (err) {
        console.error(`\n  ERROR folder ${folder.id}: ${err}`);
      }
    }
    console.log(`  Upserted ${folderCount}/${folders.length} folders.`);
  } catch {
    console.log(`  No _folders.json, skipping folders.`);
  }

  // ─── Collect all files ───────────────────────────────────────────────────────
  const allFiles = await walkDir(assetsDir);
  const metaFiles = allFiles.filter(
    (f) => f.endsWith('.meta.json') && !path.basename(f).startsWith('_'),
  );
  const binaryFiles = allFiles.filter(
    (f) => !f.endsWith('.meta.json') && !path.basename(f).startsWith('_'),
  );

  console.log(`  Found ${metaFiles.length} meta files, ${binaryFiles.length} binaries.`);

  // ─── Upload binaries to MinIO ────────────────────────────────────────────────
  if (!SKIP_MINIO) {
    let minioUploaded = 0;
    let minioSkipped = 0;
    let minioFailed = 0;

    const uploadTasks = binaryFiles.map((filePath) =>
      limiter.run(async () => {
        // Build relative path: everything after assetsDir/
        const relativePath = path.relative(assetsDir, filePath);
        const key = `${spaceId}/${relativePath}`;
        try {
          if (await objectExists(key)) {
            minioSkipped++;
          } else {
            const body = await fs.readFile(filePath);
            // Detect content type from extension
            const ext = path.extname(filePath).toLowerCase().slice(1);
            const contentTypeMap: Record<string, string> = {
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              gif: 'image/gif',
              webp: 'image/webp',
              svg: 'image/svg+xml',
              pdf: 'application/pdf',
              json: 'application/json',
              mp4: 'video/mp4',
              mp3: 'audio/mpeg',
            };
            const contentType = contentTypeMap[ext] ?? 'application/octet-stream';
            await s3.send(
              new PutObjectCommand({
                Bucket: MINIO_BUCKET,
                Key: key,
                Body: body,
                ContentType: contentType,
                ContentLength: body.length,
              }),
            );
            minioUploaded++;
          }
        } catch (err) {
          minioFailed++;
          console.error(`\n  ERROR upload ${key}: ${err}`);
        }
        const done = minioUploaded + minioSkipped + minioFailed;
        process.stdout.write(
          `  MinIO [${done}/${binaryFiles.length}] ↑${minioUploaded} ⏭${minioSkipped} ✗${minioFailed}\r`,
        );
      }),
    );
    await Promise.all(uploadTasks);
    console.log(
      `\n  MinIO done: ↑${minioUploaded} uploaded, ⏭${minioSkipped} skipped, ✗${minioFailed} failed.`,
    );
  } else {
    console.log('  Skipping MinIO uploads (SKIP_MINIO=true).');
  }

  // ─── Upsert assets into DB ───────────────────────────────────────────────────
  let dbUpserted = 0;
  let dbFailed = 0;

  const dbTasks = metaFiles.map((metaFile) =>
    limiter.run(async () => {
      try {
        const raw = await fs.readFile(metaFile, 'utf8');
        const asset = JSON.parse(raw);

        // Some meta files use asset_folder_id instead of folder_id
        const folderId = asset.folder_id ?? asset.asset_folder_id ?? null;

        // Derive short_filename from filename URL
        const shortFilename =
          asset.short_filename ??
          asset.filename
            ?.split('/')
            .pop()
            ?.replace(/\.\w+$/, '') ??
          '';

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
            ${asset.filename ?? ''},
            ${asset.content_type ?? ''},
            ${asset.content_length ?? 0},
            ${asset.alt ?? null},
            ${asset.title ?? null},
            ${asset.copyright ?? null},
            ${asset.focus ?? null},
            ${folderId},
            ${asset.locked ?? false},
            ${asset.expire_at ? new Date(asset.expire_at) : null},
            ${asset.is_external_url ?? false},
            ${JSON.stringify(asset.meta_data ?? {})},
            ${shortFilename},
            ${asset.created_at ? new Date(asset.created_at) : new Date()},
            ${asset.updated_at ? new Date(asset.updated_at) : new Date()}
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
        dbUpserted++;
      } catch (err) {
        dbFailed++;
        console.error(`\n  ERROR db ${metaFile}: ${err}`);
      }
      const done = dbUpserted + dbFailed;
      process.stdout.write(`  DB [${done}/${metaFiles.length}] ✓${dbUpserted} ✗${dbFailed}\r`);
    }),
  );
  await Promise.all(dbTasks);
  console.log(`\n  DB done: ✓${dbUpserted} upserted, ✗${dbFailed} failed.`);
}

async function main() {
  console.log(`Golden dir:  ${GOLDEN_DIR}`);
  console.log(`MinIO:       ${SKIP_MINIO ? 'SKIP' : MINIO_ENDPOINT}`);
  console.log(`Database:    ${DATABASE_URL}`);
  console.log(`Spaces:      ${SPACE_IDS.join(', ')}`);

  for (const spaceId of SPACE_IDS) {
    await seedSpace(spaceId);
  }

  console.log('\nAll done.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
