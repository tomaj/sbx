import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { StorageService } from '../storage/storage.service';
import { splitOnMarker, parseOperations } from './url-parser';
import { processImage, type ProcessResult } from './sharp-processor';

/** Maximum asset size: 100 MB — prevents memory exhaustion from oversized files */
const MAX_ASSET_SIZE = 100 * 1024 * 1024;

// Extensions handled by the Sharp image processor
const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'avif',
  'tiff',
  'tif',
  'bmp',
  'heic',
  'heif',
]);

// MIME type map for all supported asset types
const MIME_TYPES: Record<string, string> = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  heic: 'image/heic',
  heif: 'image/heif',
  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  // Text
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  xml: 'application/xml',
  json: 'application/json',
  // Media
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  // Archives
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  // Fonts
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

export interface AssetRequest {
  urlPath: string;
  accept: string;
  /** CloudFront-Viewer-Country header — used to disable AVIF in CN region */
  viewerCountry?: string;
}

@Injectable()
export class AssetService {
  constructor(
    private readonly storage: StorageService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async handle(req: AssetRequest): Promise<ProcessResult> {
    const { urlPath, accept, viewerCountry } = req;
    const ext = getExtension(urlPath);

    // Block private (locked) assets — API sets this flag in Redis when an asset is locked
    const objectKey = toObjectKey(stripTransformSuffix(urlPath));
    const isPrivate = await this.redis.exists(`cdn:asset:private:${objectKey}`);
    if (isPrivate) {
      throw new ForbiddenException('Asset is private');
    }

    // AVIF is not supported in China — downgrade to WebP
    const effectiveAccept =
      viewerCountry === 'CN'
        ? accept.replace('image/avif,', '').replace(',image/avif', '').replace('image/avif', '')
        : accept;

    if (IMAGE_EXTENSIONS.has(ext)) {
      return this.handleImage(urlPath, effectiveAccept);
    }

    return this.handleRawAsset(urlPath, ext);
  }

  private async handleImage(urlPath: string, accept: string): Promise<ProcessResult> {
    const parts = splitOnMarker(urlPath);

    if (!parts) {
      return this.fetchRaw(urlPath, getExtension(urlPath));
    }

    const [assetPath, opsString] = parts;
    const objectKey = toObjectKey(assetPath);
    const original = await this.fetchBuffer(objectKey, assetPath);
    const ops = parseOperations(opsString);
    return processImage(original, ops, accept);
  }

  private async handleRawAsset(urlPath: string, ext: string): Promise<ProcessResult> {
    return this.fetchRaw(urlPath, ext);
  }

  private async fetchRaw(urlPath: string, ext: string): Promise<ProcessResult> {
    const objectKey = toObjectKey(stripTransformSuffix(urlPath));
    const buffer = await this.fetchBuffer(objectKey, stripTransformSuffix(urlPath));
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    return { buffer, contentType };
  }

  /**
   * Fetches a buffer from MinIO. If the object is not found, falls back to
   * fetching from the Storyblok origin (a.storyblok.com) so that assets
   * that have not yet been migrated to our storage continue to work.
   */
  private async fetchBuffer(objectKey: string, urlPath: string): Promise<Buffer> {
    try {
      return await this.storage.getObject(objectKey);
    } catch (err) {
      // Fall through to origin fallback for any storage error:
      // - NotFoundException: object not in MinIO
      // - Connection errors: MinIO is down (ECONNRESET, ECONNREFUSED, etc.)
      if (
        err instanceof NotFoundException ||
        (err as any)?.code === 'ECONNRESET' ||
        (err as any)?.code === 'ECONNREFUSED' ||
        (err as any)?.name === 'TimeoutError'
      ) {
        // continue to origin fallback below
      } else {
        throw err;
      }
    }

    // Origin fallback: reconstruct Storyblok URL from the /f/<spaceId>/... path
    const originUrl = `https://a.storyblok.com${urlPath.startsWith('/f/') ? urlPath : `/f/${objectKey}`}`;
    const response = await fetch(originUrl);
    if (!response.ok) {
      throw new NotFoundException(`Asset not found in storage or origin: ${objectKey}`);
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_ASSET_SIZE) {
      throw new PayloadTooLargeException(
        `Asset too large: ${contentLength} bytes (max ${MAX_ASSET_SIZE})`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_ASSET_SIZE) {
      throw new PayloadTooLargeException(
        `Asset too large: ${buffer.length} bytes (max ${MAX_ASSET_SIZE})`,
      );
    }
    return buffer;
  }
}

function getExtension(urlPath: string): string {
  const assetPart = urlPath.split('/m/')[0];
  return assetPart.split('.').pop()?.toLowerCase() ?? '';
}

function toObjectKey(urlPath: string): string {
  // Decode percent-encoded characters to catch double-encoding bypass attempts
  let key = urlPath.replace(/^\/f\//, '');
  try {
    key = decodeURIComponent(key);
  } catch {
    // If decoding fails, continue with the raw key
  }
  if (key.includes('..') || key.startsWith('/') || key.includes('\0')) {
    throw new BadRequestException('Invalid asset path');
  }
  return key;
}

function stripTransformSuffix(urlPath: string): string {
  const idx = urlPath.indexOf('/m/');
  return idx === -1 ? urlPath : urlPath.slice(0, idx);
}
