export interface CropOp {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BlurOp {
  radius: number;
  sigma?: number;
}

export interface RoundCornerOp {
  radius: number;
  ellipsis?: number;
  r: number;
  g: number;
  b: number;
  transparent: boolean;
}

export interface ImageOps {
  // Manual crop (applied before resize)
  crop?: CropOp;

  // Resize dimensions (0 = auto/maintain aspect ratio)
  width: number;
  height: number;

  // Flip (triggered by negative width/height in URL)
  flipH: boolean;
  flipV: boolean;

  // Smart crop (face-detection based focal point)
  smart: boolean;

  // Fit-in mode (contain within box, no crop)
  fitIn: boolean;

  // No upscale
  noUpscale: boolean;

  // Focal point crop (pixel coords in original image)
  focal?: CropOp;

  // Filters
  quality?: number;
  blur?: BlurOp;
  brightness?: number;
  grayscale: boolean;
  rotate?: 0 | 90 | 180 | 270;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';

  // Fit-in background fill (hex color or 'transparent')
  fill?: string;

  // Rounded corners
  roundCorner?: RoundCornerOp;
}

/**
 * Splits the request URL path on '/m/' and returns [assetPath, opsString].
 * Returns null if no '/m/' separator is found (serve original).
 *
 * Example input:  '/f/123456/hero.jpg/m/500x300/filters:quality(80)'
 * Returns: ['/f/123456/hero.jpg', '500x300/filters:quality(80)']
 */
export function splitOnMarker(urlPath: string): [string, string] | null {
  const idx = urlPath.indexOf('/m/');
  if (idx === -1) return null;
  return [urlPath.slice(0, idx), urlPath.slice(idx + 3)];
}

/**
 * Parses the operations string that comes after '/m/' in the URL.
 *
 * Supported patterns (in order):
 *   X1xY1:X2xY2                        — manual crop
 *   fit-in/WIDTHxHEIGHT                — fit-in resize
 *   [-]WIDTHx[-]HEIGHT                 — resize (negative = flip axis)
 *   /smart                             — smart crop
 *   /filters:F1(V1):F2(V2)            — filters
 */
export function parseOperations(opsString: string): ImageOps {
  const ops: ImageOps = {
    width: 0,
    height: 0,
    flipH: false,
    flipV: false,
    smart: false,
    fitIn: false,
    noUpscale: false,
    grayscale: false,
  };

  let rem = opsString;

  // 1. Manual crop: X1xY1:X2xY2 (digits only, no negatives)
  const cropMatch = rem.match(/^(\d+)x(\d+):(\d+)x(\d+)/);
  if (cropMatch) {
    ops.crop = {
      x1: parseInt(cropMatch[1]),
      y1: parseInt(cropMatch[2]),
      x2: parseInt(cropMatch[3]),
      y2: parseInt(cropMatch[4]),
    };
    rem = rem.slice(cropMatch[0].length).replace(/^\//, '');
  }

  // 2. fit-in
  if (rem.startsWith('fit-in/')) {
    ops.fitIn = true;
    rem = rem.slice('fit-in/'.length);
  }

  // 3. Resize: [-]WIDTHx[-]HEIGHT
  const resizeMatch = rem.match(/^(-?\d+)x(-?\d+)/);
  if (resizeMatch) {
    const w = parseInt(resizeMatch[1]);
    const h = parseInt(resizeMatch[2]);
    ops.flipH = w < 0;
    ops.width = Math.abs(w);
    ops.flipV = h < 0;
    ops.height = Math.abs(h);
    rem = rem.slice(resizeMatch[0].length).replace(/^\//, '');
  }

  // 4. smart
  if (rem.startsWith('smart')) {
    ops.smart = true;
    rem = rem.slice('smart'.length).replace(/^\//, '');
  }

  // 5. filters:F1(V1):F2(V2)
  if (rem.startsWith('filters:')) {
    parseFilters(rem.slice('filters:'.length), ops);
  }

  return ops;
}

function parseFilters(filtersStr: string, ops: ImageOps): void {
  for (const token of splitFilterTokens(filtersStr)) {
    // Match: name(value) or name()
    const m = token.match(/^(\w+)\(([^)]*)\)$/);
    if (!m) continue;
    applyFilter(m[1], m[2], ops);
  }
}

/**
 * Splits 'quality(80):blur(5,10):focal(10x10:50x50)' by top-level ':'.
 * Colons inside parentheses (e.g. focal point coords) are preserved.
 */
function splitFilterTokens(filtersStr: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of filtersStr) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;

    if (ch === ':' && depth === 0) {
      if (current) result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) result.push(current);
  return result;
}

function applyFilter(name: string, value: string, ops: ImageOps): void {
  switch (name) {
    case 'quality':
      ops.quality = clamp(parseInt(value), 0, 100);
      break;

    case 'blur': {
      const parts = value.split(',');
      const radius = clamp(parseInt(parts[0]), 0, 150);
      ops.blur = { radius };
      if (parts[1] !== undefined) {
        ops.blur.sigma = clamp(parseInt(parts[1]), 0, 150);
      }
      break;
    }

    case 'brightness':
      ops.brightness = clamp(parseInt(value), -100, 100);
      break;

    case 'grayscale':
      ops.grayscale = true;
      break;

    case 'rotate': {
      const deg = parseInt(value);
      if ([0, 90, 180, 270].includes(deg)) {
        ops.rotate = deg as 0 | 90 | 180 | 270;
      }
      break;
    }

    case 'format':
      if (['webp', 'jpeg', 'png', 'avif'].includes(value)) {
        ops.format = value as 'webp' | 'jpeg' | 'png' | 'avif';
      }
      break;

    case 'no_upscale':
      ops.noUpscale = true;
      break;

    case 'focal': {
      const m = value.match(/^(\d+)x(\d+):(\d+)x(\d+)$/);
      if (m) {
        ops.focal = {
          x1: parseInt(m[1]),
          y1: parseInt(m[2]),
          x2: parseInt(m[3]),
          y2: parseInt(m[4]),
        };
      }
      break;
    }

    case 'fill':
      ops.fill = value; // hex string or 'transparent'
      break;

    case 'round_corner': {
      // Storyblok syntax: round_corner(A[|B],R,G,B,T)
      // The first param uses '|' to separate radius (A) and ellipsis (B).
      // Examples: round_corner(50,255,255,255,0)
      //           round_corner(50|25,255,255,255,0)
      const parts = value.split(',');
      const [radiusStr, ...rest] = parts;
      const [radiusA, radiusB] = radiusStr.split('|');
      const radius = parseInt(radiusA);
      const ellipsis = radiusB !== undefined ? parseInt(radiusB) : undefined;

      if (parts.length >= 5) {
        ops.roundCorner = {
          radius,
          ...(ellipsis !== undefined && { ellipsis }),
          r: clamp(parseInt(rest[0]), 0, 255),
          g: clamp(parseInt(rest[1]), 0, 255),
          b: clamp(parseInt(rest[2]), 0, 255),
          transparent: rest[3] === '1',
        };
      } else if (parts.length === 1) {
        // round_corner(RADIUS) — white opaque background
        ops.roundCorner = { radius, r: 255, g: 255, b: 255, transparent: false };
      }
      break;
    }
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
