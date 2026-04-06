import { ReactNode } from 'react';
import { InlineLoading } from './InlineLoading';
import { EmptyState, type EmptyStateProps } from './EmptyState';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface QueryGuardProps {
  /** Is the query loading? */
  isLoading: boolean;
  /** Is the query in an error state? */
  isError?: boolean;
  /** Error object (used for message) */
  error?: Error | null;
  /** The data to check — renders children only when truthy */
  data?: unknown;
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Custom loading message */
  loadingMessage?: string;
  /** Compact mode for inline sections (smaller skeleton) */
  compact?: boolean;
  /** Empty state config — shown when data is falsy/empty-array and not loading */
  emptyState?: EmptyStateProps;
  /** Content to render when data is available */
  children: ReactNode;
}

/**
 * Enterprise-standard wrapper that handles loading → error → empty → content states.
 *
 * Usage:
 * ```tsx
 * <QueryGuard isLoading={isLoading} isError={isError} data={items} emptyState={{ title: 'No orders yet' }}>
 *   <OrderList items={items} />
 * </QueryGuard>
 * ```
 */
export function QueryGuard({
  isLoading,
  isError = false,
  error,
  data,
  onRetry,
  loadingMessage,
  compact = false,
  emptyState,
  children,
}: QueryGuardProps) {
  // Loading state
  if (isLoading) {
    return <InlineLoading message={loadingMessage} compact={compact} />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mb-3 text-destructive/70" />
        <p className="text-sm font-medium text-foreground mb-1">Something went wrong</p>
        <p className="text-xs text-muted-foreground mb-4">
          {error?.message || 'An unexpected error occurred.'}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Empty state — data is null/undefined/empty array
  const isEmpty =
    data === null ||
    data === undefined ||
    (Array.isArray(data) && data.length === 0);

  if (isEmpty && emptyState) {
    return <EmptyState {...emptyState} />;
  }

  return <>{children}</>;
}
