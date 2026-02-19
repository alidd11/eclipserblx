import { useState, useEffect, useRef } from 'react';
import { getSignedUrls } from '@/lib/storageUrl';

/**
 * Hook to batch-resolve multiple attachment URLs to signed URLs.
 * Useful for chat message lists where many attachments need resolving at once.
 * Returns a map from the original stored value to the signed URL.
 */
export function useSignedUrls(
  attachments: Array<{ url: string; bucket: string }> | undefined
): Map<string, string> {
  const [urlMap, setUrlMap] = useState<Map<string, string>>(new Map());
  const prevKey = useRef('');

  useEffect(() => {
    if (!attachments || attachments.length === 0) {
      if (urlMap.size > 0) setUrlMap(new Map());
      return;
    }

    // Create a stable key to avoid re-resolving the same set
    const key = attachments.map((a) => a.url).join('|');
    if (key === prevKey.current) return;
    prevKey.current = key;

    let cancelled = false;

    getSignedUrls(
      attachments.map((a) => ({ storedValue: a.url, bucket: a.bucket }))
    ).then((map) => {
      if (!cancelled) setUrlMap(map);
    });

    return () => {
      cancelled = true;
    };
  }, [attachments]);

  return urlMap;
}
