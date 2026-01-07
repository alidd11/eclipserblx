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

export function useBackgroundPush() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check if push is supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 
                     'PushManager' in window && 
                     'Notification' in window;
    setIsSupported(supported);
    
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
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user || !VAPID_PUBLIC_KEY) {
      console.error('Push not supported or no VAPID key');
      return false;
    }

    try {
      // Request notification permission
      const permResult = await Notification.requestPermission();
      setPermission(permResult);
      
      if (permResult !== 'granted') {
        console.log('Notification permission denied');
        return false;
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
        throw new Error('Invalid subscription data');
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
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
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
    subscribe,
    unsubscribe,
  };
}
