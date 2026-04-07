import fs from 'fs/promises';
import path from 'path';
import type { StoryblokAsset, Manifest } from './types.js';

/**
 * Extracts the relative file path from a Storyblok CDN URL.
 *
 * "https://a.storyblok.com/f/285923/folder/img.jpg" → "folder/img.jpg"
 */
export function relativePathFromUrl(asset: StoryblokAsset): string {
  // filename = https://a.storyblok.com/f/{spaceId}/{relativePath}
  const match = asset.filename.match(/\/f\/\d+\/(.+)$/);
  if (!match) throw new Error(`Unexpected asset filename format: ${asset.filename}`);
  return match[1];
}

export function binaryPath(outDir: string, spaceId: number, asset: StoryblokAsset): string {
  return path.join(outDir, String(spaceId), relativePathFromUrl(asset));
}

export function metaPath(outDir: string, spaceId: number, asset: StoryblokAsset): string {
  return `${binaryPath(outDir, spaceId, asset)}.meta.json`;
}

export function manifestPath(outDir: string, spaceId: number): string {
  return path.join(outDir, String(spaceId), '_manifest.json');
}

export function foldersPath(outDir: string, spaceId: number): string {
  return path.join(outDir, String(spaceId), '_folders.json');
}

export async function readManifest(outDir: string, spaceId: number): Promise<Manifest | null> {
  try {
    const raw = await fs.readFile(manifestPath(outDir, spaceId), 'utf8');
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

export async function writeManifest(outDir: string, manifest: Manifest): Promise<void> {
  await fs.writeFile(manifestPath(outDir, manifest.space_id), JSON.stringify(manifest, null, 2));
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function writeBinary(filePath: string, data: Buffer): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readMeta(filePath: string): Promise<StoryblokAsset> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as StoryblokAsset;
}

/** Walk a directory tree and collect all .meta.json file paths. */
export async function collectMetaFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.meta.json')) {
        results.push(full);
      }
    }
  }
  await walk(dir);
  return results;
}
