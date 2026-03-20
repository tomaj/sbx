import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { CacheService } from '../cache/cache.service';
import { splitOnMarker, parseOperations } from './url-parser';
import { processImage, ProcessResult } from './sharp-processor';

// Extensions handled by the Sharp image processor
const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'tiff', 'tif', 'bmp', 'heic', 'heif',
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
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly cache: CacheService,
  ) {}

  async handle(req: AssetRequest): Promise<ProcessResult> {
    const { urlPath, accept, viewerCountry } = req;
    const ext = getExtension(urlPath);

    // AVIF is not supported in China — downgrade to WebP
    const effectiveAccept = viewerCountry === 'CN'
      ? accept.replace('image/avif,', '').replace(',image/avif', '').replace('image/avif', '')
      : accept;

    if (IMAGE_EXTENSIONS.has(ext)) {
      return this.handleImage(urlPath, effectiveAccept);
    }

    return this.handleRawAsset(urlPath, ext);
  }

  // ── Image path ────────────────────────────────────────────────────────────

  private async handleImage(urlPath: string, accept: string): Promise<ProcessResult> {
    const parts = splitOnMarker(urlPath);

    if (!parts) {
      return this.fetchRaw(urlPath, getExtension(urlPath), false);
    }

    const [assetPath, opsString] = parts;
    const cacheKey = buildCacheKey(urlPath, accept);

    const cached = await this.cache.getWithMime(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return { ...cached, fromCache: true };
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);

    const objectKey = toObjectKey(assetPath);
    const original = await this.storage.getObject(objectKey);
    const ops = parseOperations(opsString);
    const result = await processImage(original, ops, accept);

    await this.cache.set(cacheKey, result.buffer, result.contentType);
    return { ...result, fromCache: false };
  }

  // ── Non-image path ────────────────────────────────────────────────────────

  private async handleRawAsset(urlPath: string, ext: string): Promise<ProcessResult> {
    const assetPath = stripTransformSuffix(urlPath);
    const cacheKey = `asset:${assetPath}`;

    const cached = await this.cache.getWithMime(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return { ...cached, fromCache: true };
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);

    const result = await this.fetchRaw(assetPath, ext, false);
    await this.cache.set(cacheKey, result.buffer, result.contentType);
    return result;
  }

  private async fetchRaw(urlPath: string, ext: string, fromCache: boolean): Promise<ProcessResult> {
    const objectKey = toObjectKey(stripTransformSuffix(urlPath));
    const buffer = await this.storage.getObject(objectKey);
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    return { buffer, contentType, fromCache };
  }
}

function getExtension(urlPath: string): string {
  const assetPart = urlPath.split('/m/')[0];
  return assetPart.split('.').pop()?.toLowerCase() ?? '';
}

function toObjectKey(urlPath: string): string {
  return urlPath.replace(/^\/f\//, '');
}

function stripTransformSuffix(urlPath: string): string {
  const idx = urlPath.indexOf('/m/');
  return idx === -1 ? urlPath : urlPath.slice(0, idx);
}

function buildCacheKey(urlPath: string, accept: string): string {
  const variant = accept?.includes('image/webp') ? 'webp' : 'native';
  return `img:${urlPath}:${variant}`;
}
