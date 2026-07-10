import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="h-full flex flex-col bg-card border border-border/60 overflow-hidden">
      <div className="p-3 pb-0">
        <Skeleton className="aspect-[4/3] w-full" />
      </div>
      <div className="p-5 md:p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-4 mb-5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
          <Skeleton className="h-6 w-14 shrink-0" />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-5 mt-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-2 w-16" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <Skeleton className="h-11 w-11" />
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
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
});
