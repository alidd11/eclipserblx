import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showInfoNotification } from '@/lib/nativeNotification';

const LOCAL_VERSION_KEY = 'app_installed_version';
const UPDATE_CHECK_INTERVAL = 30000; // Check every 30 seconds

interface AppVersion {
  id: string;
  version: string;
  force_update: boolean;
  updated_at: string;
}

export function useAppVersionCheck() {
  const isUpdatingRef = useRef(false);

  const getLocalVersion = useCallback(() => {
    return localStorage.getItem(LOCAL_VERSION_KEY) || '1.0.0';
  }, []);

  const setLocalVersion = useCallback((version: string) => {
    localStorage.setItem(LOCAL_VERSION_KEY, version);
  }, []);

  const forceAppUpdate = useCallback(async () => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    console.log('[AppVersion] Force update triggered');
    
    // Show notification
    showInfoNotification('Update Available', 'Applying update...');

    try {
      // Clear all caches via service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      // Also clear caches directly
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
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

      // Small delay then reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('[AppVersion] Update failed:', error);
      isUpdatingRef.current = false;
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
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
      const localVersion = getLocalVersion();

      console.log('[AppVersion] Server:', serverVersion.version, 'Local:', localVersion, 'Force:', serverVersion.force_update);

      // If force_update is enabled and versions differ, update
      if (serverVersion.force_update && serverVersion.version !== localVersion) {
        console.log('[AppVersion] Force update required');
        setLocalVersion(serverVersion.version);
        await forceAppUpdate();
      } else if (serverVersion.version !== localVersion) {
        // Just update local version tracking (soft update on next reload)
        setLocalVersion(serverVersion.version);
      }
    } catch (error) {
      console.error('[AppVersion] Check failed:', error);
    }
  }, [getLocalVersion, setLocalVersion, forceAppUpdate]);

  useEffect(() => {
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
            forceAppUpdate();
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
  }, [checkForUpdate, getLocalVersion, setLocalVersion, forceAppUpdate]);

  return { checkForUpdate, forceAppUpdate };
}
