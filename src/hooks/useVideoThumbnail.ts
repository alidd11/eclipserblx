import { useState, useEffect } from 'react';

export function useVideoThumbnail(videoUrl: string | null) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!videoUrl) {
      setThumbnail(null);
      return;
    }

    // Check if it's actually a video
    if (!/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(videoUrl)) {
      setThumbnail(null);
      return;
    }

    setIsLoading(true);
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    const handleLoadedData = () => {
      video.currentTime = 0.1; // Seek slightly past 0 for better frame capture
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setThumbnail(dataUrl);
        }
      } catch (e) {
        console.error('Failed to generate thumbnail:', e);
        setThumbnail(null);
      } finally {
        setIsLoading(false);
        video.remove();
      }
    };

    const handleError = () => {
      setThumbnail(null);
      setIsLoading(false);
      video.remove();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    video.src = videoUrl;
    video.load();

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.remove();
    };
  }, [videoUrl]);

  return { thumbnail, isLoading };
}
