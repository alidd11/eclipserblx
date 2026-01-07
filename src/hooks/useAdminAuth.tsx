import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();

  const { data: roles, isLoading: rolesLoading, isFetching } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(r => r.role);
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 1000 * 60 * 5, // Cache roles for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const isAdmin = roles?.includes('admin') ?? false;
  const isProductManager = roles?.includes('product_manager') ?? false;
  const isOrderManager = roles?.includes('order_manager') ?? false;
  const isSupportAgent = roles?.includes('support_agent') ?? false;
  const isAnalyst = roles?.includes('analyst') ?? false;
  const isStaff = (roles?.length ?? 0) > 0;

  const hasRole = (role: string) => roles?.includes(role as any) ?? false;

  // Loading is true if auth is loading OR if we have a user but roles haven't been fetched yet
  const loading = authLoading || (!!user?.id && rolesLoading);

  return {
    user,
    roles: roles ?? [],
    isAdmin,
    isProductManager,
    isOrderManager,
    isSupportAgent,
    isAnalyst,
    isStaff,
    hasRole,
    loading,
  };
}
