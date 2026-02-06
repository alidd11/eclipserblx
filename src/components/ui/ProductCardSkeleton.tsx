import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProductCard component.
 * Matches the exact layout and proportions of the real card.
 */
export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden h-full flex flex-col rounded-lg border border-border bg-card">
      {/* Image skeleton */}
      <Skeleton className="aspect-[4/3] w-full" />
      
      {/* Content skeleton */}
      <div className="p-2 xs:p-2.5 sm:p-3 flex flex-col flex-1 gap-1 xs:gap-1.5">
        {/* Category */}
        <Skeleton className="h-3 w-16" />
        
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        
        {/* Price */}
        <div className="mt-auto pt-1">
          <Skeleton className="h-5 w-20" />
        </div>
        
        {/* Button */}
        <Skeleton className="h-7 xs:h-8 w-full mt-1.5 xs:mt-2" />
      </div>
    </div>
  );
});

/**
 * Grid of product skeletons for loading states
 */
export const ProductGridSkeleton = memo(function ProductGridSkeleton({ 
  count = 8 
}: { 
  count?: number 
}) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
});
