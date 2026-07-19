import { memo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  price: number;
  showBadge?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: { price: 'text-xs' },
  sm: { price: 'text-sm' },
  md: { price: 'text-base' },
  lg: { price: 'text-lg' },
};

/**
 * Centralized price display component.
 * Centralized price formatter — simply formats and displays the price.
 */
export const PriceDisplay = memo(function PriceDisplay({
  price,
  size = 'sm',
  className,
}: PriceDisplayProps) {
  const { formatPrice } = useCurrency();
  const s = sizeClasses[size];

  return (
    <span className={cn('font-bold text-foreground', s.price, className)}>
      {formatPrice(price)}
    </span>
  );
});
