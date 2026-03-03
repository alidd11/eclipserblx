import { useState, useEffect } from 'react';

/**
 * Returns true when animations should be reduced:
 * - User has prefers-reduced-motion enabled
 * - Device is mobile (viewport <= 768px) — to improve TTI
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.innerWidth <= 768
    );
  });

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mql.matches || window.innerWidth <= 768);
    mql.addEventListener('change', handler);
    window.addEventListener('resize', handler);
    return () => {
      mql.removeEventListener('change', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  return reduced;
}
