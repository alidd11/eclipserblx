import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, Crown, Package } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { usePromotedProduct } from '@/hooks/usePromotedProduct';
import { Skeleton } from '@/components/ui/skeleton';
import { PromotedBadge } from '@/components/marketplace/PromotedBadge';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { getFirstImageUrl } from '@/lib/mediaUtils';

export const FeaturedProductCard = forwardRef<HTMLDivElement>(function FeaturedProductCard(_props, ref) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const { promotedProduct, isLoading, trackClick } = usePromotedProduct('homepage');

  if (isLoading) {
    return (
      <div className="space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Featured</span>
        <Skeleton className="w-full aspect-[2.5/1] rounded-lg" />
      </div>
    );
  }

  const displayProduct = promotedProduct?.product;
  const isPromoted = !!promotedProduct;

  if (!displayProduct) return null;

  const isEligible = isEligibleForDiscount(displayProduct.category_id, displayProduct.is_resellable, displayProduct.stores?.undefined_removed);
  const memberPrice = isEligible ? getMemberPrice(displayProduct.price, displayProduct.category_id, displayProduct.is_resellable) : displayProduct.price;
  const discountPercent = getDiscountPercent(displayProduct.category_id, displayProduct.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < displayProduct.price;

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Featured</span>
      <Link
        to={`/products/${(displayProduct as any).product_number}`}
        className="group block"
        onClick={trackClick}
      >
        <div className="relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/30 transition-colors">
          {/* Product image */}
          <div className="aspect-[2.5/1] sm:aspect-[3/1] relative overflow-hidden bg-foreground/20">
            {(() => {
              const imgUrl = getFirstImageUrl(displayProduct.images, 540, 180, 'contain');
              return imgUrl ? (
                <img
                  src={imgUrl}
                  alt={displayProduct.name}
                  width={540}
                  height={180}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain object-center"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                </div>
              );
            })()}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Promoted badge */}
            {isPromoted && (
              <div className="absolute top-2 right-2">
                <PromotedBadge size="md" />
              </div>
            )}

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-5">
              {displayProduct.categories?.name && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/50 mb-0.5">
                  {displayProduct.categories.name}
                </span>
              )}
              <h3 className="text-foreground font-display font-bold text-sm sm:text-lg line-clamp-1 leading-tight">
                {displayProduct.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {hasMemberDiscount ? (
                  <>
                    <span className="text-amber-400 font-bold text-xs sm:text-sm">{formatPrice(memberPrice)}</span>
                    <span className="text-muted-foreground text-[10px] sm:text-xs line-through">{formatPrice(displayProduct.price)}</span>
                    <span className="inline-flex items-center gap-0.5 px-1 py-px rounded bg-amber-500/15 text-amber-400 text-[9px] sm:text-[10px] font-semibold">
                      <Crown className="h-2.5 w-2.5" />
                      -{discountPercent}%
                    </span>
                  </>
                ) : (
                  <span className="text-foreground font-bold text-xs sm:text-sm">{formatPrice(displayProduct.price)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Store strip */}
          <div className="h-8 relative flex items-center gap-1.5 px-3 overflow-hidden bg-muted/60">
            <div className="flex items-center gap-1.5 min-w-0">
              {displayProduct.stores?.logo_url ? (
                <img src={optimizeImageUrl(displayProduct.stores.logo_url, 16, 16, 'contain')} alt="" width={16} height={16} loading="lazy" decoding="async" className="h-4 w-4 rounded-sm object-cover flex-shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-sm bg-muted flex-shrink-0" />
              )}
              <span className="text-[11px] font-medium truncate text-muted-foreground">
                {displayProduct.stores?.name}
              </span>
              {displayProduct.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
});
