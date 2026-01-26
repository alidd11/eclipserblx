import { cn } from '@/lib/utils';

interface CurrencyIndicatorProps {
  className?: string;
}

export function CurrencyIndicator({ className }: CurrencyIndicatorProps) {
  // Currency is standardized to GBP across the platform
  // This is a visual indicator showing the active currency
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 h-10 px-3 rounded-xl",
        "bg-muted/50 border border-border",
        "text-sm font-medium text-foreground",
        "select-none",
        className
      )}
    >
      <span className="text-base">£</span>
      <span className="hidden sm:inline text-muted-foreground">GBP</span>
    </div>
  );
}
