// Image optimization utility
// Routes Supabase storage images through the image-proxy edge function
// for enterprise-grade caching (1-year TTL vs Supabase's default 1-hour).
// Also provides a stable API for future CDN integration.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';

/**
 * Returns an optimized image URL.
 * - Supabase storage images are routed through the image-proxy edge function
 *   which adds `Cache-Control: public, max-age=31536000, immutable`.
 * - Other URLs pass through unchanged.
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  _width?: number,
  _height?: number,
  _resize?: 'cover' | 'contain' | 'fill',
): string {
  if (!url) return '';

  // Route Supabase storage public URLs through the image proxy for long caching
  if (url.includes('.supabase.co/storage/v1/object/public/') && SUPABASE_URL && PROJECT_ID) {
    return `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
}

/**
 * Returns a reduced quality tier based on the user's network connection.
 * Components can use this to decide whether to load thumbnails vs full images.
 */
export function getConnectionQuality(): 'high' | 'medium' | 'low' {
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (!conn) return 'high';

  // Save-Data header — user explicitly wants reduced data
  if (conn.saveData) return 'low';

  const effectiveType = conn.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'low';
  if (effectiveType === '3g') return 'medium';
  return 'high';
}
