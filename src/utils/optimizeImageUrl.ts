/**
 * Appends Supabase image transform query params to storage URLs.
 * Falls back to the original URL for non-Supabase images.
 *
 * @param url - original public URL
 * @param width - desired display width in CSS pixels (will be doubled for retina)
 * @param height - optional desired display height
 * @param format - target format, defaults to webp
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  _width?: number,
  _height?: number,
  _format?: 'webp' | 'origin'
): string {
  if (!url) return '';
  // Return original URL directly — Supabase image transforms
  // are not available on this project's storage tier.
  return url;
}
