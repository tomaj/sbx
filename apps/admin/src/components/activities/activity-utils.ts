export const ACTIVITY_TYPES = [
  { value: 'Story', label: 'Story' },
  { value: 'Component', label: 'Component' },
  { value: 'Asset', label: 'Asset' },
  { value: 'AssetFolder', label: 'Asset Folder' },
  { value: 'Release', label: 'Release' },
  { value: 'Branch', label: 'Branch' },
  { value: 'Datasource', label: 'Datasource' },
  { value: 'DatasourceEntry', label: 'Datasource Entry' },
  { value: 'Tag', label: 'Tag' },
  { value: 'Preset', label: 'Preset' },
  { value: 'Workflow', label: 'Workflow' },
  { value: 'WorkflowStage', label: 'Workflow Stage' },
  { value: 'WorkflowStageChange', label: 'Workflow Stage Change' },
  { value: 'Space', label: 'Space' },
  { value: 'SpaceRole', label: 'Space Role' },
  { value: 'Discussion', label: 'Discussion' },
  { value: 'Comment', label: 'Comment' },
  { value: 'Collaborator', label: 'Collaborator' },
  { value: 'Approval', label: 'Approval' },
  { value: 'ScheduledContent', label: 'Scheduled Content' },
]

const VERB_MAP: Record<string, string> = {
  update: 'Updated',
  create: 'Created',
  publish: 'Published',
  unpublish: 'Unpublished',
  deploy: 'Deployed',
  delete: 'Deleted',
}

const VERB_COLORS: Record<string, string> = {
  create: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  publish: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  unpublish: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  deploy: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delete: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

export function activityKeyColor(key: string): string {
  const verb = key.slice(key.lastIndexOf('.') + 1)
  return VERB_COLORS[verb] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

export function formatActivityKey(key: string): string {
  const dotIdx = key.lastIndexOf('.')
  if (dotIdx === -1) return key
  const type = key.slice(0, dotIdx)
  const verb = key.slice(dotIdx + 1)
  const typeLabel = type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  const verbLabel = VERB_MAP[verb] ?? verb.charAt(0).toUpperCase() + verb.slice(1)
  return `${verbLabel} · ${typeLabel}`
}

const UNKNOWN_NAMES = new Set(['unknown item', 'unkown item', ''])

export function resolveItemName(
  trackable: { name?: string } | null,
  trackableType: string | null,
): string {
  const name = trackable?.name?.trim() ?? ''
  if (name && !UNKNOWN_NAMES.has(name.toLowerCase())) return name
  return formatTrackableType(trackableType)
}

export function formatActivityTime(dateStr: string | Date): { date: string; time: string } {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return { date, time }
}

export function formatTrackableType(type: string | null): string {
  if (!type) return 'Unknown'
  return type.replace(/([A-Z])/g, ' $1').trim()
}
