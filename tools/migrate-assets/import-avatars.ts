/**
 * import.ts — Download Storyblok user avatars and store them in MinIO.
 *
 * Reads collaborators from golden data files, fetches each avatar from
 * Storyblok CDN (https://a.storyblok.com/avatars/...), uploads to MinIO
 * under the same key, and updates the avatar field in the users table.
 *
 * Idempotent: skips avatars already present in MinIO.
 *
 * Usage:
 *   cd tools/migrate-avatars
 *   npx tsx import.ts
 *
 * Env vars (defaults match docker-compose.yml):
 *   MINIO_ENDPOINT    — http://localhost:9090
 *   MINIO_ACCESS_KEY  — minioadmin
 *   MINIO_SECRET_KEY  — minioadmin
 *   MINIO_BUCKET      — assets
 *   DATABASE_URL      — postgresql://tomaj@localhost:5432/sbx
 *   GOLDEN_DIR        — <repo-root>/golden
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../');

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? 'http://localhost:9090';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? 'assets';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://tomaj@localhost:5432/sbx';
const GOLDEN_DIR = process.env.GOLDEN_DIR ?? path.join(REPO_ROOT, 'golden');
const STORYBLOK_CDN = 'https://a.storyblok.com';

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY },
  forcePathStyle: true,
});

async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToMinio(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

type Collaborator = { user: { userid: string; avatar: string | null } };

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  // Collect unique avatars from all golden collaborator files
  const avatarMap = new Map<string, string>(); // avatarPath → email

  const spaceIds = await fs.readdir(GOLDEN_DIR);
  for (const spaceId of spaceIds) {
    const collabFile = path.join(GOLDEN_DIR, spaceId, 'collaborators.json');
    try {
      const raw = await fs.readFile(collabFile, 'utf-8');
      const data = JSON.parse(raw);
      for (const c of data.collaborators as Collaborator[]) {
        if (c.user.avatar) {
          avatarMap.set(c.user.avatar, c.user.userid);
        }
      }
    } catch {
      // file may not exist for this space
    }
  }

  console.log(`Found ${avatarMap.size} unique avatars to process`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let dbUpdated = 0;

  for (const [avatarPath, email] of avatarMap) {
    const key = avatarPath; // e.g. avatars/238335/f8af76325b/its_me.jpg
    const ext = path.extname(avatarPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = contentTypeMap[ext] ?? 'image/jpeg';

    // Upload to MinIO if not already present
    if (await objectExists(key)) {
      console.log(`  skip (exists) ${key}`);
      skipped++;
    } else {
      const url = `${STORYBLOK_CDN}/${avatarPath}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`  FAIL ${url} → HTTP ${res.status}`);
          failed++;
          continue;
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        await uploadToMinio(key, buffer, contentType);
        console.log(`  ok   ${key} (${buffer.length} bytes)`);
        downloaded++;
      } catch (err) {
        console.warn(`  FAIL ${url} → ${err}`);
        failed++;
        continue;
      }
    }

    // Update users table
    const result = await pool.query(
      'UPDATE users SET avatar = $1, updated_at = NOW() WHERE email = $2',
      [key, email],
    );
    if (result.rowCount && result.rowCount > 0) {
      dbUpdated++;
    } else {
      console.warn(`  no user found for email ${email}`);
    }
  }

  await pool.end();

  console.log(
    `\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed, ${dbUpdated} DB rows updated`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
