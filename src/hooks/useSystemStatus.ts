import { useState, useEffect, useSyncExternalStore } from 'react';

export type SystemStatus = 'online' | 'degraded' | 'offline' | 'checking';

// Module-level shared state driven by browser online/offline events
let sharedStatus: SystemStatus = typeof navigator !== 'undefined'
  ? (navigator.onLine ? 'online' : 'offline')
  : 'checking';

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function handleOnline() {
  sharedStatus = 'online';
  notify();
}

function handleOffline() {
  sharedStatus = 'offline';
  notify();
}

// Set up global listeners once
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() {
  return sharedStatus;
}

/**
 * Shared system-status hook using browser online/offline events.
 * Zero polling — purely event-driven.
 */
export function useSystemStatus(): SystemStatus {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'online' as SystemStatus);
}
