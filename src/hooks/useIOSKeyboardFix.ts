import { useState, useEffect } from 'react';

/**
 * Simplified iOS keyboard visibility detection.
 *
 * Relies on the browser's native `interactive-widget=resizes-content`
 * viewport behavior (set in index.html). This hook only tracks whether
 * the keyboard is likely open for scroll-to-bottom behavior.
 */
export function useIOSKeyboardFix() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let baseHeight = vv.height;

    const handleResize = () => {
      const active = document.activeElement as HTMLElement | null;
      const isTextInput =
        !!active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.getAttribute('contenteditable') === 'true');

      if (!isTextInput) {
        baseHeight = Math.max(baseHeight, vv.height);
      }

      setIsKeyboardVisible(isTextInput && baseHeight - vv.height > 80);
    };

    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  return {
    isKeyboardVisible,
    isIOSPWA: false, // Kept for API compat; callers can remove
    isNative: false,
  };
}
