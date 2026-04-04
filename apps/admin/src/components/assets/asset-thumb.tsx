'use client';

import { useState } from 'react';
import { FileText, FileImage, FileVideo, FileAudio, File } from 'lucide-react';
import { env } from '@/env';

const CDN_URL = env.NEXT_PUBLIC_CDN_URL;

export function assetThumbnailUrl(filename: string, spaceId: string | number, size = 200): string {
  // Extract relative path from URL like:
  //   https://a.storyblok.com/f/285923/path/img.jpg
  //   https://s3.amazonaws.com/a.storyblok.com/f/285923/path/img.jpg
  const match = filename.match(/\/f\/\d+\/(.+)$/);
  if (!match) return '';
  // fit-in = contain (never crops), filters:no_upscale = never enlarges small images
  return `${CDN_URL}/f/${spaceId}/${match[1]}/m/fit-in/${size}x${size}/filters:no_upscale()`;
}

function FileIcon({ contentType, iconClassName }: { contentType: string; iconClassName?: string }) {
  const base = contentType.split('/')[0];
  const Icon =
    base === 'image'
      ? FileImage
      : base === 'video'
        ? FileVideo
        : base === 'audio'
          ? FileAudio
          : contentType === 'application/pdf'
            ? FileText
            : File;
  return <Icon className={iconClassName ?? 'w-10 h-10 text-gray-400'} />;
}

interface AssetThumbProps {
  filename: string;
  contentType: string;
  spaceId: string | number;
  alt?: string | null;
  size?: number;
  /** Classes for the <img> element itself */
  imgClassName?: string;
  /** Classes for the fallback icon */
  iconClassName?: string;
}

/**
 * Renders either an <img> (for image content types) or a file-type icon.
 * Tries our CDN thumbnail URL first; if that fails, falls back to the
 * original filename URL (covers assets not yet migrated to our MinIO).
 * Does NOT wrap in a container — callers are responsible for the container.
 */
export function AssetThumb({
  filename,
  contentType,
  spaceId,
  alt,
  size = 200,
  imgClassName,
  iconClassName,
}: AssetThumbProps) {
  const isImage = contentType.startsWith('image/');
  const cdnUrl = isImage ? assetThumbnailUrl(filename, spaceId, size) : '';
  // Original URL as fallback (e.g. imported Storyblok/S3 assets not yet in MinIO)
  const fallbackUrl = isImage && filename.startsWith('http') ? filename : '';

  const [src, setSrc] = useState<string>(cdnUrl || fallbackUrl);
  const [failed, setFailed] = useState(false);

  if (!isImage || failed || !src) {
    return <FileIcon contentType={contentType} iconClassName={iconClassName} />;
  }

  function handleError() {
    // If CDN URL failed and we have a fallback, try original URL
    if (src === cdnUrl && fallbackUrl && fallbackUrl !== cdnUrl) {
      setSrc(fallbackUrl);
    } else {
      setFailed(true);
    }
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} onError={handleError} className={imgClassName} />
  );
}
