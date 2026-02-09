import { forwardRef, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

interface BackgroundVideoProps {
  src: string;
  className?: string;
  containerClassName?: string;
}

/**
 * BackgroundVideo - A non-interactive, decorative video component
 * 
 * This component is designed for product cards, featured sections, and other
 * contexts where videos should be purely decorative and not clickable.
 * 
 * Features:
 * - pointer-events-none prevents all click/touch interactions
 * - Transparent overlay blocks native video controls on mobile
 * - disablePictureInPicture and disableRemotePlayback prevent browser UI
 * - CSS class 'background-video' hides webkit media controls via global CSS
 */
export const BackgroundVideo = forwardRef<HTMLVideoElement, BackgroundVideoProps>(
  function BackgroundVideo({ src, className, containerClassName }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Forward the ref so parent components can control play/pause
    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    return (
      <div className={cn("relative", containerClassName)}>
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          // @ts-ignore - disableRemotePlayback is valid but not in React types
          disableRemotePlayback
          className={cn(
            "background-video pointer-events-none",
            className
          )}
        />
        {/* Invisible overlay to intercept any touch/click events on mobile */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true" />
      </div>
    );
  }
);

BackgroundVideo.displayName = 'BackgroundVideo';
