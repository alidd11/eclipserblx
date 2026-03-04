import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showInfoNotification } from '@/lib/nativeNotification';
import { safeStorage, safeSessionStorage, getFromIndexedDB, setInIndexedDB } from '@/lib/safeStorage';

const LOCAL_VERSION_KEY = 'app_installed_version';
const LAST_UPDATE_KEY = 'app_last_force_update';
const PENDING_VERSION_PARAM = '__v';
const UPDATE_TIME_PARAM = '__t';
const GRACE_PERIOD = 60000; // 60 seconds grace period after update

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
  }
}

function wasRecentlyUpdated(): boolean {
  try {
    const url = new URL(window.location.href);
    const urlTime = url.searchParams.get(UPDATE_TIME_PARAM);
    if (urlTime) {
      const elapsed = Date.now() - parseInt(urlTime, 10);
      if (!isNaN(elapsed) && elapsed < GRACE_PERIOD) return true;
    }
    const sessionTime = safeSessionStorage.getItem(LAST_UPDATE_KEY);
    if (sessionTime) {
      const elapsed = Date.now() - parseInt(sessionTime, 10);
      if (!isNaN(elapsed) && elapsed < GRACE_PERIOD) return true;
    }
    const localTime = safeStorage.getItem(LAST_UPDATE_KEY);
    if (localTime) {
      const elapsed = Date.now() - parseInt(localTime, 10);
      if (!isNaN(elapsed) && elapsed < GRACE_PERIOD) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function getLocalVersion(): Promise<string> {
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
  return '1.0.0';
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
      if (pendingVersion) {
        if (typeof window !== 'undefined') window.__appInstalledVersion = pendingVersion;
        safeStorage.setItem(LOCAL_VERSION_KEY, pendingVersion);
        safeSessionStorage.setItem(LOCAL_VERSION_KEY, pendingVersion);
        setInIndexedDB(LOCAL_VERSION_KEY, pendingVersion).catch(() => {});
      }
      if (updateTime) setUpdateTimestamp(updateTime);
      if (pendingVersion || updateTime) {
        url.searchParams.delete(PENDING_VERSION_PARAM);
        url.searchParams.delete(UPDATE_TIME_PARAM);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, []);

  const forceAppUpdate = useCallback(async (nextVersion: string) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    if (showNotifications) showInfoNotification('Update Available', 'Applying update...');
    try {
      await setLocalVersion(nextVersion);
      const updateTime = Date.now().toString();
      setUpdateTimestamp(updateTime);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set(PENDING_VERSION_PARAM, nextVersion);
        url.searchParams.set(UPDATE_TIME_PARAM, updateTime);
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
    if (wasRecentlyUpdated()) return;
    try {
      const { data, error } = await supabase
        .from('app_version')
        .select('id, version, force_update, updated_at')
        .eq('id', 'current')
        .single();
      if (error || !data) return;
      const serverVersion = data as AppVersion;
      const localVersion = await getLocalVersion();
      if (serverVersion.force_update && serverVersion.version !== localVersion) {
        await forceAppUpdate(serverVersion.version);
      } else if (serverVersion.version !== localVersion) {
        await setLocalVersion(serverVersion.version);
      }
    } catch {}
  }, [forceAppUpdate]);

  useEffect(() => {
    bootstrapVersionFromUrl();

    // Check once on load (deferred)
    const initialCheckTimeout = setTimeout(checkForUpdate, 2000);

    // Re-check only when app becomes visible (no polling)
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
