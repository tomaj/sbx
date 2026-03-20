'use client'

import { useState } from 'react'
import { FileText, FileImage, FileVideo, FileAudio, File } from 'lucide-react'

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL ?? 'http://localhost:3002'

export function assetThumbnailUrl(filename: string, spaceId: string | number, size = 200): string {
  // Extract relative path from URL like:
  //   https://a.storyblok.com/f/285923/path/img.jpg
  //   https://s3.amazonaws.com/a.storyblok.com/f/285923/path/img.jpg
  const match = filename.match(/\/f\/\d+\/(.+)$/)
  if (!match) return ''
  // fit-in = contain (never crops), filters:no_upscale = never enlarges small images
  return `${CDN_URL}/f/${spaceId}/${match[1]}/m/fit-in/${size}x${size}/filters:no_upscale()`
}

function FileIcon({ contentType, iconClassName }: { contentType: string; iconClassName?: string }) {
  const base = contentType.split('/')[0]
  const Icon = base === 'image' ? FileImage
    : base === 'video' ? FileVideo
    : base === 'audio' ? FileAudio
    : contentType === 'application/pdf' ? FileText
    : File
  return <Icon className={iconClassName ?? 'w-10 h-10 text-gray-400'} />
}

interface AssetThumbProps {
  filename: string
  contentType: string
  spaceId: string | number
  alt?: string | null
  size?: number
  /** Classes for the <img> element itself */
  imgClassName?: string
  /** Classes for the fallback icon */
  iconClassName?: string
}

/**
 * Renders either an <img> (for image content types) or a file-type icon.
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
  const [error, setError] = useState(false)
  const isImage = contentType.startsWith('image/')
  const url = isImage ? assetThumbnailUrl(filename, spaceId, size) : ''

  if (!isImage || error || !url) {
    return <FileIcon contentType={contentType} iconClassName={iconClassName} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt ?? ''}
      onError={() => setError(true)}
      className={imgClassName}
    />
  )
}
