import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useUserPermissions() {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get all permissions for user's roles
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          role,
          custom_roles!inner(name),
          role_permissions!inner(
            permissions!inner(name)
          )
        `)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching permissions:', error);
        // Fallback: fetch permissions via a simpler query
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (!roleData?.length) return [];
        
        const roles = roleData.map(r => r.role);
        
        const { data: permData } = await supabase
          .from('role_permissions')
          .select('permissions(name)')
          .in('role', roles);
        
        if (!permData) return [];
        
        const permSet = new Set<string>();
        permData.forEach((rp: any) => {
          if (rp.permissions?.name) {
            permSet.add(rp.permissions.name);
          }
        });
        
        return Array.from(permSet);
      }
      
      // Extract unique permission names
      const permSet = new Set<string>();
      data?.forEach((ur: any) => {
        ur.role_permissions?.forEach((rp: any) => {
          if (rp.permissions?.name) {
            permSet.add(rp.permissions.name);
          }
        });
      });
      
      return Array.from(permSet);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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
