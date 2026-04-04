import useSWR, { type SWRConfiguration } from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error: any = new Error('Fetch failed')
    error.status = res.status
    try { error.info = await res.json() } catch {}
    throw error
  }
  return res.json()
}

export { fetcher }

/**
 * Type-safe SWR hook with the standard fetcher.
 * Usage: const { data, error, isLoading, mutate } = useApi<Space[]>('/api/admin/spaces')
 */
export function useApi<T>(url: string | null, config?: SWRConfiguration) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    ...config,
  })
}
