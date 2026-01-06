import { cn } from '@/lib/utils';

interface EclipseLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EclipseLogo({ className, size = 'md' }: EclipseLogoProps) {
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  return (
    <div 
      className={cn(
        'relative rounded-full overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {/* Eclipse moon effect */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        fill="none"
      >
        {/* Outer glow */}
        <defs>
          <radialGradient id="eclipseGlow" cx="70%" cy="50%" r="60%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moonGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="hsl(240 3% 15%)" />
            <stop offset="100%" stopColor="hsl(240 3% 5%)" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background glow */}
        <circle cx="50" cy="50" r="48" fill="url(#eclipseGlow)" />
        
        {/* Moon body */}
        <circle 
          cx="50" 
          cy="50" 
          r="40" 
          fill="url(#moonGradient)"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          strokeOpacity="0.5"
          filter="url(#glow)"
        />
        
        {/* Corona effect on the right edge */}
        <path 
          d="M 85 50 A 35 35 0 0 1 50 85 A 45 45 0 0 0 85 50" 
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeOpacity="0.8"
          filter="url(#glow)"
        />
        
        {/* Bright edge highlight */}
        <ellipse
          cx="82"
          cy="50"
          rx="5"
          ry="35"
          fill="hsl(var(--primary))"
          fillOpacity="0.3"
        />
      </svg>
    </div>
  );
}
