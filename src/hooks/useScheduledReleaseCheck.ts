import { useEffect, useRef } from 'react';
import { checkScheduledReleases } from '@/lib/pushNotifications';
import { useAuth } from '@/hooks/useAuth';

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes (reduced from 1 min)

/**
 * Hook that periodically checks for scheduled product releases
 * and sends notifications to store followers when products go live.
 * 
 * Only runs for authenticated users to avoid unnecessary backend calls
 * from anonymous visitors.
 */
export function useScheduledReleaseCheck() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't poll for unauthenticated visitors
    if (!user) return;

    // Initial check on mount
    checkScheduledReleases().then(result => {
      if (result.processed && result.processed > 0) {
        console.log(`[ScheduledReleaseCheck] Processed ${result.processed} products, notified ${result.notified} users`);
      }
    });

    // Set up periodic checking
    intervalRef.current = setInterval(async () => {
      const result = await checkScheduledReleases();
      if (result.processed && result.processed > 0) {
        console.log(`[ScheduledReleaseCheck] Processed ${result.processed} products, notified ${result.notified} users`);
      }
    }, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);
}
