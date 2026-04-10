import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden h-full flex flex-col rounded-xl bg-card">
      {/* Image skeleton — square */}
      <Skeleton className="aspect-[5/4] w-full" />
      
      {/* Content skeleton */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 gap-1.5">
        {/* Category */}
        <Skeleton className="h-2.5 w-14" />
        
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        
        {/* Store */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <Skeleton className="h-3.5 w-3.5 rounded-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
        
        {/* Price + cart */}
        <div className="flex items-center justify-between mt-auto pt-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-7 w-7 rounded-lg" />
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
