import { useState, useEffect } from 'react';
import { getSignedUrl } from '@/lib/storageUrl';

/**
 * Hook to resolve a stored attachment URL/path into a signed URL.
 * Returns null while loading, then the signed URL.
 */
export function useSignedUrl(
  storedValue: string | null | undefined,
  bucket: string
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storedValue) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    getSignedUrl(storedValue, bucket).then((signed) => {
      if (!cancelled) setUrl(signed);
    });

    return () => {
      cancelled = true;
    };
  }, [storedValue, bucket]);

  return url;
}
