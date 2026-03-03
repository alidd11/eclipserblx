/**
 * Appends Supabase image transform query params to storage URLs.
 * Falls back to the original URL for non-Supabase images.
 *
 * @param url - original public URL
 * @param width - desired display width in CSS pixels (will be doubled for retina)
 * @param height - optional desired display height
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  width: number,
  height?: number,
  resize: 'cover' | 'contain' | 'fill' = 'cover',
): string {
  if (!url) return '';

  // Only transform Supabase storage URLs
  if (!url.includes('.supabase.co/storage/v1/object/public/')) return url;

  // Use /render/image/ endpoint for transforms
  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const params = new URLSearchParams();
  // 2x for retina displays
  params.set('width', String(width * 2));
  if (height) params.set('height', String(height * 2));
  // Don't set format — Supabase auto-negotiates WebP via Accept header
  params.set('quality', '80');
  params.set('resize', resize);

  const separator = transformed.includes('?') ? '&' : '?';
  return `${transformed}${separator}${params.toString()}`;
}
