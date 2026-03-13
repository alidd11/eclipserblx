// Image optimization utility — currently bypassed (render endpoint unavailable)

/**
 * Appends Supabase image transform query params to storage URLs.
 * Falls back to the original URL for non-Supabase images.
 * Automatically reduces quality/size on slow connections.
 *
 * @param url - original public URL
 * @param width - desired display width in CSS pixels (will be doubled for retina)
 * @param height - optional desired display height
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  _width?: number,
  _height?: number,
  _resize?: 'cover' | 'contain' | 'fill',
): string {
  if (!url) return '';

  // Image transformation via /render/image/ is not available on this project.
  // Return the original public URL directly — images are served unoptimized
  // but reliably from the /object/public/ endpoint.
  return url;
}
