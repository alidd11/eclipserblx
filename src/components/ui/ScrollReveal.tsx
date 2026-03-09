import { forwardRef, ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
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

const getVariants = (direction: string, distance: number): Variants => {
  const offsets: Record<string, { x?: number; y?: number }> = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  const offset = offsets[direction];
  const translateX = offset.x ?? 0;
  const translateY = offset.y ?? 0;

  return {
    hidden: {
      opacity: 0,
      transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
    },
  };
};

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

  // On mobile / reduced-motion: render children immediately without animation overhead
  if (reducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const variants = getVariants(direction, distance);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});
