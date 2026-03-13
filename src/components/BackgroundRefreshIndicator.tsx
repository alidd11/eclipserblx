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
      className="fixed top-[3px] right-[3px] z-[9998] pointer-events-none opacity-40"
      aria-hidden="true"
    >
      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
    </div>
  );
}
