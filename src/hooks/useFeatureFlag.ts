import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UseFeatureFlagResult {
  hasAccess: boolean;
  loading: boolean;
  error: Error | null;
}

export function useFeatureFlag(flagName: string): UseFeatureFlagResult {
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    async function checkAccess() {
      setLoading(true);
      setError(null);

      try {
        // Fetch the feature flag
        const { data: flag, error: flagError } = await supabase
          .from('feature_flags')
          .select('id, enabled, user_ids')
          .eq('name', flagName)
          .maybeSingle();

        if (flagError) {
          throw flagError;
        }

        if (!flag) {
          // Flag doesn't exist - no access
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Check if flag is enabled and user is in the allowed list
        if (!flag?.enabled) {
          setHasAccess(false);
        } else if (!user) {
          // No user logged in - no access to beta features
          setHasAccess(false);
        } else {
          // Check if user is in the allowed user_ids array
          const userIds = (flag.user_ids as string[]) || [];
          setHasAccess(userIds.includes(user.id));
        }
      } catch (err) {
        console.error('Error checking feature flag:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [flagName, user, authLoading]);

  return { hasAccess, loading, error };
}

// Convenience hook specifically for marketplace feature
// Sellers with the seller role OR an approved store automatically have access
// Admins always have access
export function useMarketplaceAccess() {
  const { user, loading: authLoading } = useAuth();
  const featureFlag = useFeatureFlag('marketplace');
  const [hasSellerRole, setHasSellerRole] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasApprovedStore, setHasApprovedStore] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  // Check if marketplace is public — cached via React Query to avoid duplicate requests
  const { data: isMarketplacePublic = false, isLoading: publicLoading } = useQuery({
    queryKey: ['marketplace-public-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'marketplace_public')
        .maybeSingle();
      const val = data?.value;
      return val === true || val === 'true';
    },
    staleTime: 1000 * 60 * 5, // 5 minutes — rarely changes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (authLoading || !user) {
      setRoleLoading(false);
      return;
    }

    async function checkRoles() {
      if (!user) return;
      try {
        const [rolesResult, storeResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id),
          supabase
            .from('stores')
            .select('id')
            .eq('owner_id', user.id)
            .eq('status', 'approved')
            .limit(1)
            .maybeSingle(),
        ]);
        
        const roles = rolesResult.data?.map(r => r.role) || [];
        setHasSellerRole(roles.includes('seller'));
        setIsAdmin(roles.includes('admin'));
        setHasApprovedStore(!!storeResult.data);
      } catch (err) {
        console.error('Error checking roles:', err);
      } finally {
        setRoleLoading(false);
      }
    }

    checkRoles();
  }, [user, authLoading]);

  return {
    hasAccess: isMarketplacePublic || featureFlag.hasAccess || hasSellerRole || isAdmin || hasApprovedStore,
    isAdmin,
    isMarketplacePublic,
    loading: featureFlag.loading || roleLoading || publicLoading,
    error: featureFlag.error,
  };
}
