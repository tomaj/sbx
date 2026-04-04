import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { env } from '@/env';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CDN_URL = env.NEXT_PUBLIC_CDN_URL;

/** Convert a raw avatar path (e.g. "avatars/123/abc/photo.jpg") to a CDN URL. */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${CDN_URL}/${clean}`;
}

/**
 * Normalize a Storyblok/S3 asset filename to use the local CDN.
 * Migrated assets may still have filenames pointing to s3.amazonaws.com or a.storyblok.com.
 * All asset filenames must always use our own CDN — never external URLs.
 */
export function normalizeAssetFilename(filename: string | undefined | null): string {
  if (!filename) return '';
  const match = filename.match(/\/f\/(\d+)\/(.+)$/);
  if (!match) return filename;
  return `${CDN_URL}/f/${match[1]}/${match[2]}`;
}
