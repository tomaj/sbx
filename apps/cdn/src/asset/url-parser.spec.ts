import { splitOnMarker, parseOperations } from './url-parser';

describe('splitOnMarker', () => {
  it('splits on /m/', () => {
    const result = splitOnMarker('/f/123/hero.jpg/m/500x300');
    expect(result).toEqual(['/f/123/hero.jpg', '500x300']);
  });

  it('returns null when /m/ is absent', () => {
    expect(splitOnMarker('/f/123/hero.jpg')).toBeNull();
  });

  it('preserves filters after /m/', () => {
    const result = splitOnMarker('/f/123/a.jpg/m/500x300/filters:quality(80)');
    expect(result).toEqual(['/f/123/a.jpg', '500x300/filters:quality(80)']);
  });
});

describe('parseOperations — resize', () => {
  it('parses basic resize', () => {
    const ops = parseOperations('500x300');
    expect(ops.width).toBe(500);
    expect(ops.height).toBe(300);
    expect(ops.flipH).toBe(false);
    expect(ops.flipV).toBe(false);
  });

  it('parses width-only (0 height)', () => {
    const ops = parseOperations('600x0');
    expect(ops.width).toBe(600);
    expect(ops.height).toBe(0);
  });

  it('parses height-only (0 width)', () => {
    const ops = parseOperations('0x400');
    expect(ops.width).toBe(0);
    expect(ops.height).toBe(400);
  });

  it('parses horizontal flip (negative width)', () => {
    const ops = parseOperations('-300x400');
    expect(ops.width).toBe(300);
    expect(ops.flipH).toBe(true);
    expect(ops.flipV).toBe(false);
  });

  it('parses vertical flip (negative height)', () => {
    const ops = parseOperations('300x-400');
    expect(ops.height).toBe(400);
    expect(ops.flipH).toBe(false);
    expect(ops.flipV).toBe(true);
  });

  it('parses both flips', () => {
    const ops = parseOperations('-300x-400');
    expect(ops.flipH).toBe(true);
    expect(ops.flipV).toBe(true);
  });

  it('applies max dimension cap', () => {
    // parser itself doesn't cap — sharp-processor does, so just verify values pass through
    const ops = parseOperations('5000x5000');
    expect(ops.width).toBe(5000);
  });
});

describe('parseOperations — manual crop', () => {
  it('parses crop before resize', () => {
    const ops = parseOperations('100x50:600x400');
    expect(ops.crop).toEqual({ x1: 100, y1: 50, x2: 600, y2: 400 });
  });

  it('parses crop + resize', () => {
    const ops = parseOperations('100x50:600x400/200x100');
    expect(ops.crop).toEqual({ x1: 100, y1: 50, x2: 600, y2: 400 });
    expect(ops.width).toBe(200);
    expect(ops.height).toBe(100);
  });
});

describe('parseOperations — smart crop', () => {
  it('sets smart flag', () => {
    const ops = parseOperations('400x300/smart');
    expect(ops.smart).toBe(true);
    expect(ops.width).toBe(400);
  });
});

describe('parseOperations — fit-in', () => {
  it('sets fitIn flag', () => {
    const ops = parseOperations('fit-in/600x400');
    expect(ops.fitIn).toBe(true);
    expect(ops.width).toBe(600);
    expect(ops.height).toBe(400);
  });

  it('fit-in with fill color', () => {
    const ops = parseOperations('fit-in/600x400/filters:fill(CCCCCC)');
    expect(ops.fitIn).toBe(true);
    expect(ops.fill).toBe('CCCCCC');
  });

  it('fit-in with transparent fill', () => {
    const ops = parseOperations('fit-in/600x400/filters:fill(transparent):format(png)');
    expect(ops.fill).toBe('transparent');
    expect(ops.format).toBe('png');
  });
});

describe('parseOperations — filters', () => {
  it('parses quality', () => {
    expect(parseOperations('0x0/filters:quality(80)').quality).toBe(80);
  });

  it('clamps quality to 0-100', () => {
    expect(parseOperations('0x0/filters:quality(150)').quality).toBe(100);
    expect(parseOperations('0x0/filters:quality(-10)').quality).toBe(0);
  });

  it('parses blur with radius only', () => {
    const ops = parseOperations('0x0/filters:blur(50)');
    expect(ops.blur).toEqual({ radius: 50 });
  });

  it('parses blur with radius and sigma', () => {
    const ops = parseOperations('0x0/filters:blur(50,75)');
    expect(ops.blur).toEqual({ radius: 50, sigma: 75 });
  });

  it('parses brightness', () => {
    expect(parseOperations('0x0/filters:brightness(50)').brightness).toBe(50);
    expect(parseOperations('0x0/filters:brightness(-50)').brightness).toBe(-50);
  });

  it('clamps brightness to -100..100', () => {
    expect(parseOperations('0x0/filters:brightness(200)').brightness).toBe(100);
  });

  it('parses grayscale', () => {
    expect(parseOperations('0x0/filters:grayscale()').grayscale).toBe(true);
  });

  it('parses rotate valid values', () => {
    expect(parseOperations('0x0/filters:rotate(90)').rotate).toBe(90);
    expect(parseOperations('0x0/filters:rotate(180)').rotate).toBe(180);
    expect(parseOperations('0x0/filters:rotate(270)').rotate).toBe(270);
  });

  it('ignores invalid rotate values', () => {
    expect(parseOperations('0x0/filters:rotate(45)').rotate).toBeUndefined();
  });

  it('parses format', () => {
    expect(parseOperations('0x0/filters:format(webp)').format).toBe('webp');
    expect(parseOperations('0x0/filters:format(avif)').format).toBe('avif');
    expect(parseOperations('0x0/filters:format(png)').format).toBe('png');
    expect(parseOperations('0x0/filters:format(jpeg)').format).toBe('jpeg');
  });

  it('ignores unknown format', () => {
    expect(parseOperations('0x0/filters:format(bmp)').format).toBeUndefined();
  });

  it('parses no_upscale', () => {
    expect(parseOperations('0x0/filters:no_upscale()').noUpscale).toBe(true);
  });

  it('parses focal point', () => {
    const ops = parseOperations('500x300/filters:focal(100x200:400x500)');
    expect(ops.focal).toEqual({ x1: 100, y1: 200, x2: 400, y2: 500 });
  });

  it('parses round_corner without ellipsis', () => {
    const ops = parseOperations('0x0/filters:round_corner(20,255,255,255,0)');
    expect(ops.roundCorner).toEqual({
      radius: 20,
      r: 255,
      g: 255,
      b: 255,
      transparent: false,
    });
  });

  it('parses round_corner transparent', () => {
    const ops = parseOperations('0x0/filters:round_corner(20,0,0,0,1)');
    expect(ops.roundCorner?.transparent).toBe(true);
  });

  it('parses round_corner with ellipsis using A|B syntax', () => {
    // Storyblok format: round_corner(50|25,255,255,255,0)
    const ops = parseOperations('0x0/filters:round_corner(50|25,255,255,255,0)');
    expect(ops.roundCorner?.radius).toBe(50);
    expect(ops.roundCorner?.ellipsis).toBe(25);
    expect(ops.roundCorner?.r).toBe(255);
    expect(ops.roundCorner?.transparent).toBe(false);
  });

  it('parses round_corner A|B transparent', () => {
    const ops = parseOperations('0x0/filters:round_corner(30|15,0,0,0,1)');
    expect(ops.roundCorner?.radius).toBe(30);
    expect(ops.roundCorner?.ellipsis).toBe(15);
    expect(ops.roundCorner?.transparent).toBe(true);
  });

  it('parses multiple filters chained', () => {
    const ops = parseOperations('500x300/filters:quality(80):grayscale():blur(5):rotate(90)');
    expect(ops.quality).toBe(80);
    expect(ops.grayscale).toBe(true);
    expect(ops.blur).toEqual({ radius: 5 });
    expect(ops.rotate).toBe(90);
  });

  it('handles focal point colon inside parens without breaking filter split', () => {
    const ops = parseOperations('500x300/filters:focal(100x100:400x400):quality(80)');
    expect(ops.focal).toEqual({ x1: 100, y1: 100, x2: 400, y2: 400 });
    expect(ops.quality).toBe(80);
  });
});
