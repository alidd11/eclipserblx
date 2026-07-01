import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden h-full flex flex-col rounded-xl bg-card border border-border/60">
      {/* Image skeleton — matches ProductCard 5/4 */}
      <Skeleton className="aspect-[5/4] w-full" />
      
      {/* Content skeleton */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 gap-2">
        {/* Category */}
        <Skeleton className="h-2.5 w-14" />
        
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        
        {/* Store */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
        
        {/* Price + cart */}
        <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-border/40">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
});

export const ProductGridSkeleton = memo(function ProductGridSkeleton({ 
  count = 8 
}: { 
  count?: number 
}) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
});
