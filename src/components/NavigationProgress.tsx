import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigation } from 'react-router-dom';

/**
 * YouTube/GitHub-style thin progress bar shown during route transitions.
 * Pure CSS animation — no external dependencies.
 */
export function NavigationProgress() {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState<'idle' | 'loading' | 'complete'>('idle');
  const prevPathRef = useRef(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      // Route changed — start then quickly complete
      setProgress('loading');

      // Clear any pending timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Complete after a brief moment (simulates load finish)
      timeoutRef.current = setTimeout(() => {
        setProgress('complete');
        // Reset after animation finishes
        timeoutRef.current = setTimeout(() => setProgress('idle'), 300);
      }, 150);

      prevPathRef.current = pathname;
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname]);

  if (progress === 'idle') return null;

  return (
    <div
      className="nav-progress-bar"
      data-state={progress}
      aria-hidden="true"
    />
  );
}
