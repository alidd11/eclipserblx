import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QueryErrorStateProps {
  onRetry?: () => void;
  message?: string;
  compact?: boolean;
}

/**
 * Friendly error state for failed data queries.
 * Detects offline status and shows appropriate messaging.
 */
export function QueryErrorState({ onRetry, message, compact = false }: QueryErrorStateProps) {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const Icon = isOffline ? WifiOff : AlertTriangle;
  const title = isOffline ? "You're offline" : 'Something went wrong';
  const description = message
    ?? (isOffline
      ? 'Check your connection and try again.'
      : "We couldn't load this data. Please try again.");

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-3 px-3 rounded-md bg-destructive/5 border border-destructive/10 text-sm">
        <Icon className="h-4 w-4 text-destructive flex-shrink-0" />
        <span className="text-muted-foreground flex-1">{description}</span>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 text-xs shrink-0">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 animate-in zoom-in-90 duration-400 delay-75">
        <Icon className="h-7 w-7 text-destructive" />
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
