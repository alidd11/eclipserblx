import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

function isJwtError(error: any): boolean {
  const message = String(error?.message ?? '').toLowerCase();
  const code = String(error?.code ?? '').toUpperCase();
  return (
    message.includes('jwt') ||
    message.includes('bad_jwt') ||
    message.includes('invalid claim') ||
    message.includes('missing sub claim') ||
    message.includes('403') ||
    code === 'PGRST301'
  );
}

export function useUserPermissions() {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const fetchPermissions = async () => {
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (rolesError) throw rolesError;
        if (!userRoles?.length) return [];
        
        const roles = userRoles.map(r => r.role);
        
        const { data: rolePerms, error: permError } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .in('role', roles);
        
        if (permError) throw permError;
        if (!rolePerms?.length) return [];
        
        const permissionIds = [...new Set(rolePerms.map(rp => rp.permission_id))];
        
        const { data: perms, error: namesError } = await supabase
          .from('permissions')
          .select('name')
          .in('id', permissionIds);
        
        if (namesError) throw namesError;
        return perms?.map(p => p.name) ?? [];
      };

      try {
        return await fetchPermissions();
      } catch (error) {
        if (isJwtError(error)) {
          // Force refresh and retry once
          console.log('[Permissions] JWT error, refreshing session...');
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshErr) {
            console.warn('[Permissions] Session refresh failed:', refreshErr.message);
            throw error;
          }
          return await fetchPermissions();
        }
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => failureCount < 3 && isJwtError(error),
    retryDelay: 1500,
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
