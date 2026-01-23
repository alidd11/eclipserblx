import { useState, useEffect } from 'react';
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
          .select('enabled, user_ids')
          .eq('name', flagName)
          .single();

        if (flagError) {
          // Flag doesn't exist - no access
          if (flagError.code === 'PGRST116') {
            setHasAccess(false);
            setLoading(false);
            return;
          }
          throw flagError;
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
// Sellers with the seller role automatically have access
// Admins always have access
export function useMarketplaceAccess() {
  const { user, loading: authLoading } = useAuth();
  const featureFlag = useFeatureFlag('marketplace');
  const [hasSellerRole, setHasSellerRole] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isMarketplacePublic, setIsMarketplacePublic] = useState(false);
  const [publicLoading, setPublicLoading] = useState(true);

  // Check if marketplace is public
  useEffect(() => {
    async function checkPublicStatus() {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'marketplace_public')
          .maybeSingle();
        
        const val = data?.value;
        setIsMarketplacePublic(val === true || val === 'true');
      } catch (err) {
        console.error('Error checking marketplace public status:', err);
      } finally {
        setPublicLoading(false);
      }
    }

    checkPublicStatus();
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      setRoleLoading(false);
      return;
    }

    async function checkRoles() {
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        const roles = data?.map(r => r.role) || [];
        setHasSellerRole(roles.includes('seller'));
        setIsAdmin(roles.includes('admin'));
      } catch (err) {
        console.error('Error checking roles:', err);
      } finally {
        setRoleLoading(false);
      }
    }

    checkRoles();
  }, [user, authLoading]);

  return {
    hasAccess: isMarketplacePublic || featureFlag.hasAccess || hasSellerRole || isAdmin,
    isAdmin,
    isMarketplacePublic,
    loading: featureFlag.loading || roleLoading || publicLoading,
    error: featureFlag.error,
  };
}
