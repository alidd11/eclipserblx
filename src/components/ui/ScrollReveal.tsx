import { forwardRef, ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds */
  delay?: number;
  /** Animation direction */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance in pixels */
  distance?: number;
  /** Duration in seconds */
  duration?: number;
  /** How much of the element should be visible before animating (0–1) */
  threshold?: number;
  /** Whether to animate only once */
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

  return {
    hidden: {
      opacity: 0,
      ...offsets[direction],
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
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
