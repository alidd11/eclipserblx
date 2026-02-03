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

  const uniqueId = `blocks-${Math.random().toString(36).substr(2, 9)}`;

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
          {/* Purple gradients for main blocks */}
          <linearGradient id={`${uniqueId}-top1`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(265 100% 75%)" />
            <stop offset="100%" stopColor="hsl(280 90% 65%)" />
          </linearGradient>
          <linearGradient id={`${uniqueId}-left1`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(270 80% 55%)" />
            <stop offset="100%" stopColor="hsl(275 70% 40%)" />
          </linearGradient>
          <linearGradient id={`${uniqueId}-right1`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(275 65% 45%)" />
            <stop offset="100%" stopColor="hsl(280 60% 30%)" />
          </linearGradient>

          {/* Cyan/teal accent gradients */}
          <linearGradient id={`${uniqueId}-top2`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(190 100% 70%)" />
            <stop offset="100%" stopColor="hsl(200 90% 55%)" />
          </linearGradient>
          <linearGradient id={`${uniqueId}-left2`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(195 80% 50%)" />
            <stop offset="100%" stopColor="hsl(200 70% 35%)" />
          </linearGradient>
          <linearGradient id={`${uniqueId}-right2`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(200 65% 40%)" />
            <stop offset="100%" stopColor="hsl(205 60% 28%)" />
          </linearGradient>

          {/* Glow effect */}
          <filter id={`${uniqueId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g filter={`url(#${uniqueId}-glow)`}>
          {/* === BACK ROW - 2 blocks === */}
          
          {/* Back left block (purple) */}
          <g>
            <polygon points="22,20 38,30 22,40 6,30" fill={`url(#${uniqueId}-top1)`} />
            <polygon points="6,30 22,40 22,55 6,45" fill={`url(#${uniqueId}-left1)`} />
            <polygon points="22,40 38,30 38,45 22,55" fill={`url(#${uniqueId}-right1)`} />
          </g>

          {/* Back right block (cyan) */}
          <g>
            <polygon points="50,20 66,30 50,40 34,30" fill={`url(#${uniqueId}-top2)`} />
            <polygon points="34,30 50,40 50,55 34,45" fill={`url(#${uniqueId}-left2)`} />
            <polygon points="50,40 66,30 66,45 50,55" fill={`url(#${uniqueId}-right2)`} />
          </g>

          {/* === MIDDLE ROW - 3 blocks === */}
          
          {/* Middle left block (cyan) */}
          <g>
            <polygon points="36,35 52,45 36,55 20,45" fill={`url(#${uniqueId}-top2)`} />
            <polygon points="20,45 36,55 36,70 20,60" fill={`url(#${uniqueId}-left2)`} />
            <polygon points="36,55 52,45 52,60 36,70" fill={`url(#${uniqueId}-right2)`} />
          </g>

          {/* Middle center block (purple) - elevated */}
          <g>
            <polygon points="50,25 66,35 50,45 34,35" fill={`url(#${uniqueId}-top1)`} />
            <polygon points="34,35 50,45 50,60 34,50" fill={`url(#${uniqueId}-left1)`} />
            <polygon points="50,45 66,35 66,50 50,60" fill={`url(#${uniqueId}-right1)`} />
          </g>

          {/* Middle right block (purple) */}
          <g>
            <polygon points="64,35 80,45 64,55 48,45" fill={`url(#${uniqueId}-top1)`} />
            <polygon points="48,45 64,55 64,70 48,60" fill={`url(#${uniqueId}-left1)`} />
            <polygon points="64,55 80,45 80,60 64,70" fill={`url(#${uniqueId}-right1)`} />
          </g>

          {/* === FRONT ROW - 2 blocks === */}
          
          {/* Front left block (purple) */}
          <g>
            <polygon points="50,50 66,60 50,70 34,60" fill={`url(#${uniqueId}-top1)`} />
            <polygon points="34,60 50,70 50,85 34,75" fill={`url(#${uniqueId}-left1)`} />
            <polygon points="50,70 66,60 66,75 50,85" fill={`url(#${uniqueId}-right1)`} />
          </g>

          {/* Front right block (cyan) */}
          <g>
            <polygon points="78,50 94,60 78,70 62,60" fill={`url(#${uniqueId}-top2)`} />
            <polygon points="62,60 78,70 78,85 62,75" fill={`url(#${uniqueId}-left2)`} />
            <polygon points="78,70 94,60 94,75 78,85" fill={`url(#${uniqueId}-right2)`} />
          </g>

          {/* Edge highlights on key blocks */}
          <polyline 
            points="50,25 66,35 50,45 34,35 50,25" 
            stroke="hsl(265 100% 90%)"
            strokeWidth="0.5"
            fill="none"
            opacity="0.7"
          />
          <polyline 
            points="50,50 66,60 50,70 34,60 50,50" 
            stroke="hsl(265 100% 90%)"
            strokeWidth="0.5"
            fill="none"
            opacity="0.5"
          />
        </g>
      </svg>
    </div>
  );
}
