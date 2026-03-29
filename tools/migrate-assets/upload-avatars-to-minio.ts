/**
 * upload-avatars-to-minio.ts
 *
 * Uploads locally cached avatars (from apps/admin/public/avatars/) into MinIO.
 * Run this once after MinIO is healthy.
 *
 * Usage:
 *   cd tools/migrate-assets
 *   MINIO_ENDPOINT=http://localhost:9090 npx tsx upload-avatars-to-minio.ts
 */

import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand, HeadObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../')
const AVATARS_DIR = path.join(REPO_ROOT, 'apps/admin/public/avatars')

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? 'http://localhost:9090'
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? 'minioadmin'
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? 'minioadmin'
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? 'assets'

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY },
  forcePathStyle: true,
})

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
}

async function ensureBucket() {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }))
    console.log(`Bucket '${MINIO_BUCKET}' created`)
  } catch (e: any) {
    if (e.Code === 'BucketAlreadyOwnedByYou' || e.name === 'BucketAlreadyOwnedByYou') return
    throw e
  }
}

async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: MINIO_BUCKET, Key: key }))
    return true
  } catch { return false }
}

async function walkDir(dir: string, base: string): Promise<{ abs: string; key: string }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: { abs: string; key: string }[] = []
  for (const e of entries) {
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) {
      files.push(...await walkDir(abs, base))
    } else {
      const rel = path.relative(base, abs).replace(/\\/g, '/')
      files.push({ abs, key: `avatars/${rel}` })
    }
  }
  return files
}

async function main() {
  await ensureBucket()
  const files = await walkDir(AVATARS_DIR, AVATARS_DIR)
  console.log(`Found ${files.length} avatar files`)

  let uploaded = 0, skipped = 0, failed = 0
  for (const { abs, key } of files) {
    if (await objectExists(key)) { console.log(`  skip ${key}`); skipped++; continue }
    const ext = key.split('.').pop()?.toLowerCase() ?? ''
    const contentType = MIME[ext] ?? 'image/jpeg'
    try {
      const buffer = await fs.readFile(abs)
      await s3.send(new PutObjectCommand({ Bucket: MINIO_BUCKET, Key: key, Body: buffer, ContentType: contentType }))
      console.log(`  ok   ${key}`)
      uploaded++
    } catch (e) {
      console.warn(`  FAIL ${key}: ${e}`)
      failed++
    }
  }
  console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`)
}

main().catch((e) => { console.error(e); process.exit(1) })
