import { useEffect } from 'react';

/**
 * Injects <link rel="preload" as="image"> into <head> for the given URLs.
 * Limited to first 6 to avoid bandwidth waste.
 */
export function usePreloadImages(urls: (string | undefined | null)[]) {
  useEffect(() => {
    const filtered = urls.filter(Boolean).slice(0, 6) as string[];
    const links: HTMLLinkElement[] = [];

    for (const url of filtered) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
      links.push(link);
    }

    return () => {
      links.forEach((l) => l.remove());
    };
  }, [urls.join(',')]);
}
