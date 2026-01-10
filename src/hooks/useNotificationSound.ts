import { useCallback, useRef } from 'react';
import { playNotificationSound, type NotificationType } from '@/lib/notificationSounds';

// Trigger haptic feedback on mobile devices
const triggerHapticFeedback = () => {
  if ('vibrate' in navigator) {
    // Short vibration pattern: vibrate 100ms, pause 50ms, vibrate 100ms
    navigator.vibrate([100, 50, 100]);
  }
};

export function useNotificationSound() {
  const lastPlayedRef = useRef<number>(0);
  
  const playSound = useCallback((type: NotificationType = 'info') => {
    // Throttle to prevent rapid repeated sounds/vibrations
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    lastPlayedRef.current = now;

    // Check if haptic feedback is enabled (stored preference)
    const hapticEnabled = localStorage.getItem('notification_haptic_enabled') !== 'false';
    
    // Check if sound is enabled
    const soundEnabled = localStorage.getItem('notification-sound-enabled') !== 'false';
    
    try {
      if (soundEnabled) {
        playNotificationSound(type);
      }
      if (hapticEnabled) {
        triggerHapticFeedback();
      }
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);

  // Standalone vibrate function for explicit haptic feedback
  const vibrate = useCallback((pattern: number | number[] = 100) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);
  
  return { playSound, vibrate };
}
