const LOCALE = 'sk';

/**
 * 03.04.2026
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * 19:09
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 03.04.2026 19:09
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  return `${formatDate(d)} ${formatTime(d)}`;
}

/**
 * Short weekday label for chart axes: "Po", "Ut", "St", ...
 */
export function formatWeekdayShort(date: string | Date): string {
  return new Date(date).toLocaleDateString(LOCALE, { weekday: 'short' });
}

/**
 * Short month label for chart axes: "jan", "feb", ...
 */
export function formatMonthShort(date: string | Date): string {
  return new Date(date).toLocaleDateString(LOCALE, { month: 'short' });
}
