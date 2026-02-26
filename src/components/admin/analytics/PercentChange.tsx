import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PercentChangeProps {
  current: number;
  previous: number;
  label?: string;
  className?: string;
}

export function PercentChange({ current, previous, label, className }: PercentChangeProps) {
  if (previous === 0 && current === 0) return null;

  const change = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        isPositive && 'text-emerald-400',
        !isPositive && !isNeutral && 'text-destructive',
        isNeutral && 'text-muted-foreground',
        className,
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>
        {isPositive ? '+' : ''}
        {change.toFixed(0)}%
      </span>
      {label && <span className="text-muted-foreground font-normal">{label}</span>}
    </div>
  );
}
