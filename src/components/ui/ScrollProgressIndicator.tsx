/**
 * CSS-only scroll progress indicator.
 * Uses scroll-driven animations (with JS fallback) to avoid loading framer-motion.
 */
import { useEffect, useRef } from 'react';

export function ScrollProgressIndicator() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    // Use scroll-driven animation API if available (Chrome 115+)
    if ('animate' in bar && 'ScrollTimeline' in window) {
      try {
        const timeline = new (window as any).ScrollTimeline({ source: document.scrollingElement });
        bar.animate(
          [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
          { timeline, fill: 'both' } as any
        );
        return;
      } catch { /* fallback below */ }
    }

    // JS fallback for browsers without ScrollTimeline
    const onScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      bar.style.transform = `scaleX(${progress})`;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 right-0 h-1 z-[100] origin-left"
      style={{
        transform: 'scaleX(0)',
        background: 'hsl(var(--foreground) / 0.15)',
      }}
    />
  );
}
