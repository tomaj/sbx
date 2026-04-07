import type { StoryDetail } from '../types';

export function PublishStatus({ story }: { story: StoryDetail | null }) {
  if (!story)
    return <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  if (story.published && !story.unpublished_changes) {
    return <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" title="Published" />;
  }
  if (story.published && story.unpublished_changes) {
    return (
      <span
        className="w-3 h-3 rounded-full bg-amber-500 inline-block"
        title="Published (unpublished changes)"
      />
    );
  }
  return (
    <span className="w-3 h-3 rounded-full border-2 border-gray-400 inline-block" title="Draft" />
  );
}
