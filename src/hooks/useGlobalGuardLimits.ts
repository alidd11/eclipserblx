import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalGuardLimits {
  maxServers: number | null;
  maxActiveBans: number | null;
  hasPrioritySync: boolean;
  hasBanTemplates: boolean;
  isPremium: boolean;
}

export function useGlobalGuardLimits() {
  const query = useQuery({
    queryKey: ['global-guard-limits'],
    queryFn: async (): Promise<GlobalGuardLimits> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          maxServers: 2,
          maxActiveBans: null,
          hasPrioritySync: false,
          hasBanTemplates: false,
          isPremium: false,
        };
      }

      const { data, error } = await supabase
        .rpc('get_global_guard_limits', { _user_id: user.id });

      if (error || !data || data.length === 0) {
        // Default to free tier on error
        return {
          maxServers: 2,
          maxActiveBans: null,
          hasPrioritySync: false,
          hasBanTemplates: false,
          isPremium: false,
        };
      }

      const limits = data[0];
      return {
        maxServers: limits.max_servers,
        maxActiveBans: limits.max_active_bans,
        hasPrioritySync: limits.has_priority_sync,
        hasBanTemplates: limits.has_ban_templates,
        isPremium: limits.is_premium,
      };
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  return {
    ...query,
    isLoadingLimits: query.isLoading,
  };
}
