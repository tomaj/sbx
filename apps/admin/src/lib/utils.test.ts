import { describe, expect, it, vi } from 'vitest';

// Mock @/env before importing utils — avoids @t3-oss/env-nextjs validation at import time
vi.mock('@/env', () => ({
  env: {
    NEXT_PUBLIC_CDN_URL: 'http://localhost:3002',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3001',
    API_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  },
}));

const { cn, avatarUrl, normalizeAssetFilename } = await import('./utils');

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('conditionally applies classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    // tailwind-merge: p-4 overrides p-2
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles undefined/null gracefully', () => {
    expect(cn(undefined, null, 'foo')).toBe('foo');
  });
});

describe('avatarUrl', () => {
  it('converts a relative avatar path to CDN URL', () => {
    expect(avatarUrl('avatars/123/abc/photo.jpg')).toBe(
      'http://localhost:3002/avatars/123/abc/photo.jpg',
    );
  });

  it('strips leading slash from path', () => {
    expect(avatarUrl('/avatars/123/photo.jpg')).toBe('http://localhost:3002/avatars/123/photo.jpg');
  });

  it('returns null for null input', () => {
    expect(avatarUrl(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(avatarUrl(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(avatarUrl('')).toBeNull();
  });
});

describe('normalizeAssetFilename', () => {
  it('normalizes a Storyblok CDN URL to local CDN', () => {
    const storyblokUrl = 'https://a.storyblok.com/f/285923/800x600/abc123/image.jpg';
    expect(normalizeAssetFilename(storyblokUrl)).toBe(
      'http://localhost:3002/f/285923/800x600/abc123/image.jpg',
    );
  });

  it('normalizes an S3 URL to local CDN', () => {
    const s3Url = 'https://s3.amazonaws.com/a.storyblok.com/f/285923/img.png';
    expect(normalizeAssetFilename(s3Url)).toBe('http://localhost:3002/f/285923/img.png');
  });

  it('passes through a URL that already uses local CDN', () => {
    const localUrl = 'http://localhost:3002/f/285923/image.jpg';
    expect(normalizeAssetFilename(localUrl)).toBe('http://localhost:3002/f/285923/image.jpg');
  });

  it('returns the original string when no /f/spaceId/ pattern is found', () => {
    const plain = 'just-a-filename.jpg';
    expect(normalizeAssetFilename(plain)).toBe('just-a-filename.jpg');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeAssetFilename(undefined)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(normalizeAssetFilename(null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(normalizeAssetFilename('')).toBe('');
  });
});
