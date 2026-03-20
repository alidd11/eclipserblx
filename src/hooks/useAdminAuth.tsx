import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

function isJwtError(error: any): boolean {
  const msg = String(error?.message ?? '').toLowerCase();
  const code = String(error?.code ?? '').toUpperCase();
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

  const { data: roles, isLoading: rolesLoading, isError, error: rolesError } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First attempt
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error && isJwtError(error)) {
        // Token may be stale — force a refresh and retry once
        console.log('[AdminAuth] JWT error on roles query, refreshing session...');
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr) {
          console.warn('[AdminAuth] Session refresh failed:', refreshErr.message);
          throw error; // Let react-query retry handle it
        }

        // Retry after refresh
        const { data: retryData, error: retryError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (retryError) throw retryError;
        return (retryData ?? []).map(r => r.role);
      }

      if (error) throw error;
      return (data ?? []).map(r => r.role);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
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

  // Treat JWT errors as "still loading" — don't let transient auth failures trigger Access Denied
  const isAuthRecovering = isError && isJwtError(rolesError);
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
  };
}
