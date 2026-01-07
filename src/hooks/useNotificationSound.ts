import { useCallback, useRef } from 'react';

// Simple notification sound using Web Audio API
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

// Trigger haptic feedback on mobile devices
const triggerHapticFeedback = () => {
  if ('vibrate' in navigator) {
    // Short vibration pattern: vibrate 100ms, pause 50ms, vibrate 100ms
    navigator.vibrate([100, 50, 100]);
  }
};

export function useNotificationSound() {
  const lastPlayedRef = useRef<number>(0);
  
  const playSound = useCallback(() => {
    // Throttle to prevent rapid repeated sounds/vibrations
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    lastPlayedRef.current = now;

    // Check if haptic feedback is enabled (stored preference)
    const hapticEnabled = localStorage.getItem('notification_haptic_enabled') !== 'false';
    
    // Check if sound is enabled
    const soundEnabled = localStorage.getItem('notification_sound_enabled') !== 'false';
    
    try {
      if (soundEnabled) {
        createNotificationSound();
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
