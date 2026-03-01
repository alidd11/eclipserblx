import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SystemStatus = 'online' | 'degraded' | 'offline' | 'checking';

// Module-level shared state so all consumers share one check loop
let sharedStatus: SystemStatus = 'checking';
let listeners = new Set<(s: SystemStatus) => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let checkCount = 0;

async function checkStatus() {
  try {
    const start = Date.now();
    const { error } = await supabase.from('categories').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      sharedStatus = 'offline';
    } else if (latency > 2000) {
      sharedStatus = 'degraded';
    } else {
      sharedStatus = 'online';
    }
  } catch {
    sharedStatus = 'offline';
  }
  listeners.forEach(fn => fn(sharedStatus));
}

function startPolling() {
  if (intervalId) return;
  checkStatus();
  intervalId = setInterval(checkStatus, 60_000);
}

function stopPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Shared system-status hook. No matter how many components call this,
 * only ONE interval runs.
 */
export function useSystemStatus(): SystemStatus {
  const [status, setStatus] = useState<SystemStatus>(sharedStatus);

  useEffect(() => {
    listeners.add(setStatus);
    checkCount++;
    if (checkCount === 1) startPolling();

    return () => {
      listeners.delete(setStatus);
      checkCount--;
      if (checkCount === 0) stopPolling();
    };
  }, []);

  return status;
}
