import { cn } from '@/lib/utils';
import marketplaceLogo from '@/assets/marketplace-logo-icon.webp';

interface EclipseLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** @deprecated No longer used — canvas processing removed for performance */
  removeWhiteBackground?: boolean;
}

const sizeClasses: Record<string, string> = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
};

const sizePx: Record<string, number> = {
  xs: 20,
  sm: 28,
  md: 32,
  lg: 40,
  xl: 56,
};

export function EclipseLogo({ className, size = 'md' }: EclipseLogoProps) {
  return (
    <div className={cn('relative flex-shrink-0', sizeClasses[size], className)}>
      <img
        src={marketplaceLogo}
        alt="Eclipse Logo"
        width={sizePx[size]}
        height={sizePx[size]}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className="w-full h-full object-contain"
      />
    </div>
  );
}
