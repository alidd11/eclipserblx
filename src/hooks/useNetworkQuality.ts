import { useSyncExternalStore } from 'react';

export type NetworkQuality = 'low' | 'medium' | 'high';

function getQuality(): NetworkQuality {
  if (typeof navigator === 'undefined') return 'high';
  const conn = (navigator as any).connection;
  if (!conn) return 'high';

  const type = conn.effectiveType;
  if (type === 'slow-2g' || type === '2g') return 'low';
  if (type === '3g') return 'medium';
  return 'high';
}

let currentQuality = getQuality();
const listeners = new Set<() => void>();

function notify() {
  currentQuality = getQuality();
  listeners.forEach(fn => fn());
}

if (typeof navigator !== 'undefined') {
  const conn = (navigator as any).connection;
  conn?.addEventListener?.('change', notify);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() { return currentQuality; }

/**
 * Returns current network quality: 'low' | 'medium' | 'high'.
 * Progressive enhancement — defaults to 'high' when Network Information API is unavailable.
 */
export function useNetworkQuality(): NetworkQuality {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'high' as NetworkQuality);
}

/**
 * Standalone function for use outside React (e.g., in optimizeImageUrl).
 */
export function getNetworkQuality(): NetworkQuality {
  return getQuality();
}
