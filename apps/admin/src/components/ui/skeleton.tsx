/**
 * Skeleton loading primitives.
 * Use these instead of inline animate-pulse divs.
 *
 * Examples:
 *   <SkeletonText />                       — single line, default width
 *   <SkeletonText width="w-48" />          — wider line
 *   <SkeletonLines lines={3} />            — stacked lines
 *   <SkeletonAvatar />                     — circular avatar
 *   <SkeletonBadge />                      — pill-shaped badge
 *   <SkeletonBlock height="h-32" />        — arbitrary block
 */

const BASE = 'rounded bg-gray-200 dark:bg-gray-700 animate-pulse';

interface SkeletonTextProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonText({
  width = 'w-24',
  height = 'h-4',
  className = '',
}: SkeletonTextProps) {
  return <div className={`${BASE} ${height} ${width} ${className}`} />;
}

interface SkeletonLinesProps {
  lines?: number;
  /** Width class for each line. Can be an array for different widths per line. */
  widths?: string | string[];
  height?: string;
  gap?: string;
  className?: string;
}

export function SkeletonLines({
  lines = 2,
  widths = 'w-full',
  height = 'h-3.5',
  gap = 'gap-1.5',
  className = '',
}: SkeletonLinesProps) {
  const widthArray = Array.isArray(widths) ? widths : Array.from({ length: lines }, () => widths);

  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {widthArray.slice(0, lines).map((w, i) => (
        <div key={i} className={`${BASE} ${height} ${w}`} />
      ))}
    </div>
  );
}

interface SkeletonAvatarProps {
  size?: string;
  className?: string;
}

export function SkeletonAvatar({ size = 'size-7', className = '' }: SkeletonAvatarProps) {
  return <div className={`${BASE} rounded-full ${size} shrink-0 ${className}`} />;
}

interface SkeletonBadgeProps {
  width?: string;
  className?: string;
}

export function SkeletonBadge({ width = 'w-16', className = '' }: SkeletonBadgeProps) {
  return <div className={`${BASE} h-5 rounded-full ${width} ${className}`} />;
}

interface SkeletonBlockProps {
  height?: string;
  width?: string;
  className?: string;
}

export function SkeletonBlock({
  height = 'h-8',
  width = 'w-8',
  className = '',
}: SkeletonBlockProps) {
  return <div className={`${BASE} ${height} ${width} ${className}`} />;
}

/** Convenience: avatar + two text lines (common in user columns) */
export function SkeletonUserCell({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SkeletonAvatar />
      <SkeletonLines lines={2} widths={['w-24', 'w-32']} />
    </div>
  );
}

/** Convenience: two text lines (common in date/time columns) */
export function SkeletonTimeCell({ className = '' }: { className?: string }) {
  return <SkeletonLines lines={2} widths={['w-20', 'w-14']} className={className} />;
}
