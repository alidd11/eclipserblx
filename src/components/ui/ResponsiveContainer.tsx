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

const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-2xl',      // 672px
  md: 'max-w-4xl',      // 896px
  lg: 'max-w-5xl',      // 1024px
  xl: 'max-w-6xl',      // 1152px
  '2xl': 'max-w-7xl',   // 1280px
  full: 'max-w-full',
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
          padded && 'px-4 sm:px-6 lg:px-8',
          className
        )}
      >
        {children}
      </Component>
    );
  }
);

ResponsiveContainer.displayName = 'ResponsiveContainer';
