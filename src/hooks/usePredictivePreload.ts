import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * After auth resolves, prefetches role-specific data in the background
 * so seller dashboards and admin panels load instantly on navigation.
 *
 * Runs once per session — skipped if data is already cached.
 */
export function usePredictivePreload() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Use requestIdleCallback to avoid blocking the main thread
    const schedule = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));

    schedule(() => {
      // Prefetch the user's store (if seller)
      const storeKey = ['my-store', user.id];
      if (!qc.getQueryData(storeKey)) {
        qc.prefetchQuery({
          queryKey: storeKey,
          queryFn: async () => {
            const { data } = await supabase
              .from('stores')
              .select('id, name, slug, logo_url, is_verified')
              .eq('user_id', user.id)
              .maybeSingle();
            return data;
          },
          staleTime: 1000 * 60 * 10,
        });
      }

      // Prefetch user profile (used across many pages)
      const profileKey = ['profile', user.id];
      if (!qc.getQueryData(profileKey)) {
        qc.prefetchQuery({
          queryKey: profileKey,
          queryFn: async () => {
            const { data } = await supabase
              .from('profiles')
              .select('user_id, username, display_name, avatar_url, bio')
              .eq('user_id', user.id)
              .maybeSingle();
            return data;
          },
          staleTime: 1000 * 60 * 10,
        });
      }
    });
  }, [user?.id, qc]);
}
