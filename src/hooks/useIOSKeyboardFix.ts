import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Simplified iOS keyboard hook for PWA environments.
 * 
 * This hook now uses a CSS-first approach that relies on the browser's native
 * `interactive-widget=resizes-content` viewport behavior (set in index.html).
 * 
 * The browser automatically shrinks the viewport when the keyboard appears,
 * and a properly structured flex layout will keep the input bar visible.
 * 
 * This hook only provides:
 * - isKeyboardVisible: For triggering scroll-to-bottom behavior
 * - isIOSPWA: For conditional styling if needed
 * - isNative: To detect Capacitor native mode
 * 
 * IMPORTANT: The input bar should remain in normal flex flow (not position: fixed).
 * The parent container should use h-[100dvh] or equivalent to fill the dynamic viewport.
 */
export function useIOSKeyboardFix() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const isIOSRef = useRef(false);
  const isPWARef = useRef(false);
  const isNativeRef = useRef(false);
  const baseViewportHeightRef = useRef<number | null>(null);

  // Detect iOS, PWA, and Native mode on mount
  useEffect(() => {
    // Check if running in Capacitor native mode - if so, skip workarounds
    isNativeRef.current = Capacitor.isNativePlatform();
    
    if (isNativeRef.current) {
      console.log('[useIOSKeyboardFix] Running in native mode - keyboard handling delegated to Capacitor');
      return;
    }
    
    const ua = navigator.userAgent;
    isIOSRef.current = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    isPWARef.current = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Initialize baseline viewport height
    const vv = window.visualViewport;
    if (vv) {
      baseViewportHeightRef.current = vv.height;
    }
  }, []);

  // Track keyboard visibility based on viewport changes
  useEffect(() => {
    // Skip in native mode
    if (isNativeRef.current) return;
    
    const vv = window.visualViewport;
    if (!vv) return;

    const checkKeyboardState = () => {
      // Update baseline when no text input is focused (keyboard closed)
      const active = document.activeElement as HTMLElement | null;
      const isTextInputFocused =
        !!active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.getAttribute('contenteditable') === 'true');

      if (baseViewportHeightRef.current === null) {
        baseViewportHeightRef.current = vv.height;
      } else if (!isTextInputFocused) {
        baseViewportHeightRef.current = Math.max(baseViewportHeightRef.current, vv.height);
      }

      const baseline = baseViewportHeightRef.current ?? vv.height;
      const keyboardHeight = Math.max(0, baseline - vv.height);

      // Keyboard is open if there's a significant height difference
      setIsKeyboardVisible(keyboardHeight > 80);
    };

    const handleResize = () => {
      checkKeyboardState();
      // Schedule delayed checks for iOS animation
      setTimeout(checkKeyboardState, 100);
      setTimeout(checkKeyboardState, 300);
    };

    vv.addEventListener('resize', handleResize);
    
    // Initial check
    checkKeyboardState();

    return () => {
      vv.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle focus events for additional keyboard detection
  useEffect(() => {
    // Skip in native mode
    if (isNativeRef.current) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Assume keyboard will open
        setTimeout(() => setIsKeyboardVisible(true), 100);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      const isStillFocused = relatedTarget?.tagName === 'INPUT' || 
        relatedTarget?.tagName === 'TEXTAREA';

      if (!isStillFocused) {
        setTimeout(() => setIsKeyboardVisible(false), 100);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return {
    isKeyboardVisible,
    isIOSPWA: isIOSRef.current && isPWARef.current,
    isNative: isNativeRef.current,
  };
}
