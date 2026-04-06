import { Link } from 'react-router-dom';
import { useSellerOnboarding } from '@/hooks/useSellerOnboarding';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StoreSetupChecklist() {
  const { steps, isLoading, progress, completedCount, totalSteps, allComplete } = useSellerOnboarding();

  if (isLoading || allComplete || steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="flex flex-col space-y-1.5 p-4 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">Store Setup</h3>
          <span className="text-xs text-muted-foreground font-medium">
            {completedCount}/{totalSteps} complete
          </span>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </div>
      <div className="px-4 pb-4 space-y-1">
        {steps.map((item) => (
          <Link
            key={item.id}
            to={item.completed ? '#' : item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
              item.completed ? 'opacity-60' : 'hover:bg-muted/50 cursor-pointer'
            )}
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium truncate', item.completed && 'line-through text-muted-foreground')}>
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            {!item.completed && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
