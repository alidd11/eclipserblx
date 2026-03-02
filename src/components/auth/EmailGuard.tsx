import { forwardRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useRequireEmail } from '@/hooks/useRequireEmail';

/**
 * Wraps the app to redirect users with placeholder emails to /complete-profile.
 * Allows /auth, /complete-profile, and OAuth callback routes to pass through.
 */
export const EmailGuard = forwardRef<HTMLDivElement, { children: React.ReactNode }>(function EmailGuard({ children }, _ref) {
  const { needsEmail, loading } = useRequireEmail();
  
  if (loading) {
    return null; // Don't flash anything while checking
  }

  if (needsEmail) {
    // Check current path - allow auth-related routes through
    const path = window.location.pathname;
    const allowedPaths = ['/complete-profile', '/auth', '/auth/discord/callback', '/auth/roblox/callback'];
    
    if (!allowedPaths.some(p => path.startsWith(p))) {
      return <Navigate to="/complete-profile" replace />;
    }
  }

  return <>{children}</>;
});
