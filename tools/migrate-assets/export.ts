/**
 * export.ts — Download all assets from Storyblok MAPI to disk.
 *
 * Usage:
 *   STORYBLOK_MAPI_TOKEN=<token> pnpm --filter migrate-assets export
 *   # or for a specific space:
 *   STORYBLOK_MAPI_TOKEN=<token> SPACE_IDS=285923 pnpm --filter migrate-assets export
 *
 * Output directory (default: <repo-root>/assets/):
 *   ASSETS_DIR=/path/to/dir pnpm --filter migrate-assets export
 *
 * Already-downloaded assets are skipped (resume-safe). The script writes
 * _manifest.json and _folders.json per space.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { fetchAssetsPage, fetchAssetFolders } from './lib/mapi.js'
import { downloadBinary } from './lib/downloader.js'
import {
  binaryPath,
  metaPath,
  foldersPath,
  fileExists,
  writeBinary,
  writeJson,
  writeManifest,
} from './lib/disk.js'
import type { StoryblokAsset, Manifest } from './lib/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')

const MAPI_TOKEN = process.env.STORYBLOK_MAPI_TOKEN
const SPACE_IDS = (process.env.SPACE_IDS ?? '285923,285922,293665,327730')
  .split(',')
  .map(s => parseInt(s.trim(), 10))
const OUT_DIR = process.env.ASSETS_DIR ?? path.join(REPO_ROOT, 'assets')
const PER_PAGE = 100

if (!MAPI_TOKEN) {
  console.error('ERROR: STORYBLOK_MAPI_TOKEN is not set.')
  console.error('  Export: STORYBLOK_MAPI_TOKEN=<token> pnpm --filter migrate-assets export')
  process.exit(1)
}

async function downloadAsset(
  asset: StoryblokAsset,
  spaceId: number,
): Promise<'skipped' | 'downloaded' | 'external'> {
  // Skip external URLs — they are not stored on Storyblok CDN
  if (asset.is_external_url || !asset.filename.includes('a.storyblok.com')) {
    await writeJson(metaPath(OUT_DIR, spaceId, asset), asset)
    return 'external'
  }

  const binPath = binaryPath(OUT_DIR, spaceId, asset)
  const mPath = metaPath(OUT_DIR, spaceId, asset)

  // Resume: skip if already fully downloaded
  if (await fileExists(mPath)) {
    return 'skipped'
  }

  const buffer = await downloadBinary(asset.filename)
  await writeBinary(binPath, buffer)
  await writeJson(mPath, asset)
  return 'downloaded'
}

async function exportSpace(spaceId: number): Promise<void> {
  console.log(`\n=== Space ${spaceId} ===`)

  // Download asset folders first
  console.log('  Fetching asset folders…')
  const { asset_folders } = await fetchAssetFolders(spaceId, MAPI_TOKEN!)
  await writeJson(foldersPath(OUT_DIR, spaceId), asset_folders)
  console.log(`  Saved ${asset_folders.length} folders.`)

  // Probe first page to get total count
  console.log('  Fetching page 1 to get total count…')
  const first = await fetchAssetsPage(spaceId, 1, MAPI_TOKEN!, PER_PAGE)
  const total = parseInt(String(first.total), 10)
  const totalPages = Math.ceil(total / PER_PAGE)
  console.log(`  Total assets: ${total} (${totalPages} pages)`)

  const allAssets: StoryblokAsset[] = [...first.assets]

  // Fetch remaining pages sequentially (rate limiter is inside mapi.ts)
  for (let page = 2; page <= totalPages; page++) {
    process.stdout.write(`  Fetching metadata page ${page}/${totalPages}…\r`)
    const { assets } = await fetchAssetsPage(spaceId, page, MAPI_TOKEN!, PER_PAGE)
    allAssets.push(...assets)
  }
  console.log(`  Metadata fetched: ${allAssets.length} assets.          `)

  // Download binaries — run up to MAX_CONCURRENT in parallel (controlled in downloader.ts)
  let downloaded = 0
  let skipped = 0
  let external = 0
  let failed = 0

  const downloadPromises = allAssets.map(async (asset, i) => {
    try {
      const result = await downloadAsset(asset, spaceId)
      if (result === 'downloaded') downloaded++
      else if (result === 'skipped') skipped++
      else external++
    } catch (err) {
      failed++
      console.error(`\n  ERROR asset ${asset.id} (${asset.filename}): ${err}`)
    }

    const done = downloaded + skipped + external + failed
    process.stdout.write(
      `  Downloading [${done}/${allAssets.length}] ↓${downloaded} ⏭${skipped} ext${external} ✗${failed}\r`,
    )
  })

  await Promise.all(downloadPromises)

  console.log(`\n  Done. ↓${downloaded} new, ⏭${skipped} skipped, ext${external} external, ✗${failed} failed.`)

  const manifest: Manifest = {
    space_id: spaceId,
    last_synced_at: new Date().toISOString(),
    total_count: total,
    downloaded_count: downloaded + skipped + external,
    asset_ids: allAssets.map(a => a.id),
  }
  await writeManifest(OUT_DIR, manifest)
  console.log(`  Manifest written.`)
}

async function main() {
  console.log(`Output directory: ${OUT_DIR}`)
  console.log(`Spaces: ${SPACE_IDS.join(', ')}`)

  for (const spaceId of SPACE_IDS) {
    await exportSpace(spaceId)
  }

  console.log('\nAll done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
