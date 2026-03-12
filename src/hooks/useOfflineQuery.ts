import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getCachedData, setCachedData } from '@/lib/offlineCache';
import { useSystemStatus } from '@/hooks/useSystemStatus';

/**
 * A wrapper around useQuery that persists results to IndexedDB for offline access.
 * When offline, it serves cached data as initialData.
 *
 * @param cacheKey - A string key for offline storage (separate from React Query key)
 * @param queryOptions - Standard React Query options
 * @param ttlMs - Cache TTL in milliseconds (default: 1 hour)
 */
export function useOfflineQuery<TData>(
  cacheKey: string,
  queryOptions: UseQueryOptions<TData, Error, TData, QueryKey>,
  ttlMs: number = 1000 * 60 * 60
) {
  const systemStatus = useSystemStatus();
  const isOffline = systemStatus === 'offline';

  const query = useQuery<TData, Error, TData, QueryKey>({
    ...queryOptions,
    // When offline, don't refetch
    enabled: isOffline ? false : (queryOptions.enabled ?? true),
    // Use longer stale time when offline
    staleTime: isOffline ? Infinity : (queryOptions.staleTime ?? 1000 * 60 * 5),
  });

  // Persist successful data to offline cache
  useEffect(() => {
    if (query.data && !isOffline) {
      setCachedData(cacheKey, query.data, ttlMs).catch(() => {});
    }
  }, [query.data, cacheKey, ttlMs, isOffline]);

  return query;
}

/**
 * Hydrate React Query cache with offline data on mount.
 * Call this once at app startup.
 */
export async function getOfflineInitialData<T>(cacheKey: string): Promise<T | undefined> {
  try {
    const cached = await getCachedData<T>(cacheKey);
    return cached ?? undefined;
  } catch {
    return undefined;
  }
}
