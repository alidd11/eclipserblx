/**
 * Checks if a URL is a video file (mp4, webm, etc.)
 */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
}

/**
 * Checks if a URL is a GIF
 */
export function isGifUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.gif(\?|$)/i.test(url);
}

/**
 * Checks if a URL is a static image (not video, not GIF)
 */
export function isStaticImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return !isVideoUrl(url);
}

/**
 * Gets the first static image URL from a media array (skips videos).
 * Use this in components that only support <img> tags and can't play videos.
 * GIFs are treated as images since <img> handles them fine.
 */
export function getFirstImageUrl(media: string[] | null | undefined): string | null {
  if (!media || media.length === 0) return null;
  
  // Find first non-video item (images and GIFs both work in <img> tags)
  const firstImage = media.find(item => !isVideoUrl(item));
  if (firstImage) return firstImage;
  
  // If all items are videos, return null (caller should handle with a video player or fallback)
  return null;
}

/**
 * Sorts media array to prioritize videos first, then images
 * Returns a new array with videos at the beginning
 */
export function sortMediaVideosFirst(media: string[] | null | undefined): string[] {
  if (!media || media.length === 0) return [];
  
  const videos: string[] = [];
  const images: string[] = [];
  
  for (const item of media) {
    if (isVideoUrl(item)) {
      videos.push(item);
    } else {
      images.push(item);
    }
  }
  
  return [...videos, ...images];
}

/**
 * Gets the first media item prioritizing video, or first image if no video.
 * Use this in components that CAN display both videos and images (e.g. ProductCard).
 */
export function getFirstMediaPrioritizeVideo(media: string[] | null | undefined): string | null {
  if (!media || media.length === 0) return null;
  
  // Find first video
  const firstVideo = media.find(isVideoUrl);
  if (firstVideo) return firstVideo;
  
  // Otherwise return first image/gif
  return media[0];
}
