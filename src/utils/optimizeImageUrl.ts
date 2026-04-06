// Image optimization utility
// /render/image/ endpoint is unavailable on this project.
// This utility prepares URLs for future CDN integration and provides
// connection-aware hints that can be consumed by <img> components.

/**
 * Returns the image URL. Currently passes through unchanged since
 * server-side transforms are unavailable, but provides a stable API
 * for when a CDN (Cloudflare Images, imgproxy, etc.) is connected.
 *
 * @param url - original public URL
 * @param width - desired display width in CSS pixels
 * @param height - optional desired display height
 * @param resize - resize mode
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  _width?: number,
  _height?: number,
  _resize?: 'cover' | 'contain' | 'fill',
): string {
  if (!url) return '';
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
