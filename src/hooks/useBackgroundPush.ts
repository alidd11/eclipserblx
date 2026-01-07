import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Detect iOS
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Detect standalone PWA mode
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (navigator as any).standalone === true;
}

export interface SubscribeResult {
  success: boolean;
  error?: string;
}

export function useBackgroundPush() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isiOSDevice, setIsiOSDevice] = useState(false);
  const [isPWAMode, setIsPWAMode] = useState(false);

  // Check if push is supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 
                     'PushManager' in window && 
                     'Notification' in window;
    setIsSupported(supported);
    setIsiOSDevice(isIOS());
    setIsPWAMode(isStandalone());
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription status
  useEffect(() => {
    async function checkSubscription() {
      if (!isSupported || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Verify it exists in database
          const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
            .single();
          
          setIsSubscribed(!!data);
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error('Error checking push subscription:', error);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkSubscription();
  }, [isSupported, user]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<SubscribeResult> => {
    // Check basic support
    if (!isSupported) {
      return { success: false, error: 'Push notifications are not supported in this browser.' };
    }

    if (!user) {
      return { success: false, error: 'Please sign in to enable push notifications.' };
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID public key not configured');
      return { success: false, error: 'Push notifications are not configured. Please contact support.' };
    }

    // iOS-specific checks
    if (isIOS()) {
      if (!isStandalone()) {
        return { 
          success: false, 
          error: 'On iOS, you must install this app to your Home Screen first. Tap the Share button, then "Add to Home Screen", and try again from the installed app.' 
        };
      }
    }

    try {
      // Request notification permission
      const permResult = await Notification.requestPermission();
      setPermission(permResult);
      
      if (permResult === 'denied') {
        return { 
          success: false, 
          error: 'Notification permission was denied. Please enable notifications in your device settings.' 
        };
      }
      
      if (permResult !== 'granted') {
        return { success: false, error: 'Notification permission is required to receive push notifications.' };
      }

      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      const subscriptionJson = subscription.toJSON();
      
      if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
        throw new Error('Invalid subscription data received from browser');
      }

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint,
          p256dh_key: subscriptionJson.keys.p256dh,
          auth_key: subscriptionJson.keys.auth,
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      setIsSubscribed(true);
      console.log('Push subscription saved successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      
      // Handle specific error types
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Permission denied. Please allow notifications in your browser settings.' };
      }
      if (error.name === 'AbortError') {
        return { success: false, error: 'The operation was cancelled. Please try again.' };
      }
      if (error.message?.includes('push service')) {
        return { success: false, error: 'Unable to connect to push service. Please check your internet connection.' };
      }
      
      return { success: false, error: error.message || 'Failed to enable push notifications. Please try again.' };
    }
  }, [isSupported, user]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from database first
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        // Then unsubscribe from push
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      console.log('Push subscription removed successfully');
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }, [isSupported, user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    isiOSDevice,
    isPWAMode,
    subscribe,
    unsubscribe,
  };
}
