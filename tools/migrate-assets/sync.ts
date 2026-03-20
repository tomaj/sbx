/**
 * sync.ts — Incremental update: fetch only changed/new/deleted assets.
 *
 * Strategy:
 *   1. Re-fetch all asset metadata from MAPI (cheap — no binaries).
 *   2. Compare updated_at against local .meta.json.
 *   3. Re-download only changed binaries.
 *   4. Delete local files for assets that no longer exist on Storyblok.
 *   5. Update _manifest.json.
 *
 * Usage:
 *   STORYBLOK_MAPI_TOKEN=<token> pnpm --filter migrate-assets sync
 */

import path from 'path'
import fs from 'fs/promises'
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
  readManifest,
  writeManifest,
  readMeta,
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
  process.exit(1)
}

async function fetchAllAssets(spaceId: number): Promise<StoryblokAsset[]> {
  const first = await fetchAssetsPage(spaceId, 1, MAPI_TOKEN!, PER_PAGE)
  const total = parseInt(String(first.total), 10)
  const totalPages = Math.ceil(total / PER_PAGE)
  const all: StoryblokAsset[] = [...first.assets]

  for (let page = 2; page <= totalPages; page++) {
    process.stdout.write(`  Fetching metadata page ${page}/${totalPages}…\r`)
    const { assets } = await fetchAssetsPage(spaceId, page, MAPI_TOKEN!, PER_PAGE)
    all.push(...assets)
  }
  process.stdout.write('\n')
  return all
}

async function syncSpace(spaceId: number): Promise<void> {
  console.log(`\n=== Space ${spaceId} ===`)

  const manifest = await readManifest(OUT_DIR, spaceId)
  if (!manifest) {
    console.error(`  No manifest found for space ${spaceId}. Run export.ts first.`)
    return
  }

  console.log(`  Last synced: ${manifest.last_synced_at}`)
  console.log(`  Fetching current asset list from Storyblok…`)

  const remoteAssets = await fetchAllAssets(spaceId)
  console.log(`  Remote: ${remoteAssets.length} assets`)

  // Update asset folders
  const { asset_folders } = await fetchAssetFolders(spaceId, MAPI_TOKEN!)
  await writeJson(foldersPath(OUT_DIR, spaceId), asset_folders)

  // Detect deletions: IDs that were in the manifest but are gone now
  const remoteIds = new Set(remoteAssets.map(a => a.id))
  const deletedIds = manifest.asset_ids.filter(id => !remoteIds.has(id))

  if (deletedIds.length > 0) {
    console.log(`  Detected ${deletedIds.length} deleted assets — skipping removal (manual review recommended).`)
    console.log(`  Deleted IDs: ${deletedIds.slice(0, 10).join(', ')}${deletedIds.length > 10 ? '…' : ''}`)
  }

  // For each remote asset, check if update is needed
  let updated = 0
  let unchanged = 0
  let newAsset = 0
  let failed = 0

  const updatePromises = remoteAssets.map(async asset => {
    const mPath = metaPath(OUT_DIR, spaceId, asset)
    const binPath = binaryPath(OUT_DIR, spaceId, asset)

    try {
      const localMeta = await fileExists(mPath) ? await readMeta(mPath) : null

      const needsUpdate =
        !localMeta ||
        new Date(asset.updated_at) > new Date(localMeta.updated_at)

      if (!needsUpdate) {
        unchanged++
        return
      }

      const isNew = !localMeta
      if (isNew) newAsset++
      else updated++

      // External URLs: just update meta
      if (asset.is_external_url || !asset.filename.includes('a.storyblok.com')) {
        await writeJson(mPath, asset)
        return
      }

      const buffer = await downloadBinary(asset.filename)
      await writeBinary(binPath, buffer)
      await writeJson(mPath, asset)
    } catch (err) {
      failed++
      console.error(`\n  ERROR asset ${asset.id}: ${err}`)
    }

    const done = updated + newAsset + unchanged + failed
    process.stdout.write(
      `  Syncing [${done}/${remoteAssets.length}] ↺${updated} +${newAsset} =${unchanged} ✗${failed}\r`,
    )
  })

  await Promise.all(updatePromises)

  console.log(`\n  Done. ↺${updated} updated, +${newAsset} new, =${unchanged} unchanged, ✗${failed} failed.`)

  const newManifest: Manifest = {
    space_id: spaceId,
    last_synced_at: new Date().toISOString(),
    total_count: remoteAssets.length,
    downloaded_count: remoteAssets.length - failed,
    asset_ids: remoteAssets.map(a => a.id),
  }
  await writeManifest(OUT_DIR, newManifest)
  console.log(`  Manifest updated.`)
}

async function main() {
  console.log(`Output directory: ${OUT_DIR}`)
  for (const spaceId of SPACE_IDS) {
    await syncSpace(spaceId)
  }
  console.log('\nAll done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
