import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showInfoNotification } from '@/lib/nativeNotification';
import { safeStorage } from '@/lib/safeStorage';

const LOCAL_VERSION_KEY = 'app_installed_version';
const PENDING_VERSION_PARAM = '__v';
const UPDATE_CHECK_INTERVAL = 30000; // Check every 30 seconds

interface AppVersion {
  id: string;
  version: string;
  force_update: boolean;
  updated_at: string;
}

interface UseAppVersionCheckOptions {
  showNotifications?: boolean;
}

export function useAppVersionCheck(options: UseAppVersionCheckOptions = {}) {
  const { showNotifications = true } = options;
  const isUpdatingRef = useRef(false);

  /**
   * If storage is blocked (common in Safari private mode), we still need a way
   * to avoid an infinite force-update reload loop.
   *
   * We do that by temporarily persisting the "current local version" in the URL
   * during the reload that applies the update, then consuming it on next boot.
   */
  const bootstrapVersionFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const url = new URL(window.location.href);
      const pending = url.searchParams.get(PENDING_VERSION_PARAM);
      if (!pending) return;

      // Store in runtime memory (works even when storage is blocked)
      (window as any).__appInstalledVersion = pending;

      // Best-effort persist
      safeStorage.setItem(LOCAL_VERSION_KEY, pending);

      // Clean URL
      url.searchParams.delete(PENDING_VERSION_PARAM);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  }, []);

  const getLocalVersion = useCallback(() => {
    const stored = safeStorage.getItem(LOCAL_VERSION_KEY);
    const runtime = typeof window !== 'undefined' ? (window as any).__appInstalledVersion : undefined;
    return stored || runtime || '1.0.0';
  }, []);

  const setLocalVersion = useCallback((version: string) => {
    if (typeof window !== 'undefined') {
      (window as any).__appInstalledVersion = version;
    }
    safeStorage.setItem(LOCAL_VERSION_KEY, version);
  }, []);

  const forceAppUpdate = useCallback(async (nextVersion?: string) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    console.log('[AppVersion] Force update triggered');

    // Show notification only if enabled
    if (showNotifications) {
      showInfoNotification('Update Available', 'Applying update...');
    }

    try {
      // If localStorage is blocked, persist the next version via URL for the reload.
      if (nextVersion && typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set(PENDING_VERSION_PARAM, nextVersion);
          window.history.replaceState({}, '', url.toString());
        } catch {
          // ignore
        }
      }

      // Clear all caches via service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      // Also clear caches directly
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Force service worker update
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }

      // Small delay then reload (give SW/cache ops a moment to settle)
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error('[AppVersion] Update failed:', error);
      isUpdatingRef.current = false;
    }
  }, [showNotifications]);

  const checkForUpdate = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('app_version').select('*').eq('id', 'current').single();

      if (error || !data) {
        console.log('[AppVersion] Could not fetch version:', error);
        return;
      }

      const serverVersion = data as AppVersion;
      const localVersion = getLocalVersion();

      console.log('[AppVersion] Server:', serverVersion.version, 'Local:', localVersion, 'Force:', serverVersion.force_update);

      // If force_update is enabled and versions differ, update
      if (serverVersion.force_update && serverVersion.version !== localVersion) {
        console.log('[AppVersion] Force update required');
        setLocalVersion(serverVersion.version);
        await forceAppUpdate(serverVersion.version);
      } else if (serverVersion.version !== localVersion) {
        // Just update local version tracking (soft update on next reload)
        setLocalVersion(serverVersion.version);
      }
    } catch (error) {
      console.error('[AppVersion] Check failed:', error);
    }
  }, [getLocalVersion, setLocalVersion, forceAppUpdate]);

  useEffect(() => {
    // First, consume any pending version from the URL (prevents reload loops)
    bootstrapVersionFromUrl();

    // Initial check
    checkForUpdate();

    // Set up realtime subscription for instant updates
    const channel = supabase
      .channel('app-version-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_version',
        },
        (payload) => {
          console.log('[AppVersion] Realtime update received:', payload);
          const newVersion = payload.new as AppVersion;
          const localVersion = getLocalVersion();

          if (newVersion.force_update && newVersion.version !== localVersion) {
            setLocalVersion(newVersion.version);
            forceAppUpdate(newVersion.version);
          }
        }
      )
      .subscribe();

    // Periodic check as fallback
    const interval = setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [bootstrapVersionFromUrl, checkForUpdate, getLocalVersion, setLocalVersion, forceAppUpdate]);

  return { checkForUpdate, forceAppUpdate };
}
