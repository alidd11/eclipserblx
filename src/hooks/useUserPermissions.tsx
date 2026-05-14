import { useQuery } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function isJwtError(error: unknown): boolean {
  const message = String((error as any)?.message ?? '').toLowerCase();
  const code = String((error as any)?.code ?? '').toUpperCase();
  return (
    message.includes('jwt') ||
    message.includes('bad_jwt') ||
    message.includes('invalid claim') ||
    message.includes('missing sub claim') ||
    message.includes('403') ||
    code === 'PGRST301'
  );
}

interface UseUserPermissionsOptions {
  enabled?: boolean;
}

export function useUserPermissions(options: UseUserPermissionsOptions = {}) {
  const { user } = useAuth();
  const queryEnabled = (options.enabled ?? true) && !!user?.id;

  const { data: permissions, isLoading, isError, error, failureCount } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const fetchPermissions = async () => {
        const rolesResult = await withTimeout((async () => {
          return await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
        })(), 7000);

        if (!rolesResult) throw new Error('Roles query timeout');

        const { data: userRoles, error: rolesError } = rolesResult;
        
        if (rolesError) throw rolesError;
        if (!userRoles?.length) return [];
        
        const roles = userRoles.map(r => r.role);
        
        const rolePermsResult = await withTimeout((async () => {
          return await supabase
            .from('role_permissions')
            .select('permission_id')
            .in('role', roles);
        })(), 7000);

        if (!rolePermsResult) throw new Error('Role permissions query timeout');

        const { data: rolePerms, error: permError } = rolePermsResult;
        
        if (permError) throw permError;
        if (!rolePerms?.length) return [];
        
        const permissionIds = [...new Set(rolePerms.map(rp => rp.permission_id))];
        
        const permsResult = await withTimeout((async () => {
          return await supabase
            .from('permissions')
            .select('name')
            .in('id', permissionIds);
        })(), 7000);

        if (!permsResult) throw new Error('Permissions names query timeout');

        const { data: perms, error: namesError } = permsResult;
        
        if (namesError) throw namesError;
        return perms?.map(p => p.name) ?? [];
      };

      try {
        return await fetchPermissions();
      } catch (error) {
        if (isJwtError(error)) {
          console.debug('[Permissions] JWT error, refreshing session...');
          const refreshResult = await withTimeout(supabase.auth.refreshSession(), 5000);
          if (!refreshResult || refreshResult.error) {
            console.warn('[Permissions] Session refresh failed:', refreshResult?.error?.message ?? 'timeout');
            throw error;
          }
          return await fetchPermissions();
        }
        throw error;
      }
    },
    enabled: queryEnabled,
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

  // Bounded: once retries exhausted on JWT error, stop loading
  const isAuthExpired = queryEnabled && isError && isJwtError(error) && failureCount >= 3;

  return {
    permissions: permissions ?? [],
    hasPermission,
    hasAnyPermission,
    isLoading: queryEnabled ? (isLoading && !isAuthExpired) : false,
    isAuthExpired,
  };
}

/**
 * Conditionally render children based on a permission check.
 * Pass `permission` for single-perm gating or `anyOf` for multi-perm OR-gating.
 * Renders nothing while permissions are loading, then `fallback` (default null) if denied.
 */
interface PermissionGateProps {
  permission?: string;
  anyOf?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, anyOf, fallback = null, children }: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, isLoading } = useUserPermissions();
  if (isLoading) return null;
  const allowed = permission
    ? hasPermission(permission)
    : anyOf
      ? hasAnyPermission(anyOf)
      : true;
  return <>{allowed ? children : fallback}</>;
}
