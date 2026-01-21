import { useEffect, useRef } from 'react';
import { checkScheduledReleases } from '@/lib/pushNotifications';

const CHECK_INTERVAL = 60 * 1000; // Check every minute

/**
 * Hook that periodically checks for scheduled product releases
 * and sends notifications to store followers when products go live.
 * 
 * This should be mounted in a top-level component that's always rendered
 * (like App.tsx or MainLayout).
 */
export function useScheduledReleaseCheck() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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
  }, []);
}
