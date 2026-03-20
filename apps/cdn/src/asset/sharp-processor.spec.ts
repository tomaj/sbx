import sharp from 'sharp';
import { processImage } from './sharp-processor';
import { ImageOps } from './url-parser';

const ACCEPT_WEBP = 'image/webp,image/*';
const ACCEPT_PLAIN = 'image/jpeg,image/*';

/** Creates a solid-color JPEG buffer for testing (no disk I/O). */
async function makeTestImage(width = 400, height = 300, format: 'jpeg' | 'png' = 'jpeg'): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })[format]().toBuffer();
}

function baseOps(overrides: Partial<ImageOps> = {}): ImageOps {
  return {
    width: 0, height: 0,
    flipH: false, flipV: false,
    smart: false, fitIn: false,
    noUpscale: false, grayscale: false,
    ...overrides,
  };
}

describe('processImage — resize', () => {
  it('resizes to exact dimensions', async () => {
    const input = await makeTestImage(400, 300);
    const { buffer, contentType } = await processImage(input, baseOps({ width: 200, height: 150 }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(150);
    expect(contentType).toBe('image/jpeg');
  });

  it('resizes by width only (height = 0 keeps aspect ratio)', async () => {
    const input = await makeTestImage(400, 200); // 2:1 ratio
    const { buffer } = await processImage(input, baseOps({ width: 200, height: 0 }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it('resizes by height only (width = 0)', async () => {
    const input = await makeTestImage(400, 200); // 2:1 ratio
    const { buffer } = await processImage(input, baseOps({ width: 0, height: 100 }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it('does not upscale when noUpscale is set', async () => {
    const input = await makeTestImage(100, 100);
    const { buffer } = await processImage(input, baseOps({ width: 500, height: 500, noUpscale: true }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBeLessThanOrEqual(100);
    expect(meta.height).toBeLessThanOrEqual(100);
  });

  it('caps dimensions at 4000px', async () => {
    const input = await makeTestImage(100, 100);
    // sharp-processor clamps to MAX_DIMENSION=4000 before passing to sharp
    const { buffer } = await processImage(input, baseOps({ width: 5000, height: 5000, noUpscale: false }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBeLessThanOrEqual(4000);
  });
});

describe('processImage — flip', () => {
  it('flips horizontally', async () => {
    const input = await makeTestImage(200, 100);
    const { buffer } = await processImage(input, baseOps({ width: 200, height: 100, flipH: true }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    // Dimensions unchanged after flip
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it('flips vertically', async () => {
    const input = await makeTestImage(200, 100);
    const { buffer } = await processImage(input, baseOps({ width: 200, height: 100, flipV: true }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });
});

describe('processImage — fit-in', () => {
  it('fits image within box without cropping', async () => {
    const input = await makeTestImage(400, 200); // 2:1
    const { buffer } = await processImage(
      input,
      baseOps({ width: 300, height: 300, fitIn: true }),
      ACCEPT_PLAIN,
    );
    const meta = await sharp(buffer).metadata();
    // fit: 'contain' fills the full 300x300 canvas (letterboxed), not just the scaled image
    expect(meta.width).toBe(300);
    expect(meta.height).toBe(300);
  });
});

describe('processImage — manual crop', () => {
  it('crops to specified region', async () => {
    const input = await makeTestImage(400, 300);
    const { buffer } = await processImage(
      input,
      baseOps({ crop: { x1: 0, y1: 0, x2: 200, y2: 150 } }),
      ACCEPT_PLAIN,
    );
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(150);
  });
});

describe('processImage — filters', () => {
  it('applies grayscale', async () => {
    const input = await makeTestImage(100, 100);
    const { buffer } = await processImage(input, baseOps({ grayscale: true }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    // Grayscale output has 1 channel (or 3 if stored as sRGB)
    expect(meta.channels).toBeLessThanOrEqual(3);
  });

  it('applies blur without throwing', async () => {
    const input = await makeTestImage(100, 100);
    await expect(
      processImage(input, baseOps({ blur: { radius: 10 } }), ACCEPT_PLAIN),
    ).resolves.not.toThrow();
  });

  it('applies rotate 90', async () => {
    const input = await makeTestImage(200, 100); // landscape
    const { buffer } = await processImage(input, baseOps({ rotate: 90 }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    // After 90° rotation, width and height swap
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(200);
  });

  it('applies rotate 180 (dimensions unchanged)', async () => {
    const input = await makeTestImage(200, 100);
    const { buffer } = await processImage(input, baseOps({ rotate: 180 }), ACCEPT_PLAIN);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it('applies brightness without throwing', async () => {
    const input = await makeTestImage(100, 100);
    await expect(
      processImage(input, baseOps({ brightness: 50 }), ACCEPT_PLAIN),
    ).resolves.not.toThrow();
  });

  it('applies rounded corners and returns PNG when transparent', async () => {
    const input = await makeTestImage(100, 100, 'png');
    const { contentType } = await processImage(
      input,
      baseOps({ roundCorner: { radius: 20, r: 0, g: 0, b: 0, transparent: true } }),
      ACCEPT_PLAIN,
    );
    expect(contentType).toBe('image/png');
  });
});

describe('processImage — format / auto-WebP', () => {
  it('returns WebP when Accept header contains image/webp', async () => {
    const input = await makeTestImage(100, 100);
    const { contentType } = await processImage(input, baseOps(), ACCEPT_WEBP);
    expect(contentType).toBe('image/webp');
  });

  it('returns JPEG when browser does not accept WebP', async () => {
    const input = await makeTestImage(100, 100);
    const { contentType } = await processImage(input, baseOps(), ACCEPT_PLAIN);
    expect(contentType).toBe('image/jpeg');
  });

  it('respects explicit format filter', async () => {
    const input = await makeTestImage(100, 100);
    const { contentType } = await processImage(input, baseOps({ format: 'png' }), ACCEPT_WEBP);
    expect(contentType).toBe('image/png');
  });

  it('respects quality setting', async () => {
    const input = await makeTestImage(200, 200);
    const { buffer: hq } = await processImage(input, baseOps({ quality: 100, format: 'jpeg' }), ACCEPT_PLAIN);
    const { buffer: lq } = await processImage(input, baseOps({ quality: 10, format: 'jpeg' }), ACCEPT_PLAIN);
    expect(hq.length).toBeGreaterThan(lq.length);
  });
});

describe('processImage — focal point', () => {
  it('applies focal point crop without throwing', async () => {
    const input = await makeTestImage(400, 300);
    await expect(
      processImage(
        input,
        baseOps({ width: 200, height: 200, focal: { x1: 150, y1: 100, x2: 250, y2: 200 } }),
        ACCEPT_PLAIN,
      ),
    ).resolves.not.toThrow();
  });
});
