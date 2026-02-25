import { useAuth } from '@/hooks/useAuth';

/**
 * Check if the authenticated user has a placeholder email
 * (e.g. from Roblox sign-up) and needs to provide a real one.
 */
export function useRequireEmail() {
  const { user, loading } = useAuth();

  const needsEmail = !loading && !!user && (
    user.email?.endsWith('.placeholder.local') ||
    !user.email
  );

  return { needsEmail, loading };
}
