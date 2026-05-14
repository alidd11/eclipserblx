import { cn } from '@/lib/utils';
import marketplaceLogo from '@/assets/marketplace-logo-icon.webp';
import marketplaceLogoSm from '@/assets/marketplace-logo-icon-sm.webp';

interface EclipseLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses: Record<string, string> = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
  xl: 'h-12 w-12',
};

const sizePx: Record<string, number> = {
  xs: 16,
  sm: 24,
  md: 28,
  lg: 36,
  xl: 48,
};

export function EclipseLogo({ className, size = 'md' }: EclipseLogoProps) {
  // Use small variant for sizes ≤36px to avoid serving 1024x1024 asset
  const src = size === 'xl' ? marketplaceLogo : marketplaceLogoSm;

  return (
    <div className={cn('relative flex-shrink-0 rounded-md overflow-hidden', sizeClasses[size], className)}>
      <img
        src={src}
        alt="Eclipse Logo"
        width={sizePx[size]}
        height={sizePx[size]}
        loading="lazy"
        decoding="async"
        // React 18 doesn't whitelist this prop on plain <img>; lowercase pass-through avoids dev warning
        {...({ fetchpriority: 'low' } as Record<string, string>)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
