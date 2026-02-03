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
        <defs>
          {/* Mask for crescent cutout */}
          <mask id="eclipse-crescent-mask">
            <circle cx="50" cy="50" r="45" fill="white" />
            <circle cx="72" cy="50" r="36" fill="black" />
          </mask>
        </defs>
        
        {/* Main eclipse shape with crescent cutout */}
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill="hsl(var(--primary))"
          mask="url(#eclipse-crescent-mask)"
        />
      </svg>
    </div>
  );
}
