/**
 * Detects if the current hostname is the Global Guard subdomain.
 */
export function useGlobalGuardDomain() {
  const hostname = window.location.hostname;
  const isGlobalGuardDomain = hostname.startsWith('guard.') || hostname === 'guard.eclipserblx.com';
  return { isGlobalGuardDomain };
}
