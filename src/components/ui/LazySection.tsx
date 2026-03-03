import { ReactNode, useRef, useState, useEffect } from 'react';

interface LazySectionProps {
  children: ReactNode;
  className?: string;
  /** Minimum height placeholder before loading */
  minHeight?: string;
  /** Root margin for intersection observer (load before visible) */
  rootMargin?: string;
}

/**
 * Defers rendering of children until the section is near the viewport.
 * Reduces initial JS work and improves TTI on mobile.
 */
export function LazySection({ 
  children, 
  className, 
  minHeight = '200px',
  rootMargin = '200px'
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
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className} style={isVisible ? undefined : { minHeight }}>
      {isVisible ? children : null}
    </div>
  );
}
