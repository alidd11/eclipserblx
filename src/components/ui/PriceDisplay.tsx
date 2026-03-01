import { memo } from 'react';
import { Crown } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  price: number;
  categoryId?: string | null;
  isResellable?: boolean;
  storeEclipseEnabled?: boolean;
  /** Show the discount badge (e.g. "10%") */
  showBadge?: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: { price: 'text-xs', original: 'text-[10px]', badge: 'text-[9px] px-1 py-0' },
  sm: { price: 'text-sm', original: 'text-xs', badge: 'text-[10px] px-1 py-0.5' },
  md: { price: 'text-base', original: 'text-sm', badge: 'text-xs px-1.5 py-0.5' },
  lg: { price: 'text-lg', original: 'text-base', badge: 'text-xs px-1.5 py-0.5' },
};

/**
 * Centralized price display component.
 * Handles Eclipse+ member pricing, discounts, and formatting.
 * Use this instead of manually calling getMemberPrice/getDiscountPercent.
 */
export const PriceDisplay = memo(function PriceDisplay({
  price,
  categoryId = null,
  isResellable = false,
  storeEclipseEnabled = false,
  showBadge = true,
  size = 'sm',
  className,
}: PriceDisplayProps) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();

  const isEligible = isEligibleForDiscount(categoryId, isResellable, storeEclipseEnabled);
  const memberPrice = isEligible ? getMemberPrice(price, categoryId, isResellable) : price;
  const discountPercent = isEligible ? getDiscountPercent(categoryId, isResellable) : 0;
  const hasMemberDiscount = isEligible && memberPrice < price;

  const s = sizeClasses[size];

  if (!hasMemberDiscount) {
    return (
      <span className={cn('font-bold text-foreground', s.price, className)}>
        {formatPrice(price)}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 flex-wrap', className)}>
      <span className={cn('font-bold text-amber-500', s.price)}>
        {formatPrice(memberPrice)}
      </span>
      <span className={cn('line-through text-muted-foreground', s.original)}>
        {formatPrice(price)}
      </span>
      {showBadge && discountPercent > 0 && (
        <span className={cn(
          'inline-flex items-center gap-0.5 rounded bg-amber-500/20 text-amber-400 font-bold',
          s.badge
        )}>
          <Crown className="h-2.5 w-2.5" />
          {discountPercent}%
        </span>
      )}
    </span>
  );
});
