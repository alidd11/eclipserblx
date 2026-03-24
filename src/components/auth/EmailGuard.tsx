import { Navigate } from 'react-router-dom';
import { useRequireEmail } from '@/hooks/useRequireEmail';

/**
 * Wraps the app to redirect users with placeholder emails to /complete-profile.
 * NEVER blocks rendering — the app loads instantly for all visitors.
 * Only redirects once auth has resolved and we know the user needs an email.
 */
export function EmailGuard({ children }: { children: React.ReactNode }) {
  const { needsEmail, loading } = useRequireEmail();

  // While auth is loading, render children immediately — don't block the app.
  // Unauthenticated visitors (the majority) see the site instantly.
  if (loading) {
    return <>{children}</>;
  }

  if (needsEmail) {
    const path = window.location.pathname;
    const allowedPaths = ['/complete-profile', '/auth', '/auth/discord/callback', '/auth/roblox/callback'];
    
    if (!allowedPaths.some(p => path.startsWith(p))) {
      return <Navigate to="/complete-profile" replace />;
    }
  }

  return <>{children}</>;
}
