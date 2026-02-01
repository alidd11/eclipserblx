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

  // Generate unique IDs for this instance to avoid conflicts when multiple logos are rendered
  const uniqueId = `eclipse-${Math.random().toString(36).substr(2, 9)}`;

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
          {/* Refined corona gradient - more sophisticated color transition */}
          <linearGradient id={`${uniqueId}-corona`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(265 100% 75%)" />
            <stop offset="40%" stopColor="hsl(280 100% 65%)" />
            <stop offset="100%" stopColor="hsl(200 100% 60%)" />
          </linearGradient>
          
          {/* Inner moon gradient - deep space feel */}
          <radialGradient id={`${uniqueId}-moon`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="hsl(240 15% 18%)" />
            <stop offset="60%" stopColor="hsl(240 20% 8%)" />
            <stop offset="100%" stopColor="hsl(240 25% 4%)" />
          </radialGradient>
          
          {/* Outer glow gradient */}
          <radialGradient id={`${uniqueId}-glow`} cx="75%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(265 100% 70%)" stopOpacity="0.6" />
            <stop offset="60%" stopColor="hsl(280 100% 60%)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          
          {/* Refined glow filter */}
          <filter id={`${uniqueId}-blur`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Clip path for the eclipse crescent */}
          <clipPath id={`${uniqueId}-clip`}>
            <circle cx="50" cy="50" r="38" />
          </clipPath>
        </defs>
        
        {/* Outer ambient glow */}
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill={`url(#${uniqueId}-glow)`}
        />
        
        {/* Corona ring - the defining feature */}
        <circle 
          cx="50" 
          cy="50" 
          r="40" 
          fill="none"
          stroke={`url(#${uniqueId}-corona)`}
          strokeWidth="3"
          filter={`url(#${uniqueId}-blur)`}
        />
        
        {/* Moon body - dark silhouette */}
        <circle 
          cx="50" 
          cy="50" 
          r="36" 
          fill={`url(#${uniqueId}-moon)`}
        />
        
        {/* Subtle inner shadow to add depth */}
        <circle 
          cx="50" 
          cy="50" 
          r="36" 
          fill="none"
          stroke="hsl(240 20% 10%)"
          strokeWidth="2"
          strokeOpacity="0.5"
        />
        
        {/* Corona burst - elegant light bleeding through */}
        <g clipPath={`url(#${uniqueId}-clip)`}>
          <ellipse
            cx="90"
            cy="50"
            rx="15"
            ry="45"
            fill={`url(#${uniqueId}-corona)`}
            fillOpacity="0.15"
          />
        </g>
        
        {/* Bright corona edge - refined crescent highlight */}
        <path 
          d="M 88 50 A 38 38 0 0 1 50 88" 
          fill="none"
          stroke={`url(#${uniqueId}-corona)`}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter={`url(#${uniqueId}-blur)`}
          opacity="0.9"
        />
        
        {/* Secondary highlight arc */}
        <path 
          d="M 50 12 A 38 38 0 0 1 88 50" 
          fill="none"
          stroke={`url(#${uniqueId}-corona)`}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        
        {/* Subtle surface texture dots - adds sophistication */}
        <circle cx="35" cy="40" r="2" fill="hsl(240 15% 12%)" opacity="0.5" />
        <circle cx="55" cy="60" r="1.5" fill="hsl(240 15% 12%)" opacity="0.4" />
        <circle cx="40" cy="55" r="1" fill="hsl(240 15% 12%)" opacity="0.3" />
      </svg>
    </div>
  );
}
