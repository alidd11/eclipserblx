import { useState, useRef, useEffect, memo, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  blur?: boolean;
  priority?: boolean;
  onLoadComplete?: () => void;
  onLoadError?: () => void;
}

/**
 * Optimized image component with:
 * - Lazy loading (using Intersection Observer)
 * - Blur-up placeholder effect
 * - Error fallback handling
 * - Automatic loading="lazy" and decoding="async"
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  fallback,
  aspectRatio,
  objectFit = 'cover',
  blur = true,
  priority = false,
  className,
  onLoadComplete,
  onLoadError,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoadComplete?.();
  };

  const handleError = () => {
    setHasError(true);
    onLoadError?.();
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-muted',
          className
        )}
        style={{ aspectRatio }}
      >
        {fallback || (
          <span className="text-muted-foreground text-sm">Failed to load</span>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={imgRef as any}
      className={cn('relative overflow-hidden', className)}
      style={{ aspectRatio }}
    >
      {/* Placeholder/blur effect */}
      {blur && !isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            !isLoaded && blur && 'opacity-0',
            isLoaded && 'opacity-100',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'fill' && 'object-fill',
            objectFit === 'none' && 'object-none',
            objectFit === 'scale-down' && 'object-scale-down'
          )}
          {...props}
        />
      )}
    </div>
  );
});
