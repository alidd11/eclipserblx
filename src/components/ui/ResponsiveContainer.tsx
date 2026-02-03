import { cn } from '@/lib/utils';
import { forwardRef, ReactNode } from 'react';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  size?: ContainerSize;
  as?: 'div' | 'section' | 'article' | 'main';
  /** Add responsive horizontal padding */
  padded?: boolean;
}

// Edge-to-edge layout - no max-width constraints
const sizeClasses: Record<ContainerSize, string> = {
  sm: 'w-full',
  md: 'w-full',
  lg: 'w-full',
  xl: 'w-full',
  '2xl': 'w-full',
  full: 'w-full',
};

/**
 * Responsive container with consistent max-widths and padding
 * Ensures content scales properly across all screen sizes
 */
export const ResponsiveContainer = forwardRef<HTMLElement, ResponsiveContainerProps>(
  function ResponsiveContainer(
    { children, className, size = '2xl', as: Component = 'div', padded = true },
    ref
  ) {
    return (
      <Component
        ref={ref as any}
        className={cn(
          'mx-auto w-full',
          sizeClasses[size],
          className
        )}
      >
        {children}
      </Component>
    );
  }
);

ResponsiveContainer.displayName = 'ResponsiveContainer';
