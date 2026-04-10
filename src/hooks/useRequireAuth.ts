import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Centralised hook for auth-gated actions.
 *
 * Returns the current user and a `requireAuth` wrapper.
 * If the user is not logged in, `requireAuth` redirects to /auth
 * with a return URL and shows a toast. If logged in, it runs the callback.
 *
 * Usage:
 * ```tsx
 * const { user, requireAuth } = useRequireAuth();
 * const handleBuy = () => requireAuth(() => addToCart(item));
 * ```
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const requireAuth = useCallback(
    (callback: () => void, message?: string) => {
      if (user) {
        callback();
      } else {
        toast.info(message || 'Please sign in to continue');
        navigate('/auth', { state: { returnTo: location.pathname + location.search } });
      }
    },
    [user, navigate, location.pathname, location.search]
  );

  return { user, requireAuth };
}
