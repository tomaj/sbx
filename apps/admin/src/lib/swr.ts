import useSWR, { type SWRConfiguration } from 'swr';

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = fetch('/api/admin/auth/refresh', { method: 'POST' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

const fetcher = async (url: string) => {
  let res = await fetch(url);

  // If access token expired, try refreshing and retry once
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(url);
    } else {
      // Refresh failed — redirect to login
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const error: any = new Error('Fetch failed');
    error.status = res.status;
    try {
      error.info = await res.json();
    } catch {}
    throw error;
  }
  return res.json();
};

export { fetcher };

/**
 * Type-safe SWR hook with the standard fetcher.
 * Usage: const { data, error, isLoading, mutate } = useApi<Space[]>('/api/admin/spaces')
 */
export function useApi<T>(url: string | null, config?: SWRConfiguration) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}
