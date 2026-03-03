import { useCallback, useEffect, useRef } from 'react';
import { hapticTap } from '@/lib/haptics';

interface UseEdgeSwipeOptions {
  /** Pixels from left edge to trigger (default 30) */
  edgeZone?: number;
  /** Minimum horizontal distance to count as swipe (default 50) */
  minDistance?: number;
  /** Only enable on mobile viewports (default true) */
  mobileOnly?: boolean;
  /** Called when a valid edge-swipe-right is detected */
  onSwipe: () => void;
  /** Skip swipe detection when true (e.g. drawer already open) */
  disabled?: boolean;
}

/**
 * Reusable hook for left-edge swipe-to-open gestures (mobile drawer pattern).
 */
export function useEdgeSwipe({
  edgeZone = 30,
  minDistance = 50,
  mobileOnly = true,
  onSwipe,
  disabled = false,
}: UseEdgeSwipeOptions) {
  const touchRef = useRef<{ x: number; y: number; isEdge: boolean } | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;

      const target = e.target as Element | null;
      if (target?.closest?.('[data-gesture-exempt="true"]')) return;

      const touch = e.touches[0];
      touchRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        isEdge: touch.clientX <= edgeZone,
      };
    },
    [disabled, edgeZone],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchRef.current?.isEdge) {
        touchRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchRef.current.y);

      if (deltaX > minDistance && deltaY < deltaX) {
        hapticTap();
        onSwipe();
      }

      touchRef.current = null;
    },
    [minDistance, onSwipe],
  );

  useEffect(() => {
    if (mobileOnly && !window.matchMedia('(max-width: 767px)').matches) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, mobileOnly]);
}
