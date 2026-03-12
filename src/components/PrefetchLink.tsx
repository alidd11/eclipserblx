import { forwardRef, useCallback, useRef, ComponentPropsWithRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface PrefetchLinkProps extends LinkProps {
  /** Query keys to prefetch on hover (optional — also warms the browser cache) */
  prefetchKeys?: string[][];
  /** Prefetch functions to call on hover */
  prefetchFn?: () => void;
}

/**
 * Drop-in replacement for React Router's <Link> that starts
 * prefetching data when the user hovers or focuses the link.
 * Makes navigation feel instant — like a traditional website.
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  function PrefetchLink({ prefetchKeys, prefetchFn, onMouseEnter, onFocus, ...props }, ref) {
    const hasPrefetched = useRef(false);

    const triggerPrefetch = useCallback(() => {
      if (hasPrefetched.current) return;
      hasPrefetched.current = true;

      // Call custom prefetch function
      prefetchFn?.();

      // Prefetch the page chunk via dynamic import hint
      // The browser will cache this for when the user actually navigates
      if (typeof props.to === 'string') {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = props.to;
        // Don't add duplicate prefetch links
        if (!document.querySelector(`link[rel="prefetch"][href="${props.to}"]`)) {
          document.head.appendChild(link);
        }
      }
    }, [prefetchFn, props.to]);

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
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
