/**
 * Native OS Notification utility
 * Shows native notifications when permitted, falls back to in-app toast
 */
import { toast } from 'sonner';
import { playNotificationSound, type NotificationType as SoundType } from './notificationSounds';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NativeNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Show a native OS notification if permitted, otherwise fall back to in-app toast
 */
export function showNativeNotification(
  title: string,
  options?: NativeNotificationOptions & { type?: NotificationType }
): void {
  const { type = 'info', ...notificationOptions } = options || {};
  
  // Check if native notifications are supported and permitted
  const canShowNative = 
    'Notification' in window && 
    Notification.permission === 'granted';
  
  // Play notification sound based on type
  const soundType: SoundType = type === 'warning' ? 'warning' : type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
  playNotificationSound(soundType);
  
  if (canShowNative) {
    try {
      const notification = new Notification(title, {
        icon: notificationOptions.icon || '/favicon.ico',
        badge: '/favicon.ico',
        ...notificationOptions,
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      // Auto-close after 5 seconds for non-interactive notifications
      if (!notificationOptions.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }
      
      return;
    } catch (error) {
      // Fall through to toast on error (e.g., PWA context issues)
      console.warn('Native notification failed, falling back to toast:', error);
    }
  }
  
  // Fallback to in-app toast
  const message = notificationOptions.body 
    ? `${title}: ${notificationOptions.body}` 
    : title;
    
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
    default:
      toast.info(message);
  }
}

/**
 * Show a success notification (native or toast)
 */
export function showSuccessNotification(title: string, body?: string): void {
  showNativeNotification(title, { body, type: 'success' });
}

/**
 * Show an error notification (native or toast)
 */
export function showErrorNotification(title: string, body?: string): void {
  showNativeNotification(title, { body, type: 'error' });
}

/**
 * Show an info notification (native or toast)
 */
export function showInfoNotification(title: string, body?: string): void {
  showNativeNotification(title, { body, type: 'info' });
}
