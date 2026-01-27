import { cn } from '@/lib/utils';
import { forwardRef, ReactNode } from 'react';

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
}

export const SectionWrapper = forwardRef<HTMLElement, SectionWrapperProps>(function SectionWrapper(
  { children, className, as: Component = 'section' },
  ref,
) {
  return (
    <Component ref={ref as any} className={cn('pb-8', className)}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </Component>
  );
});

SectionWrapper.displayName = 'SectionWrapper';
