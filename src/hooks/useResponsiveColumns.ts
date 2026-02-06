import { useState, useEffect } from 'react';

/**
 * Hook to determine responsive column count for grids.
 * Returns appropriate column count based on viewport width.
 */
export function useResponsiveColumns(
  breakpoints: { minWidth: number; columns: number }[] = [
    { minWidth: 1280, columns: 4 },
    { minWidth: 1024, columns: 3 },
    { minWidth: 640, columns: 2 },
    { minWidth: 0, columns: 1 },
  ]
): number {
  const [columns, setColumns] = useState(() => {
    if (typeof window === 'undefined') return breakpoints[breakpoints.length - 1].columns;
    const width = window.innerWidth;
    return breakpoints.find(bp => width >= bp.minWidth)?.columns ?? 1;
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const newColumns = breakpoints.find(bp => width >= bp.minWidth)?.columns ?? 1;
      setColumns(newColumns);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoints]);

  return columns;
}
