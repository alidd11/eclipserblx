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

export function useNotificationSound() {
  const lastPlayedRef = useRef<number>(0);
  
  const playSound = useCallback(() => {
    // Throttle to prevent rapid repeated sounds
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    lastPlayedRef.current = now;
    
    try {
      createNotificationSound();
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);
  
  return { playSound };
}
