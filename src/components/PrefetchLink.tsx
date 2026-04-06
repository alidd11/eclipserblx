import { forwardRef, useCallback, useRef, useEffect } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { usePrefetchRoute } from '@/hooks/usePrefetchRoute';

interface PrefetchLinkProps extends LinkProps {
  /** Query keys to prefetch on hover (optional — also warms the browser cache) */
  prefetchKeys?: string[][];
  /** Prefetch functions to call on hover */
  prefetchFn?: () => void;
  /** Auto-prefetch route data based on the `to` path (default: true) */
  autoRoutePrefetch?: boolean;
}

/**
 * Drop-in replacement for React Router's <Link> that starts
 * prefetching data when the user hovers, focuses, OR scrolls the link
 * into the viewport (critical for mobile where there's no hover).
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  function PrefetchLink({ prefetchKeys, prefetchFn, autoRoutePrefetch = true, onMouseEnter, onFocus, ...props }, ref) {
    const { prefetchForPath } = usePrefetchRoute();
    const hasPrefetched = useRef(false);
    const internalRef = useRef<HTMLAnchorElement | null>(null);

    const setRef = useCallback(
      (node: HTMLAnchorElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLAnchorElement | null>).current = node;
      },
      [ref]
    );

    const triggerPrefetch = useCallback(() => {
      if (hasPrefetched.current) return;
      hasPrefetched.current = true;

      // Call custom prefetch function
      prefetchFn?.();

      // Prefetch the page chunk via dynamic import hint
      if (typeof props.to === 'string') {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = props.to;
        if (!document.querySelector(`link[rel="prefetch"][href="${props.to}"]`)) {
          document.head.appendChild(link);
        }
      }
    }, [prefetchFn, props.to]);

    // Viewport-based prefetching via IntersectionObserver (mobile-first)
    useEffect(() => {
      const el = internalRef.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            triggerPrefetch();
            observer.disconnect();
          }
        },
        { rootMargin: '200px', threshold: 0.01 }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [triggerPrefetch]);

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        triggerPrefetch();
        onMouseEnter?.(e);
      },
      [triggerPrefetch, onMouseEnter]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        triggerPrefetch();
        onFocus?.(e);
      },
      [triggerPrefetch, onFocus]
    );

    return (
      <Link
        ref={setRef}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
