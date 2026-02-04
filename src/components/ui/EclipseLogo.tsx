import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import eclipseLogo from '@/assets/eclipse-logo.png';

interface EclipseLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Removes near-white matte/background pixels at render time.
   * Useful when a PNG has a baked-in white background or white halo.
   */
  removeWhiteBackground?: boolean;
}

const LOGO_CACHE_BUST = '2026-02-04-01';

function withCacheBust(src: string, v: string) {
  if (typeof window === 'undefined') return src;
  try {
    const url = new URL(src, window.location.href);
    url.searchParams.set('v', v);
    return url.toString();
  } catch {
    return src;
  }
}

export function EclipseLogo({ className, size = 'md', removeWhiteBackground }: EclipseLogoProps) {
  const sizeClasses = {
    xs: 'h-5 w-5',
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-14 w-14',
  };

  const sizePx = {
    xs: 20,
    sm: 28,
    md: 32,
    lg: 40,
    xl: 56,
  };

  const rawSrc = useMemo(() => withCacheBust(eclipseLogo, LOGO_CACHE_BUST), []);
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!removeWhiteBackground) {
      setProcessedSrc(null);
      return;
    }

    let cancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawSrc;

    img.onload = () => {
      try {
        const target = Math.max(64, Math.round((sizePx[size] ?? 32) * (window.devicePixelRatio || 1)));
        const canvas = document.createElement('canvas');
        canvas.width = target;
        canvas.height = target;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.clearRect(0, 0, target, target);
        ctx.drawImage(img, 0, 0, target, target);

        const imageData = ctx.getImageData(0, 0, target, target);
        const d = imageData.data;

        // Remove near-white pixels (common matte/background). Keep colored highlights intact.
        // Criteria: very bright AND low chroma (channels close to each other).
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const a = d[i + 3];
          if (a === 0) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const chroma = max - min;

          if (max >= 245 && chroma <= 10) {
            d[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);

        const out = canvas.toDataURL('image/png');
        if (!cancelled) setProcessedSrc(out);
      } catch {
        // If canvas processing fails, fall back to the raw image.
        if (!cancelled) setProcessedSrc(null);
      }
    };

    img.onerror = () => {
      if (!cancelled) setProcessedSrc(null);
    };

    return () => {
      cancelled = true;
    };
  }, [removeWhiteBackground, rawSrc, size]);

  return (
    <div 
      className={cn(
        'relative flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      <img 
        src={processedSrc ?? rawSrc}
        alt="Eclipse Logo" 
        className="w-full h-full object-contain"
      />
    </div>
  );
}
