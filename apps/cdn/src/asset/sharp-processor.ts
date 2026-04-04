import sharp from 'sharp';
import { ImageOps, CropOp } from './url-parser';

export interface ProcessResult {
  buffer: Buffer;
  contentType: string;
}

const MAX_DIMENSION = 4000;

/**
 * Applies all image transformations described by ImageOps using Sharp.
 *
 * Processing order:
 *   1. Manual crop (extract)
 *   2. Focal-point crop (if focal + resize requested)
 *   3. Resize / fit-in
 *   4. Flip
 *   5. Rotate
 *   6. Grayscale
 *   7. Blur
 *   8. Brightness
 *   9. Rounded corners
 *  10. Format + quality
 */
export async function processImage(
  input: Buffer,
  ops: ImageOps,
  acceptHeader: string,
): Promise<ProcessResult> {
  let img = sharp(input, { animated: false });
  const meta = await img.metadata();
  const isGif = meta.format === 'gif';

  // --- 1. Manual crop ---
  if (ops.crop) {
    const { x1, y1, x2, y2 } = ops.crop;
    img = img.extract({
      left: x1,
      top: y1,
      width: x2 - x1,
      height: y2 - y1,
    });
    // Re-read metadata after extract for accurate dimensions
  }

  // --- 2. Focal-point crop ---
  if (!isGif && ops.focal && (ops.width || ops.height) && !ops.fitIn) {
    const srcW = meta.width ?? 0;
    const srcH = meta.height ?? 0;
    const targetW = ops.width || srcW;
    const targetH = ops.height || srcH;
    const extract = computeFocalExtract(srcW, srcH, targetW, targetH, ops.focal);
    img = img.extract(extract);
    // After focal extract the image already has the correct aspect ratio —
    // resize below will scale it to exact pixel dimensions.
  }

  // --- 3. Resize / fit-in ---
  const targetW = ops.width > 0 ? Math.min(ops.width, MAX_DIMENSION) : undefined;
  const targetH = ops.height > 0 ? Math.min(ops.height, MAX_DIMENSION) : undefined;

  if (targetW || targetH) {
    if (ops.fitIn) {
      const background = resolveFillBackground(ops.fill);
      img = img.resize(targetW, targetH, {
        fit: 'contain',
        withoutEnlargement: ops.noUpscale,
        background,
      });
    } else {
      img = img.resize(targetW, targetH, {
        fit: ops.focal ? 'fill' : 'cover',
        withoutEnlargement: ops.noUpscale,
      });
    }
  } else if (ops.noUpscale) {
    img = img.resize(undefined, undefined, { withoutEnlargement: true });
  }

  // GIFs only support resize — skip all filters below
  if (isGif) {
    return encodeOutput(img, ops, acceptHeader, 'gif');
  }

  // --- 4. Flip ---
  if (ops.flipH) img = img.flop();
  if (ops.flipV) img = img.flip();

  // --- 5. Rotate ---
  if (ops.rotate) img = img.rotate(ops.rotate);

  // --- 6. Grayscale ---
  if (ops.grayscale) img = img.grayscale();

  // --- 7. Blur ---
  if (ops.blur) {
    // Sharp blur sigma must be >= 0.3 and <= 1000
    const sigma = ops.blur.sigma ?? ops.blur.radius;
    const sharpSigma = Math.max(0.3, Math.min(sigma, 1000));
    img = img.blur(sharpSigma);
  }

  // --- 8. Brightness (linear offset: -100..+100 → -128..+128 channel offset) ---
  if (ops.brightness !== undefined && ops.brightness !== 0) {
    const offset = Math.round((ops.brightness / 100) * 128);
    img = img.linear(1, offset);
  }

  // --- 9. Rounded corners ---
  // Flush the pipeline first to get actual output dimensions (after resize/rotate).
  // We flush to PNG to ensure the intermediate buffer supports alpha compositing.
  // Sharp's metadata() only reads input dimensions, not post-transform dimensions.
  let forcedFormat: ImageOps['format'] | undefined;
  if (ops.roundCorner) {
    const { data, info } = await img.png().toBuffer({ resolveWithObject: true });
    img = await applyRoundCorners(sharp(data), ops.roundCorner, ops.fill, info.width, info.height);
    // Transparent corners require PNG; opaque corners can use the requested format.
    if (ops.roundCorner.transparent && !ops.format) {
      forcedFormat = 'png';
    }
  }

  return encodeOutput(
    img,
    { ...ops, format: forcedFormat ?? ops.format },
    acceptHeader,
    meta.format ?? 'jpeg',
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the extract region centered on the focal point that matches
 * the target aspect ratio, clamped to image bounds.
 */
function computeFocalExtract(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  focal: CropOp,
): { left: number; top: number; width: number; height: number } {
  const cx = (focal.x1 + focal.x2) / 2;
  const cy = (focal.y1 + focal.y2) / 2;

  const targetAspect = targetW / targetH;
  const srcAspect = srcW / srcH;

  let cropW: number;
  let cropH: number;

  if (targetAspect > srcAspect) {
    cropW = srcW;
    cropH = Math.round(srcW / targetAspect);
  } else {
    cropH = srcH;
    cropW = Math.round(srcH * targetAspect);
  }

  let left = Math.round(cx - cropW / 2);
  let top = Math.round(cy - cropH / 2);

  left = Math.max(0, Math.min(left, srcW - cropW));
  top = Math.max(0, Math.min(top, srcH - cropH));

  return { left, top, width: cropW, height: cropH };
}

function resolveFillBackground(fill: string | undefined): sharp.Color {
  if (!fill || fill === 'transparent') {
    return { r: 0, g: 0, b: 0, alpha: 0 };
  }
  // fill is a hex color without '#' (e.g. 'CCCCCC' or 'FF0000')
  const hex = fill.startsWith('#') ? fill : `#${fill}`;
  return hex;
}

async function applyRoundCorners(
  img: sharp.Sharp,
  rc: NonNullable<ImageOps['roundCorner']>,
  _fill: string | undefined,
  w: number,
  h: number,
): Promise<sharp.Sharp> {
  const rx = rc.radius;
  const ry = rc.ellipsis ?? rc.radius;

  const svgMask = `<svg width="${w}" height="${h}">
    <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" ry="${ry}" fill="white"/>
  </svg>`;

  if (rc.transparent) {
    // Keep transparent background — output must be PNG
    return img.composite([{ input: Buffer.from(svgMask), blend: 'dest-in' }]).png();
  }

  // Solid background fill
  const bg = `rgba(${rc.r},${rc.g},${rc.b},1)`;
  const background = `<svg width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${bg}"/>
  </svg>`;

  return img.composite([
    { input: Buffer.from(background), blend: 'dest-over' },
    { input: Buffer.from(svgMask), blend: 'dest-in' },
  ]);
}

async function encodeOutput(
  img: sharp.Sharp,
  ops: ImageOps,
  acceptHeader: string,
  srcFormat: string,
): Promise<ProcessResult> {
  let format = ops.format;

  // Auto-WebP when browser supports it and no explicit format requested
  if (!format) {
    if (srcFormat === 'gif') {
      format = 'gif' as any;
    } else if (acceptHeader?.includes('image/avif')) {
      // Prefer AVIF if accepted and no explicit format
      // (commented out by default — can be enabled per-deployment)
      format = 'webp';
    } else if (acceptHeader?.includes('image/webp')) {
      format = 'webp';
    } else {
      format = srcFormat === 'png' ? 'png' : 'jpeg';
    }
  }

  // Sharp requires quality 1-100; Storyblok allows 0 (treat as minimum = 1)
  const quality = Math.max(1, ops.quality ?? 80);

  switch (format) {
    case 'webp':
      img = img.webp({ quality });
      return { buffer: await img.toBuffer(), contentType: 'image/webp' };

    case 'avif':
      img = img.avif({ quality });
      return { buffer: await img.toBuffer(), contentType: 'image/avif' };

    case 'png':
      img = img.png({ quality });
      return { buffer: await img.toBuffer(), contentType: 'image/png' };

    case 'gif' as any:
      return { buffer: await img.toBuffer(), contentType: 'image/gif' };
    default:
      img = img.jpeg({ quality });
      return { buffer: await img.toBuffer(), contentType: 'image/jpeg' };
  }
}
