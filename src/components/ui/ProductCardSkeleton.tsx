import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="h-full flex flex-col bg-card border border-border/50 rounded-xl overflow-hidden">
      {/* Image — matches ProductCard's p-2 pb-0 + aspect-[16/10] rounded-lg */}
      <div className="p-2 pb-0">
        <Skeleton className="aspect-[16/10] w-full rounded-lg" />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3 mt-auto">
          <div className="flex items-center gap-2 min-w-0">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
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
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
});
