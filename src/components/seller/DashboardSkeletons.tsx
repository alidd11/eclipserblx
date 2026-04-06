import { Skeleton } from '@/components/ui/skeleton';

export function DashboardCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border/50 bg-card ${className || ''}`}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-[140px] w-full rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatRowSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-4 min-w-[150px] flex-shrink-0 md:min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
