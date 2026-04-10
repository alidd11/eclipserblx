import { ReactNode, useRef, useState, useEffect } from 'react';

interface LazySectionProps {
  children: ReactNode;
  className?: string;
  /** Minimum height placeholder before loading */
  minHeight?: string;
  /** Root margin for intersection observer (load before visible) */
  rootMargin?: string;
  /** Max time (ms) to wait before force-rendering, prevents cascading blank pages */
  timeoutMs?: number;
}

/**
 * Defers rendering of children until the section is near the viewport.
 * Includes a timeout fallback to prevent cascading blank pages when
 * above-the-fold content collapses (e.g. failed data fetches).
 */
export function LazySection({ 
  children, 
  className, 
  minHeight = '200px',
  rootMargin = '200px',
  timeoutMs = 3000,
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver not supported, render immediately
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);

    // Timeout fallback: if content above collapses (empty queries),
    // the section may never intersect. Force-render after timeout.
    const timer = setTimeout(() => {
      setIsVisible(true);
      observer.disconnect();
    }, timeoutMs);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [rootMargin, timeoutMs]);

  return (
    <div ref={ref} className={className} style={isVisible ? undefined : { minHeight }}>
      {isVisible ? children : null}
    </div>
  );
}
