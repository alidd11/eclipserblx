import { ReactNode } from 'react';
import { GlobalGuardRouter } from '@/components/global-guard/GlobalGuardRouter';

interface SubdomainRouterProps {
  children: ReactNode;
}

/**
 * Routes to Global Guard dashboard when on guard.* subdomain,
 * otherwise renders the main app routes
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  const hostname = window.location.hostname;
  const isGlobalGuardDomain = hostname.startsWith('guard.') || hostname === 'guard.eclipserblx.com';

  if (isGlobalGuardDomain) {
    return <GlobalGuardRouter />;
  }

  return <>{children}</>;
}
