import { cn } from '@/lib/utils';

interface EclipseLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function EclipseLogo({ className, size = 'md' }: EclipseLogoProps) {
  const sizeClasses = {
    xs: 'h-5 w-5',
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-14 w-14',
  };

  return (
    <div 
      className={cn(
        'relative flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Isometric cube - 3 visible faces */}
        {/* Top face - lightest */}
        <polygon 
          points="50,15 85,35 50,55 15,35" 
          fill="hsl(var(--primary))"
          opacity="1"
        />
        {/* Left face - medium */}
        <polygon 
          points="15,35 50,55 50,90 15,70" 
          fill="hsl(var(--primary))"
          opacity="0.7"
        />
        {/* Right face - darkest */}
        <polygon 
          points="50,55 85,35 85,70 50,90" 
          fill="hsl(var(--primary))"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}
