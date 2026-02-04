import { cn } from '@/lib/utils';
import eclipseLogo from '@/assets/eclipse-logo.png';

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
      <img 
        src={eclipseLogo} 
        alt="Eclipse Logo" 
        className="w-full h-full object-contain"
      />
    </div>
  );
}
