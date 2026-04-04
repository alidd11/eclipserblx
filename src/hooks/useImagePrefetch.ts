import { useEffect, useRef } from 'react';
import { prefetchImage } from '@/utils/imageCache';

/**
 * Observes a container element and prefetches image URLs
 * when the container is within 400px of the viewport.
 */
export function useImagePrefetch(urls: string[]) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current || !urls.length || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !prefetched.current) {
          prefetched.current = true;
          urls.forEach((url) => prefetchImage(url));
          observer.disconnect();
        }
      },
      { rootMargin: '400px', threshold: 0.01 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [urls]);

  return sentinelRef;
}
