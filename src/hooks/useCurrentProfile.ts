import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Shared hook for fetching the current user's profile.
 * Uses a stable query key so all components share the same cache entry,
 * eliminating duplicate profile fetches across the app.
 * 
 * To invalidate: queryClient.invalidateQueries({ queryKey: ['current-profile'] })
 */
export function useCurrentProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute — profile rarely changes
  });
}
