import { useDevice } from './useDevice';

/**
 * Returns true when animations should be reduced:
 * - User has prefers-reduced-motion enabled
 * - Device is mobile (viewport <= 768px) — to improve TTI
 *
 * Thin wrapper over the unified DeviceProvider.
 */
export function useReducedMotion(): boolean {
  const { prefersReducedMotion, isMobile } = useDevice();
  return prefersReducedMotion || isMobile;
}
