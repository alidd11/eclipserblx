import { ReactNode, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const {
    containerRef,
    isRefreshing,
    pullDistance,
    progress,
    shouldTrigger,
  } = usePullToRefresh({ onRefresh });

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none z-50',
          pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: 0,
          height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
          transform: `translateY(${isRefreshing ? 0 : -20}px)`,
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 transition-transform',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
          }}
        >
          <RefreshCw
            className={cn(
              'h-5 w-5 transition-colors',
              shouldTrigger || isRefreshing ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>
      </div>

      {/* Content wrapper */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>

      {/* Pull hint text */}
      {pullDistance > 20 && !isRefreshing && (
        <div
          className="absolute left-0 right-0 text-center text-xs text-muted-foreground pointer-events-none"
          style={{ top: pullDistance - 20 }}
        >
          {shouldTrigger ? 'Release to refresh' : 'Pull down to refresh'}
        </div>
      )}
    </div>
  );
}
