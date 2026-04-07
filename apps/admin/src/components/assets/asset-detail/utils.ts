import { env } from '@/env';

const CDN_URL = env.NEXT_PUBLIC_CDN_URL;

export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

export function formatExt(contentType: string): string {
  const parts = contentType.split('/');
  return `.${parts[1] ?? parts[0] ?? ''}`;
}

export function assetPublicUrl(filename: string): string {
  const match = filename.match(/\/f\/\d+\/(.+)$/);
  if (!match) return filename;
  const spaceMatch = filename.match(/\/f\/(\d+)\//);
  return `${CDN_URL}/f/${spaceMatch?.[1]}/${match[1]}`;
}

export interface CustomMetadataField {
  key: string;
  required: boolean;
  filetypes: string[];
  translatable: boolean;
}

export function contentTypeToFiletype(contentType: string): string {
  if (contentType.startsWith('image/')) return 'images';
  if (contentType.startsWith('video/')) return 'videos';
  if (contentType.startsWith('audio/')) return 'audios';
  return 'texts';
}
