import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function isJwtError(error: unknown): boolean {
  const msg = String((error as any)?.message ?? '').toLowerCase();
  const code = String((error as any)?.code ?? '').toUpperCase();
  return (
    msg.includes('jwt') ||
    msg.includes('bad_jwt') ||
    msg.includes('invalid claim') ||
    msg.includes('missing sub claim') ||
    msg.includes('403') ||
    code === 'PGRST301'
  );
}

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();

  const { data: roles, isLoading: rolesLoading, isError, error: rolesError, failureCount } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const fetchRoles = async () => {
        const result = await withTimeout((async () => {
          return await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
        })(), 7000);

        if (!result) {
          throw new Error('Roles query timeout');
        }

        if (result.error) throw result.error;
        return (result.data ?? []).map(r => r.role);
      };

      try {
        return await fetchRoles();
      } catch (error) {
        if (!isJwtError(error)) throw error;

        // Token may be stale — force a refresh and retry once
        console.debug('[AdminAuth] JWT error on roles query, refreshing session...');
        const refreshResult = await withTimeout(supabase.auth.refreshSession(), 5000);
        if (!refreshResult || refreshResult.error) {
          console.warn('[AdminAuth] Session refresh failed:', refreshResult?.error?.message ?? 'timeout');
          throw error; // Let react-query retry handle it
        }

        return await fetchRoles();
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: (failureCount, error: Error) => {
      if (failureCount >= 3) return false;
      return isJwtError(error);
    },
    retryDelay: 1500,
  });

  const isAdmin = roles?.includes('admin') ?? false;
  const isLeadAdministrator = roles?.includes('lead_administrator') ?? false;
  const isLeadManager = roles?.includes('lead_manager') ?? false;
  const isSupportAgent = roles?.includes('support_agent') ?? false;
  const isAnalyst = roles?.includes('analyst') ?? false;
  const isSeller = roles?.includes('seller') ?? false;
  const STATUS_ROLES = ['customer', 'eclipse_plus_member', 'seller'];
  const isStaff = (roles ?? []).some(role => !STATUS_ROLES.includes(role));

  const hasRole = (role: string) => roles?.includes(role as any) ?? false;

  // Bounded recovery: only treat as recovering if we're still retrying (failureCount < 3)
  // Once retries are exhausted, this is a terminal auth error — don't keep loading forever
  const isJwtFailure = isError && isJwtError(rolesError);
  const isAuthRecovering = isJwtFailure && failureCount < 3;
  const isAuthExpired = isJwtFailure && failureCount >= 3;

  // Loading is true only during initial auth load or active recovery (bounded)
  const loading = authLoading || (!!user?.id && rolesLoading && roles === undefined) || isAuthRecovering;

  return {
    user,
    roles: roles ?? [],
    isAdmin,
    isLeadAdministrator,
    isLeadManager,
    isSupportAgent,
    isAnalyst,
    isSeller,
    isStaff,
    hasRole,
    loading,
    isAuthRecovering,
    isAuthExpired,
  };
}
