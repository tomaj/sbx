import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'video/',
  'audio/',
  'font/',
  'application/pdf',
  'application/json',
  'application/xml',
  'application/zip',
  'application/gzip',
  'application/vnd.openxmlformats',
  'application/vnd.ms-',
  'application/msword',
  'text/',
  'model/',
];

const BLOCKED_MIME_TYPES = new Set(['text/html', 'text/xml', 'image/svg+xml']);
const BLOCKED_MAGIC_MIMES = new Set(['text/html', 'application/xml', 'image/svg+xml']);

export async function validateFileMagicBytes(files: Express.Multer.File[]): Promise<void> {
  const { fileTypeFromBuffer } = await import('file-type');
  for (const file of files) {
    if (!file.buffer || file.buffer.length === 0) continue;
    const detected = await fileTypeFromBuffer(file.buffer);
    if (detected && BLOCKED_MAGIC_MIMES.has(detected.mime)) {
      throw new BadRequestException(
        `File content detected as ${detected.mime}, which is not allowed`,
      );
    }
  }
}

export const assetMulterOptions: MulterOptions = {
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    if (BLOCKED_MIME_TYPES.has(mime)) {
      cb(new BadRequestException(`File type ${file.mimetype} not allowed`), false);
    } else if (ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
      cb(null, true);
    } else {
      cb(new BadRequestException(`File type ${file.mimetype} not allowed`), false);
    }
  },
};
