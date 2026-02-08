import { useMemo } from 'react';

/**
 * Detects if the app is running on the Global Guard subdomain (guard.eclipserblx.com)
 * Used to conditionally render the Global Guard dashboard instead of the main app
 */
export function useGlobalGuardDomain() {
  const isGlobalGuardDomain = useMemo(() => {
    const hostname = window.location.hostname;
    return hostname.startsWith('guard.') || hostname === 'guard.eclipserblx.com';
  }, []);

  return { isGlobalGuardDomain };
}
