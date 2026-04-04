import { CircleDot, Circle, AlertCircle } from 'lucide-react';

interface Props {
  published: boolean;
  unpublishedChanges?: boolean;
  className?: string;
}

export function StoryStatusIcon({
  published,
  unpublishedChanges = false,
  className = 'w-4 h-4',
}: Props) {
  if (published && !unpublishedChanges) {
    return <CircleDot className={`${className} text-teal-500`} />;
  }
  if (published && unpublishedChanges) {
    return <AlertCircle className={`${className} text-amber-500`} />;
  }
  return <Circle className={`${className} text-gray-300`} />;
}
