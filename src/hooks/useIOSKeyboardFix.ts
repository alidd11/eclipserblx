import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for handling iOS PWA keyboard behavior.
 * 
 * In iOS PWA standalone mode, the visualViewport API can be unreliable.
 * This hook provides a simpler approach:
 * - Detects when an input is focused
 * - Provides state to allow the input bar to use absolute positioning
 * - Uses visualViewport to calculate the correct position above the keyboard
 */
export function useIOSKeyboardFix() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputBarTop, setInputBarTop] = useState<number | null>(null);
  const isIOSRef = useRef(false);
  const isPWARef = useRef(false);

  // Detect iOS and PWA on mount
  useEffect(() => {
    const ua = navigator.userAgent;
    isIOSRef.current = /iPad|iPhone|iPod/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    isPWARef.current = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
  }, []);

  // Calculate input bar position based on visual viewport
  const updatePosition = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const windowHeight = window.innerHeight;
    const viewportHeight = vv.height;
    const keyboardHeight = windowHeight - viewportHeight;

    // Consider keyboard open if there's a significant difference
    if (keyboardHeight > 100) {
      setIsKeyboardVisible(true);
      // Position the input bar at the top of the keyboard
      // vv.offsetTop accounts for any scroll offset
      setInputBarTop(vv.offsetTop + viewportHeight);
    } else {
      setIsKeyboardVisible(false);
      setInputBarTop(null);
    }
  }, []);

  // Listen to visual viewport changes
  useEffect(() => {
    // Only apply this fix for iOS PWA
    if (!isIOSRef.current || !isPWARef.current) {
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // Schedule multiple updates to handle iOS animation delays
      updatePosition();
      setTimeout(updatePosition, 50);
      setTimeout(updatePosition, 150);
      setTimeout(updatePosition, 300);
    };

    const handleScroll = () => {
      updatePosition();
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleScroll);

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleScroll);
    };
  }, [updatePosition]);

  // Handle focus events to detect keyboard state
  useEffect(() => {
    if (!isIOSRef.current || !isPWARef.current) {
      return;
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Delay to allow keyboard animation
        setTimeout(updatePosition, 100);
        setTimeout(updatePosition, 300);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      const isStillFocused = relatedTarget?.tagName === 'INPUT' || 
        relatedTarget?.tagName === 'TEXTAREA';

      if (!isStillFocused) {
        // Reset after keyboard dismissal animation
        setTimeout(() => {
          setIsKeyboardVisible(false);
          setInputBarTop(null);
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [updatePosition]);

  return {
    isKeyboardVisible,
    inputBarTop,
    isIOSPWA: isIOSRef.current && isPWARef.current,
  };
}
