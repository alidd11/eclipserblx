import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook for handling iOS PWA keyboard behavior.
 * 
 * IMPORTANT: When running in Capacitor native mode, this hook is disabled
 * because Capacitor's native keyboard plugin handles everything automatically.
 * 
 * In iOS PWA standalone mode (web), the visualViewport API can be unreliable.
 * This hook provides a workaround:
 * - Detects when an input is focused
 * - Provides state to allow the input bar to use absolute positioning
 * - Uses visualViewport to calculate the correct position above the keyboard
 */
export function useIOSKeyboardFix() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputBarTop, setInputBarTop] = useState<number | null>(null);
  const isIOSRef = useRef(false);
  const isPWARef = useRef(false);
  const isNativeRef = useRef(false);
  const baseViewportHeightRef = useRef<number | null>(null);

  // Detect iOS, PWA, and Native mode on mount
  useEffect(() => {
    // Check if running in Capacitor native mode - if so, skip all workarounds
    isNativeRef.current = Capacitor.isNativePlatform();
    
    if (isNativeRef.current) {
      // Native mode: Capacitor Keyboard plugin handles everything automatically
      console.log('[useIOSKeyboardFix] Running in native mode - keyboard handling delegated to Capacitor');
      return;
    }
    
    const ua = navigator.userAgent;
    isIOSRef.current = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    isPWARef.current = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // IMPORTANT: initialize the baseline BEFORE the first focus/keyboard resize.
    const vv = window.visualViewport;
    if (vv && isIOSRef.current && isPWARef.current) {
      baseViewportHeightRef.current = vv.height;
    }
  }, []);

  // Calculate input bar position based on visual viewport
  const updatePosition = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const active = document.activeElement as HTMLElement | null;
    const isTextInputFocused =
      !!active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.getAttribute('contenteditable') === 'true');

    // Baseline strategy:
    // - baseline should represent the "largest" visualViewport height we see when the
    //   keyboard is NOT shown.
    // - if the first measurement happens while keyboard is open, detection fails.
    //   that's why we initialize baseline on mount (above), and only grow it when
    //   no text input is focused.
    if (baseViewportHeightRef.current === null) {
      baseViewportHeightRef.current = vv.height;
    } else if (!isTextInputFocused) {
      baseViewportHeightRef.current = Math.max(baseViewportHeightRef.current, vv.height);
    }

    const baseline = baseViewportHeightRef.current ?? vv.height;
    const keyboardHeight = Math.max(0, baseline - vv.height);

    // Consider keyboard open if there's a significant difference
    if (keyboardHeight > 80) {
      setIsKeyboardVisible(true);
      // Position the input bar at the bottom edge of the visual viewport
      // vv.offsetTop accounts for any scroll offset
      setInputBarTop(vv.offsetTop + vv.height);
    } else {
      setIsKeyboardVisible(false);
      setInputBarTop(null);
    }
  }, []);

  // Listen to visual viewport changes
  useEffect(() => {
    // Skip all workarounds in native mode - Capacitor handles it
    if (isNativeRef.current) return;
    
    // Only apply this fix for iOS PWA (web)
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

    // Initial measurement (critical on iOS PWA; events aren't always fired reliably)
    handleResize();

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleScroll);
    };
  }, [updatePosition]);

  // Handle focus events to detect keyboard state
  useEffect(() => {
    // Skip in native mode
    if (isNativeRef.current) return;
    
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
    isNative: isNativeRef.current,
  };
}
