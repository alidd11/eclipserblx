import { forwardRef, ReactNode, useRef, useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

/**
 * CSS-powered scroll reveal using IntersectionObserver.
 * Avoids loading framer-motion on the critical path.
 */
export const ScrollReveal = forwardRef<HTMLDivElement, ScrollRevealProps>(function ScrollReveal(
  {
    children,
    className,
    delay = 0,
    direction = 'up',
    distance = 24,
    duration = 0.5,
    threshold = 0.15,
    once = true,
  },
  ref
) {
  const reducedMotion = useReducedMotion();
  const innerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Merge forwarded ref with inner ref
  const setRefs = (el: HTMLDivElement | null) => {
    (innerRef as any).current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as any).current = el;
  };

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const el = innerRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion, threshold, once]);

  if (reducedMotion) {
    return (
      <div ref={setRefs} className={className}>
        {children}
      </div>
    );
  }

  const offsets: Record<string, string> = {
    up: `0, ${distance}px`,
    down: `0, ${-distance}px`,
    left: `${distance}px, 0`,
    right: `${-distance}px, 0`,
    none: '0, 0',
  };

  return (
    <div
      ref={setRefs}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate3d(0, 0, 0)' : `translate3d(${offsets[direction]}, 0)`,
        transition: `opacity ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s, transform ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </div>
  );
});
