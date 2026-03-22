/** Converts snake_case field key to Title Case when display_name is missing. */
export function fieldLabel(displayName: string | null | undefined, fieldKey: string): string {
  if (displayName) return displayName
  return fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
