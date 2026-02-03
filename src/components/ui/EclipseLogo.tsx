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

  const uniqueId = `cube-${Math.random().toString(36).substr(2, 9)}`;

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
          {/* Top face gradient - brightest */}
          <linearGradient id={`${uniqueId}-top`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(265 100% 75%)" />
            <stop offset="100%" stopColor="hsl(280 90% 65%)" />
          </linearGradient>
          
          {/* Left face gradient - medium */}
          <linearGradient id={`${uniqueId}-left`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(270 80% 55%)" />
            <stop offset="100%" stopColor="hsl(275 70% 40%)" />
          </linearGradient>
          
          {/* Right face gradient - darkest */}
          <linearGradient id={`${uniqueId}-right`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(275 65% 45%)" />
            <stop offset="100%" stopColor="hsl(280 60% 30%)" />
          </linearGradient>

          {/* Subtle glow */}
          <filter id={`${uniqueId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Subtle shadow */}
        <ellipse 
          cx="50" 
          cy="92" 
          rx="25" 
          ry="6" 
          fill="hsl(var(--primary))"
          opacity="0.15"
        />

        <g filter={`url(#${uniqueId}-glow)`}>
          {/* Top face */}
          <polygon 
            points="50,12 88,34 50,56 12,34" 
            fill={`url(#${uniqueId}-top)`}
          />
          
          {/* Left face */}
          <polygon 
            points="12,34 50,56 50,88 12,66" 
            fill={`url(#${uniqueId}-left)`}
          />
          
          {/* Right face */}
          <polygon 
            points="50,56 88,34 88,66 50,88" 
            fill={`url(#${uniqueId}-right)`}
          />

          {/* Edge highlights */}
          <polyline 
            points="12,34 50,56 88,34" 
            stroke="hsl(265 100% 85%)"
            strokeWidth="1"
            strokeLinejoin="round"
            fill="none"
            opacity="0.6"
          />
          <line 
            x1="50" y1="56" 
            x2="50" y2="88" 
            stroke="hsl(280 80% 50%)"
            strokeWidth="1"
            opacity="0.4"
          />

          {/* Top face inner detail - small cube impression */}
          <polygon 
            points="50,24 66,34 50,44 34,34" 
            fill="hsl(265 100% 80%)"
            opacity="0.3"
          />
        </g>
      </svg>
    </div>
  );
}
