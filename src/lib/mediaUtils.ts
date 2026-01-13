/**
 * Checks if a URL is a video file
 */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
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
 * Gets the first media item prioritizing video, or first image if no video
 */
export function getFirstMediaPrioritizeVideo(media: string[] | null | undefined): string | null {
  if (!media || media.length === 0) return null;
  
  // Find first video
  const firstVideo = media.find(isVideoUrl);
  if (firstVideo) return firstVideo;
  
  // Otherwise return first image
  return media[0];
}
