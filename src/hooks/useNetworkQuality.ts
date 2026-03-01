import { useEffect, useRef } from 'react';
import { useSystemStatus, SystemStatus } from '@/hooks/useSystemStatus';

export type ConnectionStatus = 'connected' | 'degraded' | 'offline';

function mapStatus(s: SystemStatus): ConnectionStatus {
  if (s === 'online') return 'connected';
  if (s === 'degraded') return 'degraded';
  if (s === 'offline') return 'offline';
  return navigator.onLine ? 'connected' : 'offline';
}

/**
 * Network quality hook that delegates to the shared useSystemStatus singleton
 * so only ONE polling loop runs across the entire app.
 */
export function useNetworkQuality() {
  const systemStatus = useSystemStatus();
  const status = mapStatus(systemStatus);
  const previousStatus = useRef<ConnectionStatus>(status);

  const justRecovered = previousStatus.current !== 'connected' && status === 'connected';

  useEffect(() => {
    previousStatus.current = status;
  }, [status]);

  return {
    status,
    isConnected: status === 'connected',
    isDegraded: status === 'degraded',
    isOffline: status === 'offline',
    justRecovered,
    lastChecked: new Date(),
    forceCheck: async () => {}, // No-op — shared polling handles this
  };
}
