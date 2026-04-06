import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showInfoNotification } from '@/lib/nativeNotification';
import { safeStorage, safeSessionStorage, getFromIndexedDB, setInIndexedDB } from '@/lib/safeStorage';

const LOCAL_VERSION_KEY = 'app_installed_version';
const LAST_UPDATE_KEY = 'app_last_force_update';
const PENDING_VERSION_PARAM = '__v';
const UPDATE_TIME_PARAM = '__t';
const RELOAD_ATTEMPT_PARAM = '__ra';
const CIRCUIT_BREAKER_KEY = 'app_update_circuit';
const GRACE_PERIOD = 120000; // 120 seconds grace period after update
const MAX_RELOAD_ATTEMPTS = 1; // Very conservative — 1 attempt max
const CIRCUIT_BREAKER_WINDOW = 300000; // 5 minutes cooldown between force-update attempts

interface AppVersion {
  id: string;
  version: string;
  force_update: boolean;
  updated_at: string;
}

interface UseAppVersionCheckOptions {
  showNotifications?: boolean;
}

declare global {
  interface Window {
    __appInstalledVersion?: string;
    __lastUpdateTimestamp?: number;
  }
}

/**
 * Circuit breaker: prevents repeated forced reloads within a short window.
 * Uses multiple storage layers + runtime fallback for iOS resilience.
 */
function isCircuitBreakerOpen(): boolean {
  try {
    const now = Date.now();

    // Runtime fallback (survives storage failures, cleared on full page unload)
    if (window.__lastUpdateTimestamp && now - window.__lastUpdateTimestamp < CIRCUIT_BREAKER_WINDOW) {
      console.debug('[AppVersionCheck] Circuit breaker OPEN (runtime)');
      return true;
    }

    // Check all storage layers
    for (const store of [safeSessionStorage, safeStorage]) {
      const ts = store.getItem(CIRCUIT_BREAKER_KEY);
      if (ts) {
        const elapsed = now - parseInt(ts, 10);
        if (!isNaN(elapsed) && elapsed < CIRCUIT_BREAKER_WINDOW) {
          console.debug('[AppVersionCheck] Circuit breaker OPEN (storage)');
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

function tripCircuitBreaker(): void {
  const now = Date.now().toString();
  window.__lastUpdateTimestamp = Date.now();
  safeSessionStorage.setItem(CIRCUIT_BREAKER_KEY, now);
  safeStorage.setItem(CIRCUIT_BREAKER_KEY, now);
}

function wasRecentlyUpdated(): boolean {
  try {
    const now = Date.now();

    // Runtime fallback
    if (window.__lastUpdateTimestamp && now - window.__lastUpdateTimestamp < GRACE_PERIOD) {
      return true;
    }

    const url = new URL(window.location.href);
    const urlTime = url.searchParams.get(UPDATE_TIME_PARAM);
    if (urlTime) {
      const elapsed = now - parseInt(urlTime, 10);
      if (!isNaN(elapsed) && elapsed < GRACE_PERIOD) return true;
    }

    for (const store of [safeSessionStorage, safeStorage]) {
      const t = store.getItem(LAST_UPDATE_KEY);
      if (t) {
        const elapsed = now - parseInt(t, 10);
        if (!isNaN(elapsed) && elapsed < GRACE_PERIOD) return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

async function getLocalVersion(): Promise<string | null> {
  const fromLocal = safeStorage.getItem(LOCAL_VERSION_KEY);
  if (fromLocal) return fromLocal;
  const fromSession = safeSessionStorage.getItem(LOCAL_VERSION_KEY);
  if (fromSession) return fromSession;
  const fromRuntime = typeof window !== 'undefined' ? window.__appInstalledVersion : undefined;
  if (fromRuntime) return fromRuntime;
  try {
    const fromIDB = await getFromIndexedDB(LOCAL_VERSION_KEY);
    if (fromIDB) return fromIDB;
  } catch {}
  // Return null instead of '1.0.0' so callers can distinguish "never stored" from "stored"
  return null;
}

async function setLocalVersion(version: string): Promise<void> {
  if (typeof window !== 'undefined') window.__appInstalledVersion = version;
  safeStorage.setItem(LOCAL_VERSION_KEY, version);
  safeSessionStorage.setItem(LOCAL_VERSION_KEY, version);
  try { await setInIndexedDB(LOCAL_VERSION_KEY, version); } catch {}
}

function setUpdateTimestamp(timestamp: string): void {
  safeStorage.setItem(LAST_UPDATE_KEY, timestamp);
  safeSessionStorage.setItem(LAST_UPDATE_KEY, timestamp);
  window.__lastUpdateTimestamp = parseInt(timestamp, 10);
}

export function useAppVersionCheck(options: UseAppVersionCheckOptions = {}) {
  const { showNotifications = true } = options;
  const isUpdatingRef = useRef(false);
  const hasBootstrappedRef = useRef(false);

  const bootstrapVersionFromUrl = useCallback(async () => {
    if (typeof window === 'undefined' || hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    try {
      const url = new URL(window.location.href);
      const pendingVersion = url.searchParams.get(PENDING_VERSION_PARAM);
      const updateTime = url.searchParams.get(UPDATE_TIME_PARAM);

      // Persist runtime fallback BEFORE cleaning URL params
      if (updateTime) {
        window.__lastUpdateTimestamp = parseInt(updateTime, 10);
      }

      if (pendingVersion) {
        window.__appInstalledVersion = pendingVersion;
        safeStorage.setItem(LOCAL_VERSION_KEY, pendingVersion);
        safeSessionStorage.setItem(LOCAL_VERSION_KEY, pendingVersion);
        setInIndexedDB(LOCAL_VERSION_KEY, pendingVersion).catch(() => {});
        console.debug('[AppVersionCheck] Bootstrapped version from URL:', pendingVersion);
      }
      if (updateTime) setUpdateTimestamp(updateTime);

      if (pendingVersion || updateTime) {
        url.searchParams.delete(PENDING_VERSION_PARAM);
        url.searchParams.delete(UPDATE_TIME_PARAM);
        url.searchParams.delete(RELOAD_ATTEMPT_PARAM);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, []);

  const forceAppUpdate = useCallback(async (nextVersion: string) => {
    if (isUpdatingRef.current) return;

    // Circuit breaker — prevent loops even if storage was cleared
    if (isCircuitBreakerOpen()) {
      console.warn('[AppVersionCheck] Circuit breaker prevents reload, just storing version');
      await setLocalVersion(nextVersion);
      return;
    }

    // Check reload attempt counter from URL
    try {
      const url = new URL(window.location.href);
      const currentAttempts = parseInt(url.searchParams.get(RELOAD_ATTEMPT_PARAM) || '0', 10);
      if (currentAttempts >= MAX_RELOAD_ATTEMPTS) {
        console.warn('[AppVersionCheck] Max reload attempts reached, storing version without reload');
        await setLocalVersion(nextVersion);
        tripCircuitBreaker();
        return;
      }
    } catch {}

    isUpdatingRef.current = true;
    tripCircuitBreaker(); // Trip BEFORE reload to protect against rapid re-entry

    if (showNotifications) showInfoNotification('Update Available', 'Applying update...');

    try {
      await setLocalVersion(nextVersion);
      const updateTime = Date.now().toString();
      setUpdateTimestamp(updateTime);

      try {
        const url = new URL(window.location.href);
        const currentAttempts = parseInt(url.searchParams.get(RELOAD_ATTEMPT_PARAM) || '0', 10);
        url.searchParams.set(PENDING_VERSION_PARAM, nextVersion);
        url.searchParams.set(UPDATE_TIME_PARAM, updateTime);
        url.searchParams.set(RELOAD_ATTEMPT_PARAM, (currentAttempts + 1).toString());
        window.history.replaceState({}, '', url.toString());
      } catch {}

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        } catch {}
      }
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
            if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        } catch {}
      }
      setTimeout(() => window.location.reload(), 500);
    } catch {
      isUpdatingRef.current = false;
    }
  }, [showNotifications]);

  const checkForUpdate = useCallback(async () => {
    if (wasRecentlyUpdated() || isCircuitBreakerOpen()) {
      console.debug('[AppVersionCheck] Skipping check (recently updated or circuit breaker)');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('app_version')
        .select('id, version, force_update, updated_at')
        .eq('id', 'current')
        .single();
      if (error || !data) return;
      const serverVersion = data as AppVersion;
      const localVersion = await getLocalVersion();

      // First run: no local version stored yet — just store it silently, never force reload
      if (localVersion === null) {
        console.debug('[AppVersionCheck] First run, storing version:', serverVersion.version);
        await setLocalVersion(serverVersion.version);
        return;
      }

      if (serverVersion.force_update && serverVersion.version !== localVersion) {
        console.debug('[AppVersionCheck] Force update:', localVersion, '->', serverVersion.version);
        await forceAppUpdate(serverVersion.version);
      } else if (serverVersion.version !== localVersion) {
        console.debug('[AppVersionCheck] Silent version update:', localVersion, '->', serverVersion.version);
        await setLocalVersion(serverVersion.version);
      }
    } catch {}
  }, [forceAppUpdate]);

  useEffect(() => {
    bootstrapVersionFromUrl();

    // Deferred initial check
    const initialCheckTimeout = setTimeout(checkForUpdate, 2000);

    // Re-check on visibility change only
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(initialCheckTimeout);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [bootstrapVersionFromUrl, checkForUpdate]);

  return { checkForUpdate, forceAppUpdate };
}
