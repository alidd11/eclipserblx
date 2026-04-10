import { optimizeImageUrl } from '@/utils/optimizeImageUrl';

/**
 * Normalizes a potential media URL value.
 */
export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  let normalized = url.trim();
  if (normalized.length === 0) return null;
  // Canonicalize encoded path separators for consistent dedup
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // keep as-is if decoding fails
  }
  return normalized;
}

/**
 * Filters media arrays to only valid, non-empty URLs.
 */
export function getValidMediaUrls(media: string[] | null | undefined): string[] {
  if (!media || media.length === 0) return [];
  return media
    .map(normalizeMediaUrl)
    .filter((item): item is string => Boolean(item));
}

/**
 * Checks if a URL is a video file (mp4, webm, mov, avi, mkv).
 */
export function isVideoUrl(url: string | null | undefined): boolean {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return false;
  return /\.(mp4|webm|mov|avi|mkv)(?:$|[?#])/i.test(normalized);
}

/**
 * Checks if a URL is a GIF.
 */
export function isGifUrl(url: string | null | undefined): boolean {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return false;
  return /\.gif(?:$|[?#])/i.test(normalized);
}

/**
 * Checks if a URL is a static image (not video).
 */
export function isStaticImageUrl(url: string | null | undefined): boolean {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return false;
  return !isVideoUrl(normalized);
}

/**
 * Gets the first static image URL from a media array (skips videos).
 * Returns an optimized URL with long-cache headers via the image proxy.
 */
export function getFirstImageUrl(media: string[] | null | undefined, width?: number): string | null {
  const validMedia = getValidMediaUrls(media);
  const firstImage = validMedia.find((item) => !isVideoUrl(item));
  if (!firstImage) return null;
  return optimizeImageUrl(firstImage, width);
}

/**
 * Sorts media array to prioritize videos first, then images.
 */
export function sortMediaVideosFirst(media: string[] | null | undefined): string[] {
  const validMedia = getValidMediaUrls(media);
  const videos = validMedia.filter(isVideoUrl);
  const images = validMedia.filter((item) => !isVideoUrl(item));
  return [...videos, ...images];
}

/**
 * Gets the first media item prioritizing video, or first valid media if no video.
 */
export function getFirstMediaPrioritizeVideo(media: string[] | null | undefined, width?: number): string | null {
  const validMedia = getValidMediaUrls(media);
  if (validMedia.length === 0) return null;

  const firstVideo = validMedia.find(isVideoUrl);
  return firstVideo ?? optimizeImageUrl(validMedia[0], width);
}

/**
 * Returns media candidates for product cards with image-first priority and video fallback.
 * Static images are routed through the image proxy for long-term edge caching.
 */
export function getCardMediaChain(
  media: string[] | null | undefined,
  fallbackMedia?: string | null,
  width?: number,
): string[] {
  const combined = [
    ...getValidMediaUrls(media),
    ...getValidMediaUrls(fallbackMedia ? [fallbackMedia] : null),
  ];

  const unique = Array.from(new Set(combined));
  const images = unique.filter((item) => !isVideoUrl(item)).map((url) => optimizeImageUrl(url, width));
  const videos = unique.filter(isVideoUrl);

  return [...images, ...videos];
}
