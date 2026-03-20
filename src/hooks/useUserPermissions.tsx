import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useUserPermissions() {
  const { user } = useAuth();

  const isJwtError = (error: any) => {
    const message = String(error?.message ?? '').toLowerCase();
    const code = String(error?.code ?? '').toUpperCase();
    return (
      message.includes('jwt') ||
      message.includes('bad_jwt') ||
      message.includes('invalid claim') ||
      message.includes('403') ||
      code === 'PGRST301'
    );
  };

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Step 1: Get user's roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (rolesError) {
        throw rolesError;
      }
      
      if (!userRoles?.length) return [];
      
      const roles = userRoles.map(r => r.role);
      
      // Step 2: Get permission IDs for those roles
      const { data: rolePerms, error: permError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .in('role', roles);
      
      if (permError) {
        throw permError;
      }
      
      if (!rolePerms?.length) return [];
      
      const permissionIds = [...new Set(rolePerms.map(rp => rp.permission_id))];
      
      // Step 3: Get permission names
      const { data: perms, error: namesError } = await supabase
        .from('permissions')
        .select('name')
        .in('id', permissionIds);
      
      if (namesError) {
        throw namesError;
      }
      
      return perms?.map(p => p.name) ?? [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // Cache for 30 seconds for faster permission updates
    refetchOnWindowFocus: true, // Refresh permissions when user returns to tab
    retry: (failureCount, error) => failureCount < 3 && isJwtError(error),
    retryDelay: 1000,
  });

  const hasPermission = (permissionName: string) => {
    return permissions?.includes(permissionName) ?? false;
  };

  const hasAnyPermission = (permissionNames: string[]) => {
    return permissionNames.some(p => permissions?.includes(p));
  };

  return {
    permissions: permissions ?? [],
    hasPermission,
    hasAnyPermission,
    isLoading,
  };
}
