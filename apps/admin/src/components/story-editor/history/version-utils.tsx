export interface StoryVersion {
  id: number;
  story_id: number;
  release_id: number | null;
  user_id: number | null;
  user: {
    id: number;
    name: string | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
  action: string;
  status: string;
  name: string;
  slug: string;
  full_slug: string;
  tag_list: string[];
  path: string | null;
  is_startpage: boolean;
  created_at: string;
}

export interface CompareChange {
  path: string;
  old: any;
  new: any;
}

export interface CompareResult {
  latest: StoryVersion | null;
  target: StoryVersion | null;
  changes: CompareChange[];
}

/** A group of consecutive versions by the same user */
export interface VersionGroup {
  user: StoryVersion['user'];
  userId: number | null;
  versions: StoryVersion[];
  /** The most recent/prominent version in the group (first by date) */
  primary: StoryVersion;
}

export function actionLabel(v: StoryVersion): string {
  const who = v.user?.name ?? 'Unknown';
  if (v.action === 'publish') return `${who} Published ${v.name}`;
  if (v.action === 'unpublish') return `${who} Unpublished ${v.name}`;
  if (v.action === 'create') return `${who} Created ${v.name}`;
  return `${who} Saved ${v.name}`;
}

export function actionVerb(action: string): string {
  if (action === 'publish') return 'Published';
  if (action === 'unpublish') return 'Unpublished';
  if (action === 'create') return 'Created';
  return 'Edited';
}

/** Group consecutive versions by the same user */
export function groupVersions(versions: StoryVersion[]): VersionGroup[] {
  const groups: VersionGroup[] = [];
  for (const v of versions) {
    const last = groups[groups.length - 1];
    if (last && last.userId === (v.user_id ?? null)) {
      last.versions.push(v);
    } else {
      groups.push({
        user: v.user,
        userId: v.user_id ?? null,
        versions: [v],
        primary: v,
      });
    }
  }
  return groups;
}

/** Parse a dot-notation path like "body.0.columns.1.title" into breadcrumb segments */
export function parseBreadcrumb(path: string): string[] {
  return path.split('.').filter((seg) => !/^\d+$/.test(seg));
}

/** Render a value with appropriate formatting based on type */
export function renderChangeValue(val: any): React.ReactNode {
  if (val === null || val === undefined) return <span className="text-gray-400 italic">empty</span>;
  if (typeof val === 'boolean') {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${val ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
      >
        {val ? 'True' : 'False'}
      </span>
    );
  }
  if (typeof val === 'string') return <span className="break-all">{val}</span>;
  if (typeof val === 'number') return <span>{val}</span>;
  return (
    <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-800 rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
      {JSON.stringify(val, null, 2)}
    </pre>
  );
}
