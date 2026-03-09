import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * CSS-only page entrance animation.
 * Replaces framer-motion to keep it off the critical path.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={`animate-page-in ${className ?? ''}`}>
      {children}
    </div>
  );
}
