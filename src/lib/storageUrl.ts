import { supabase } from '@/integrations/supabase/client';

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Extracts the storage path from a stored value.
 * Handles both full public URLs and plain paths.
 */
export function extractPathFromUrl(storedValue: string, bucket: string): string {
  // If it's a full Supabase public URL, extract the path
  const marker = `/object/public/${bucket}/`;
  const idx = storedValue.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(storedValue.substring(idx + marker.length));
  }
  // Already a plain path
  return storedValue;
}

/**
 * Returns a signed URL for a stored attachment value.
 * Caches results to avoid redundant API calls.
 * Falls back to the original value on error.
 */
export async function getSignedUrl(
  storedValue: string,
  bucket: string,
  expiresIn = 3600
): Promise<string> {
  const path = extractPathFromUrl(storedValue, bucket);
  const cacheKey = `${bucket}:${path}`;

  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      console.warn('Failed to create signed URL, using original:', error?.message);
      return storedValue;
    }

    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: Date.now() + (expiresIn - 60) * 1000,
    });

    return data.signedUrl;
  } catch {
    return storedValue;
  }
}

/**
 * Batch-resolve multiple attachment URLs to signed URLs.
 * Returns a map from original stored value to signed URL.
 */
export async function getSignedUrls(
  items: Array<{ storedValue: string; bucket: string }>,
  expiresIn = 3600
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // Group by bucket
  const byBucket = new Map<string, Array<{ storedValue: string; path: string }>>();
  for (const item of items) {
    const path = extractPathFromUrl(item.storedValue, item.bucket);
    const cacheKey = `${item.bucket}:${path}`;
    const cached = signedUrlCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      result.set(item.storedValue, cached.url);
    } else {
      const list = byBucket.get(item.bucket) || [];
      list.push({ storedValue: item.storedValue, path });
      byBucket.set(item.bucket, list);
    }
  }

  // Batch per bucket
  for (const [bucket, paths] of byBucket) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(
          paths.map((p) => p.path),
          expiresIn
        );

      if (!error && data) {
        data.forEach((d, i) => {
          if (d.signedUrl) {
            const cacheKey = `${bucket}:${paths[i].path}`;
            signedUrlCache.set(cacheKey, {
              url: d.signedUrl,
              expiresAt: Date.now() + (expiresIn - 60) * 1000,
            });
            result.set(paths[i].storedValue, d.signedUrl);
          } else {
            result.set(paths[i].storedValue, paths[i].storedValue);
          }
        });
      } else {
        paths.forEach((p) => result.set(p.storedValue, p.storedValue));
      }
    } catch {
      paths.forEach((p) => result.set(p.storedValue, p.storedValue));
    }
  }

  return result;
}
