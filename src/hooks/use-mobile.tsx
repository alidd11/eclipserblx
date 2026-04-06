import { useDevice } from './useDevice';

/**
 * Backward-compatible thin wrapper over the unified DeviceProvider.
 * Prefer `useDevice()` directly in new code.
 */
export function useIsMobile() {
  return useDevice().isMobile;
}
