import { useEffect, useRef, useCallback, useState } from 'react';
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
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const fullPath = location.pathname + location.search;

    if (isNavigating.current) {
      isNavigating.current = false;
      return;
    }

    const stack = historyStack.current;
    const idx = currentIndex.current;

    if (idx < stack.length - 1) {
      historyStack.current = stack.slice(0, idx + 1);
    }

    if (historyStack.current[historyStack.current.length - 1] !== fullPath) {
      historyStack.current.push(fullPath);
    }
    currentIndex.current = historyStack.current.length - 1;
    forceUpdate(c => c + 1);
  }, [location.pathname, location.search]);

  const canGoBack = currentIndex.current > 0;
  const canGoForward = currentIndex.current < historyStack.current.length - 1;

  const goBack = useCallback(() => {
    if (currentIndex.current <= 0) return;
    isNavigating.current = true;
    currentIndex.current -= 1;
    forceUpdate(c => c + 1);
    navigate(historyStack.current[currentIndex.current]);
  }, [navigate]);

  const goForward = useCallback(() => {
    if (currentIndex.current >= historyStack.current.length - 1) return;
    isNavigating.current = true;
    currentIndex.current += 1;
    forceUpdate(c => c + 1);
    navigate(historyStack.current[currentIndex.current]);
  }, [navigate]);

  return { canGoBack, canGoForward, goBack, goForward };
}
