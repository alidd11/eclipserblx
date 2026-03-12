import { useIsFetching } from '@tanstack/react-query';

/**
 * Subtle pulsing dot that appears when react-query is fetching in the background.
 * Positioned in the top-right corner, just below the header.
 */
export function BackgroundRefreshIndicator() {
  const isFetching = useIsFetching();

  if (!isFetching) return null;

  return (
    <div
      className="fixed top-1 right-2 z-[9998] pointer-events-none"
      aria-hidden="true"
    >
      <div className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" />
    </div>
  );
}
