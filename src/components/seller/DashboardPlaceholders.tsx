import { Skeleton } from '@/components/ui/skeleton';
import { type LucideIcon } from 'lucide-react';

/**
 * Consistent loading skeleton for dashboard card content areas.
 * Use inside <CardContent> when data is loading.
 */
export function CardLoadingSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={className ?? 'space-y-3'}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Consistent empty state for dashboard card content areas.
 * Always h-[200px] centered with optional icon.
 */
export function CardEmptyState({ icon: Icon, title, subtitle }: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
      {Icon && <Icon className="h-8 w-8 mb-2 opacity-30" />}
      <p className="text-sm">{title}</p>
      {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
