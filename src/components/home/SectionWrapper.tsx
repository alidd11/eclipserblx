import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
}

export function SectionWrapper({ children, className, as: Component = 'section' }: SectionWrapperProps) {
  return (
    <Component className={cn('pb-8', className)}>
      <div className="mx-auto w-full max-w-4xl px-4">
        {children}
      </div>
    </Component>
  );
}
