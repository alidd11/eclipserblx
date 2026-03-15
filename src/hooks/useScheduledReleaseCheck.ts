import { useEffect, useRef, useState } from 'react';
import { checkScheduledReleases } from '@/lib/pushNotifications';
import { useAuth } from '@/hooks/useAuth';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Deferred version — waits 5s / requestIdleCallback before starting polling.
 * Prevents blocking the initial render and main-thread work.
 */
export function useDeferredScheduledReleaseCheck() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(() => setReady(true))
      : (setTimeout(() => setReady(true), 5000) as unknown as number);
    return () => {
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!ready || !user) return;

    checkScheduledReleases().catch(() => {});

    const interval = setInterval(() => {
      checkScheduledReleases().catch(() => {});
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [ready, user]);
}

/** @deprecated Use useDeferredScheduledReleaseCheck instead */
export function useScheduledReleaseCheck() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    checkScheduledReleases().catch(() => {});
    intervalRef.current = setInterval(() => {
      checkScheduledReleases().catch(() => {});
    }, CHECK_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
}
