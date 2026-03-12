import { getNetworkQuality } from '@/hooks/useNetworkQuality';

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

  // Network-aware multiplier and quality
  const quality = getNetworkQuality();
  const multiplier = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2;
  const imgQuality = quality === 'low' ? 60 : quality === 'medium' ? 70 : 80;

  const params = new URLSearchParams();
  params.set('width', String(Math.round(width * multiplier)));
  if (height) params.set('height', String(Math.round(height * multiplier)));
  // Don't set format — Supabase auto-negotiates WebP via Accept header
  params.set('quality', String(imgQuality));
  params.set('resize', resize);

  const separator = transformed.includes('?') ? '&' : '?';
  return `${transformed}${separator}${params.toString()}`;
}
