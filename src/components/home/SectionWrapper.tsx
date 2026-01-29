import { cn } from '@/lib/utils';
import { forwardRef, ReactNode } from 'react';

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  /** Use tighter padding on mobile */
  compact?: boolean;
}

export const SectionWrapper = forwardRef<HTMLElement, SectionWrapperProps>(function SectionWrapper(
  { children, className, as: Component = 'section', compact = false },
  ref,
) {
  return (
    <Component 
      ref={ref as any} 
      className={cn(
        compact ? 'pb-4 sm:pb-6 lg:pb-8' : 'pb-6 sm:pb-8', 
        className
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-3 xs:px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </Component>
  );
});

SectionWrapper.displayName = 'SectionWrapper';
