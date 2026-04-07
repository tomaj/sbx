import { Settings, Trash2 } from 'lucide-react';
import { IconButton } from './icon-button';
import { SkeletonBlock } from './skeleton';

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  editTitle?: string;
  deleteTitle?: string;
  /** Additional action nodes rendered before the edit/delete buttons */
  before?: React.ReactNode;
}

/** Standard edit + delete icon button pair for table/list rows. */
export function RowActions({
  onEdit,
  onDelete,
  editTitle = 'Edit',
  deleteTitle = 'Delete',
  before,
}: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {before}
      <IconButton icon={Settings} onClick={onEdit} title={editTitle} />
      <IconButton icon={Trash2} onClick={onDelete} title={deleteTitle} variant="danger" />
    </div>
  );
}

/** Skeleton placeholder matching RowActions width. Use in DataTable skeletonRender. */
export function RowActionsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} height="h-8" width="w-8" />
      ))}
    </div>
  );
}
