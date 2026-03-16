import { Navigate } from 'react-router-dom';
import { useRequireEmail } from '@/hooks/useRequireEmail';

/**
 * Wraps the app to redirect users with placeholder emails to /complete-profile.
 * Allows /auth, /complete-profile, and OAuth callback routes to pass through.
 */
export function EmailGuard({ children }: { children: React.ReactNode }) {
  const { needsEmail, loading } = useRequireEmail();
  
  if (loading) {
    return null;
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
