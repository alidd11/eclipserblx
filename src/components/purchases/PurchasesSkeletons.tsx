import { Skeleton } from '@/components/ui/skeleton';

/** Matches the shape of a purchased-product row in ProductsTab */
export function ProductRowSkeleton() {
  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-8 w-28 mt-1" />
        </div>
      </div>
    </div>
  );
}

export function ProductsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches the shape of an order row in OrdersTab */
export function OrderRowSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function OrdersListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <OrderRowSkeleton key={i} />
      ))}
    </div>
  );
}
