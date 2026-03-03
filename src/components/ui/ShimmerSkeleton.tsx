import { cn } from '@/lib/utils';

interface ShimmerSkeletonProps {
  className?: string;
}

/**
 * Enhanced skeleton with a shimmer/shine animation for premium loading feel.
 */
export function ShimmerSkeleton({ className }: ShimmerSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted relative overflow-hidden',
        className
      )}
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          backgroundImage: 'linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.04), transparent)',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );
}

/**
 * Card-shaped shimmer skeleton for dashboard or list views
 */
export function CardShimmer({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <ShimmerSkeleton className="h-4 w-2/5" />
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerSkeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </div>
  );
}

/**
 * Table row shimmer for data tables
 */
export function TableRowShimmer({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-border last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <ShimmerSkeleton
          key={i}
          className={cn(
            'h-4',
            i === 0 ? 'w-28' : i === columns - 1 ? 'w-16' : 'flex-1'
          )}
        />
      ))}
    </div>
  );
}
