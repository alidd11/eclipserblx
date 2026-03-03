import { Loader2 } from 'lucide-react';

interface InlineLoadingProps {
  /** Loading message */
  message?: string;
  /** Compact mode for table cells */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Consistent inline loading state for data sections.
 * Use inside cards, tables, and list containers.
 */
export function InlineLoading({ message = 'Loading…', compact = false, className }: InlineLoadingProps) {
  if (compact) {
    return (
      <div className={`flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground ${className ?? ''}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 text-muted-foreground ${className ?? ''}`}>
      <Loader2 className="h-6 w-6 animate-spin mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
