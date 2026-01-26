import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showInfoNotification } from '@/lib/nativeNotification';
import { safeStorage, safeSessionStorage, getFromIndexedDB, setInIndexedDB } from '@/lib/safeStorage';

const LOCAL_VERSION_KEY = 'app_installed_version';
const LAST_UPDATE_KEY = 'app_last_force_update';
const PENDING_VERSION_PARAM = '__v';
const UPDATE_TIME_PARAM = '__t';
const UPDATE_CHECK_INTERVAL = 30000; // Check every 30 seconds
const GRACE_PERIOD = 30000; // 30 seconds grace period after update

interface AppVersion {
  id: string;
  version: string;
  force_update: boolean;
  updated_at: string;
}

interface UseAppVersionCheckOptions {
  showNotifications?: boolean;
}

// Declare global window property for runtime memory
declare global {
  interface Window {
    __appInstalledVersion?: string;
  }
}

/**
 * Check if we recently triggered an update (within grace period)
 * This prevents infinite reload loops even when storage fails
 */
function wasRecentlyUpdated(): boolean {
  try {
    // Check URL first (most reliable in private mode)
    const url = new URL(window.location.href);
    const urlTime = url.searchParams.get(UPDATE_TIME_PARAM);
    if (urlTime) {
      const elapsed = Date.now() - parseInt(urlTime, 10);
      if (!isNaN(elapsed) && elapsed < GRACE_PERIOD) {
        console.log('[AppVersion] Recently updated (URL param) - elapsed:', elapsed, 'ms');
        return true;
      }
    }

    // Check sessionStorage (survives reloads)
    const sessionTime = safeSessionStorage.getItem(LAST_UPDATE_KEY);
    if (sessionTime) {
      const elapsed = Date.now() - parseInt(sessionTime, 10);
      if (!isNaN(elapsed) && elapsed < GRACE_PERIOD) {
        console.log('[AppVersion] Recently updated (session) - elapsed:', elapsed, 'ms');
        return true;
      }
    }

    // Check localStorage as fallback
    const localTime = safeStorage.getItem(LAST_UPDATE_KEY);
    if (localTime) {
      const elapsed = Date.now() - parseInt(localTime, 10);
      if (!isNaN(elapsed) && elapsed < GRACE_PERIOD) {
        console.log('[AppVersion] Recently updated (local) - elapsed:', elapsed, 'ms');
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get local version from multiple storage layers
 */
async function getLocalVersion(): Promise<string> {
  // Layer 1: localStorage
  const fromLocal = safeStorage.getItem(LOCAL_VERSION_KEY);
  if (fromLocal) {
    console.log('[AppVersion] Version from localStorage:', fromLocal);
    return fromLocal;
  }

  // Layer 2: sessionStorage
  const fromSession = safeSessionStorage.getItem(LOCAL_VERSION_KEY);
  if (fromSession) {
    console.log('[AppVersion] Version from sessionStorage:', fromSession);
    return fromSession;
  }

  // Layer 3: Runtime memory
  const fromRuntime = typeof window !== 'undefined' ? window.__appInstalledVersion : undefined;
  if (fromRuntime) {
    console.log('[AppVersion] Version from runtime memory:', fromRuntime);
    return fromRuntime;
  }

  // Layer 4: IndexedDB (async, most resilient)
  try {
    const fromIDB = await getFromIndexedDB(LOCAL_VERSION_KEY);
    if (fromIDB) {
      console.log('[AppVersion] Version from IndexedDB:', fromIDB);
      return fromIDB;
    }
  } catch {
    // IndexedDB failed, continue
  }

  console.log('[AppVersion] No stored version found, using default 1.0.0');
  return '1.0.0';
}

/**
 * Set local version in all storage layers for redundancy
 */
async function setLocalVersion(version: string): Promise<void> {
  console.log('[AppVersion] Persisting version to all layers:', version);

  // Layer 1: Runtime memory (immediate)
  if (typeof window !== 'undefined') {
    window.__appInstalledVersion = version;
  }

  // Layer 2: localStorage
  safeStorage.setItem(LOCAL_VERSION_KEY, version);

  // Layer 3: sessionStorage (survives reloads)
  safeSessionStorage.setItem(LOCAL_VERSION_KEY, version);

  // Layer 4: IndexedDB (async, most resilient)
  try {
    await setInIndexedDB(LOCAL_VERSION_KEY, version);
  } catch {
    // IndexedDB failed, other layers should be enough
  }
}

/**
 * Set update timestamp in all storage layers
 */
function setUpdateTimestamp(timestamp: string): void {
  safeStorage.setItem(LAST_UPDATE_KEY, timestamp);
  safeSessionStorage.setItem(LAST_UPDATE_KEY, timestamp);
}

export function useAppVersionCheck(options: UseAppVersionCheckOptions = {}) {
  const { showNotifications = true } = options;
  const isUpdatingRef = useRef(false);
  const hasBootstrappedRef = useRef(false);

  /**
   * Consume version and timestamp from URL parameters
   * This runs first on app load to capture values from previous reload
   */
  const bootstrapVersionFromUrl = useCallback(async () => {
    if (typeof window === 'undefined' || hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;

    try {
      const url = new URL(window.location.href);
      const pendingVersion = url.searchParams.get(PENDING_VERSION_PARAM);
      const updateTime = url.searchParams.get(UPDATE_TIME_PARAM);

      if (pendingVersion) {
        console.log('[AppVersion] Bootstrapping version from URL:', pendingVersion);
        
        // Set in all layers immediately
        if (typeof window !== 'undefined') {
          window.__appInstalledVersion = pendingVersion;
        }
        safeStorage.setItem(LOCAL_VERSION_KEY, pendingVersion);
        safeSessionStorage.setItem(LOCAL_VERSION_KEY, pendingVersion);
        
        // Async set to IndexedDB
        setInIndexedDB(LOCAL_VERSION_KEY, pendingVersion).catch(() => {});
      }

      if (updateTime) {
        console.log('[AppVersion] Bootstrapping update timestamp from URL:', updateTime);
        setUpdateTimestamp(updateTime);
      }

      // Clean URL parameters
      if (pendingVersion || updateTime) {
        url.searchParams.delete(PENDING_VERSION_PARAM);
        url.searchParams.delete(UPDATE_TIME_PARAM);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('[AppVersion] Bootstrap failed:', error);
    }
  }, []);

  /**
   * Force app update with cache clearing and reload
   */
  const forceAppUpdate = useCallback(async (nextVersion: string) => {
    if (isUpdatingRef.current) {
      console.log('[AppVersion] Update already in progress, skipping');
      return;
    }
    isUpdatingRef.current = true;

    console.log('[AppVersion] Force update triggered for version:', nextVersion);

    // Show notification only if enabled
    if (showNotifications) {
      showInfoNotification('Update Available', 'Applying update...');
    }

    try {
      // Step 1: Set version in ALL persistence layers BEFORE reload
      await setLocalVersion(nextVersion);

      // Step 2: Set update timestamp in all layers
      const updateTime = Date.now().toString();
      setUpdateTimestamp(updateTime);

      // Step 3: Add version and timestamp to URL as fallback
      try {
        const url = new URL(window.location.href);
        url.searchParams.set(PENDING_VERSION_PARAM, nextVersion);
        url.searchParams.set(UPDATE_TIME_PARAM, updateTime);
        window.history.replaceState({}, '', url.toString());
      } catch {
        // URL manipulation failed, continue anyway
      }

      // Step 4: Clear all caches via service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      // Step 5: Clear caches directly
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        } catch {
          // Cache clearing failed, continue
        }
      }

      // Step 6: Force service worker update
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch {
          // SW update failed, continue
        }
      }

      // Step 7: Reload after a small delay
      console.log('[AppVersion] Reloading in 500ms...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('[AppVersion] Update failed:', error);
      isUpdatingRef.current = false;
    }
  }, [showNotifications]);

  /**
   * Check for version updates from server
   */
  const checkForUpdate = useCallback(async () => {
    // Skip if we recently updated (prevents infinite loops)
    if (wasRecentlyUpdated()) {
      console.log('[AppVersion] Skipping check - recently updated');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('app_version')
        .select('*')
        .eq('id', 'current')
        .single();

      if (error || !data) {
        console.log('[AppVersion] Could not fetch version:', error);
        return;
      }

      const serverVersion = data as AppVersion;
      const localVersion = await getLocalVersion();

      console.log(
        '[AppVersion] Server:', serverVersion.version,
        'Local:', localVersion,
        'Force:', serverVersion.force_update
      );

      // If force_update is enabled and versions differ, update
      if (serverVersion.force_update && serverVersion.version !== localVersion) {
        console.log('[AppVersion] Force update required');
        await forceAppUpdate(serverVersion.version);
      } else if (serverVersion.version !== localVersion) {
        // Just update local version tracking (soft update on next reload)
        console.log('[AppVersion] Soft update - storing new version');
        await setLocalVersion(serverVersion.version);
      }
    } catch (error) {
      console.error('[AppVersion] Check failed:', error);
    }
  }, [forceAppUpdate]);

  useEffect(() => {
    // Step 1: Bootstrap version from URL (consumes params from previous reload)
    bootstrapVersionFromUrl();

    // Step 2: Wait a moment for bootstrap to complete, then check for updates
    const initialCheckTimeout = setTimeout(() => {
      checkForUpdate();
    }, 100);

    // Step 3: Set up realtime subscription for instant updates
    const channel = supabase
      .channel('app-version-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_version',
        },
        async (payload) => {
          console.log('[AppVersion] Realtime update received:', payload);
          
          // Skip if recently updated
          if (wasRecentlyUpdated()) {
            console.log('[AppVersion] Skipping realtime update - recently updated');
            return;
          }

          const newVersion = payload.new as AppVersion;
          const localVersion = await getLocalVersion();

          if (newVersion.force_update && newVersion.version !== localVersion) {
            await forceAppUpdate(newVersion.version);
          }
        }
      )
      .subscribe();

    // Step 4: Periodic check as fallback
    const interval = setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialCheckTimeout);
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [bootstrapVersionFromUrl, checkForUpdate, forceAppUpdate]);

  return { checkForUpdate, forceAppUpdate };
}
