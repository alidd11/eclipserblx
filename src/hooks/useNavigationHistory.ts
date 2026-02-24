import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Tracks navigation history within the app to enable
 * browser-like forward/back buttons.
 */
export function useNavigationHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const historyStack = useRef<string[]>([]);
  const currentIndex = useRef(-1);
  const isNavigating = useRef(false);

  useEffect(() => {
    const fullPath = location.pathname + location.search;

    // Skip if we're navigating programmatically (back/forward)
    if (isNavigating.current) {
      isNavigating.current = false;
      return;
    }

    // If we navigated to a new page (not back/forward), truncate forward history
    const stack = historyStack.current;
    const idx = currentIndex.current;

    if (idx < stack.length - 1) {
      // We went back and then navigated somewhere new — discard forward entries
      historyStack.current = stack.slice(0, idx + 1);
    }

    // Don't add duplicate consecutive entries
    if (historyStack.current[historyStack.current.length - 1] !== fullPath) {
      historyStack.current.push(fullPath);
    }
    currentIndex.current = historyStack.current.length - 1;
  }, [location.pathname, location.search]);

  const canGoBack = currentIndex.current > 0;
  const canGoForward = currentIndex.current < historyStack.current.length - 1;

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    isNavigating.current = true;
    currentIndex.current -= 1;
    navigate(historyStack.current[currentIndex.current]);
  }, [canGoBack, navigate]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    isNavigating.current = true;
    currentIndex.current += 1;
    navigate(historyStack.current[currentIndex.current]);
  }, [canGoForward, navigate]);

  return { canGoBack, canGoForward, goBack, goForward };
}
