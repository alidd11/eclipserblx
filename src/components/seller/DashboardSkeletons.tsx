import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-[180px] w-full rounded-md" />
      </div>
    </Card>
  );
}

export function StatRowSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </Card>
      ))}
    </div>
  );
}
